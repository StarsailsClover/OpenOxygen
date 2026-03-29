/**
 * OpenOxygen �?Task Manager (26w12aA)
 *
 * 任务生命周期管理：创建、执行、打断、恢复、取�?
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import type { ExecutionPlan, PlanStep } from "../types/index.js";
import type { InferenceEngine } from "../inference/engine/index.js";
import {
  TaskPlanner,
  getNextExecutableSteps,
  isPlanComplete,
  isPlanFailed,
  addReflection,
  updateStepStatus,
} from "../inference/planner/index.js";
import { ReflectionEngine } from "../inference/reflection/index.js";

const log = createSubsystemLogger("task-manager");

// ══════════════════════════════════════════════════════════════════════════�?
// Types
// ══════════════════════════════════════════════════════════════════════════�?

export interface ManagedTask {
  plan: ExecutionPlan;
  status:
    | "queued"
    | "running"
    | "paused"
    | "cancelled"
    | "completed"
    | "failed";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  currentStepIndex: number;
  maxRetries: number;
  retryCount: number;
  abortController: AbortController;
  onProgress?: (step: PlanStep, index: number, total: number) => void;
}

export interface TaskResult {
  taskId: string;
  status: ManagedTask["status"];
  stepsCompleted: number;
  stepsTotal: number;
  durationMs: number;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════�?
// Task Manager
// ══════════════════════════════════════════════════════════════════════════�?

export class TaskManager {
  private tasks = new Map<string, ManagedTask>();
  private inferenceEngine: InferenceEngine;
  private planner: TaskPlanner;
  private reflection: ReflectionEngine;
  private stepExecutor: (step: PlanStep) => Promise<unknown>;

  constructor(
    inferenceEngine: InferenceEngine,
    stepExecutor: (step: PlanStep) => Promise<unknown>,
  ) {
    this.inferenceEngine = inferenceEngine;
    this.planner = new TaskPlanner(inferenceEngine);
    this.reflection = new ReflectionEngine(inferenceEngine);
    this.stepExecutor = stepExecutor;
  }

  /**
   * 创建并执行任�?
   */
  async createAndRun(
    goal: string,
    context?: string,
    options?: {
      maxRetries?: number;
      onProgress?: ManagedTask["onProgress"];
    },
  ): Promise<TaskResult> {
    // 1. 生成计划
    const plan = await this.planner.generatePlan(goal, context);

    const task: ManagedTask = {
      plan,
      status: "queued",
      createdAt: nowMs(),
      currentStepIndex: 0,
      maxRetries: options?.maxRetries ?? 3,
      retryCount: 0,
      abortController: new AbortController(),
      onProgress: options?.onProgress,
    };

    this.tasks.set(plan.id, task);
    log.info(`Task created: ${plan.id}, ${plan.steps.length} steps`);

    // 2. 执行
    return this.runTask(task);
  }

  /**
   * 取消任务
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === "completed" || task.status === "cancelled")
      return false;

    task.abortController.abort();
    task.status = "cancelled";
    task.completedAt = nowMs();
    log.info(`Task cancelled: ${taskId}`);
    return true;
  }

  /**
   * 暂停任务
   */
  pause(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") return false;
    task.status = "paused";
    log.info(`Task paused: ${taskId}`);
    return true;
  }

  /**
   * 恢复任务
   */
  async resume(taskId: string): Promise<TaskResult | null> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "paused") return null;
    task.status = "running";
    log.info(`Task resumed: ${taskId}`);
    return this.runTask(task);
  }

  /**
   * 获取任务状�?
   */
  getTask(taskId: string): ManagedTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 列出所有任�?
   */
  listTasks(): Array<{
    id: string;
    goal: string;
    status: string;
    steps: number;
  }> {
    return [...this.tasks.values()].map((t) => ({
      id: t.plan.id,
      goal: t.plan.goal,
      status: t.status,
      steps: t.plan.steps.length,
    }));
  }

  // ─── Internal ─────────────────────────────────────────────────────────

  private async runTask(task: ManagedTask): Promise<TaskResult> {
    task.status = "running";
    task.startedAt = task.startedAt || nowMs();

    while (!isPlanComplete(task.plan) && !isPlanFailed(task.plan)) {
      // 检查取�?暂停
      if (task.abortController.signal.aborted) {
        task.status = "cancelled";
        break;
      }
      if (task.status !== "running") break;

      const nextSteps = getNextExecutableSteps(task.plan);
      if (nextSteps.length === 0) break;

      for (const step of nextSteps) {
        if (task.abortController.signal.aborted) break;

        // 通知进度
        task.onProgress?.(step, task.currentStepIndex, task.plan.steps.length);

        // 执行步骤
        updateStepStatus(task.plan, step.id, "running");
        log.info(
          `Executing step: ${step.action} (${task.currentStepIndex + 1}/${task.plan.steps.length})`,
        );

        try {
          const result = await this.stepExecutor(step);
          updateStepStatus(task.plan, step.id, "completed", result);

          // 反�?
          const reflectionResult = await this.reflection.reflect(
            task.plan,
            step.id,
            result,
          );
          if (
            reflectionResult.shouldRetry &&
            task.retryCount < task.maxRetries
          ) {
            task.retryCount++;
            updateStepStatus(task.plan, step.id, "pending");
            addReflection(task.plan, step.id, "Retrying after reflection");
            continue;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          updateStepStatus(task.plan, step.id, "failed", undefined, errorMsg);

          // 反思失�?
          const { shouldContinue } = await this.planner.reflectOnStep(
            task.plan,
            step.id,
            null,
            errorMsg,
          );
          if (!shouldContinue) {
            task.plan.status = "failed";
            break;
          }
        }

        task.currentStepIndex++;
      }
    }

    // 完成
    task.completedAt = nowMs();
    if (task.status === "running") {
      task.status = isPlanFailed(task.plan) ? "failed" : "completed";
    }

    const result: TaskResult = {
      taskId: task.plan.id,
      status: task.status,
      stepsCompleted: task.plan.steps.filter((s) => s.status === "completed")
        .length,
      stepsTotal: task.plan.steps.length,
      durationMs: task.completedAt - (task.startedAt || task.createdAt),
      error:
        task.status === "failed"
          ? task.plan.steps.find((s) => s.status === "failed")?.error
          : undefined,
    };

    log.info(
      `Task ${result.taskId}: ${result.status} (${result.stepsCompleted}/${result.stepsTotal} steps, ${result.durationMs}ms)`,
    );
    return result;
  }
}
