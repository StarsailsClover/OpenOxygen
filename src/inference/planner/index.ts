/**
 * OpenOxygen - Task Planner
 *
 * 任务规划引擎：将用户意图拆解为可执行的多步骤计划。
 * 实现「推理-规划-执行-反馈-反思」一体化循环。
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type {
  ExecutionPlan,
  PlanStep,
  ReflectionEntry,
} from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type {
  ChatMessage,
  InferenceEngine,
  InferenceResponse,
} from "../engine/index.js";

const log = createSubsystemLogger("inference/planner");

// === Plan Builder ===

export function createEmptyPlan(goal: string): ExecutionPlan {
  return {
    id: generateId("plan"),
    goal,
    steps: [],
    createdAt: nowMs(),
    updatedAt: nowMs(),
    status: "planning",
    reflections: [],
  };
}

export function addStep(
  plan: ExecutionPlan,
  action: string,
  params: Record<string, unknown> = {},
  dependencies: string[] = [],
): PlanStep {
  const step: PlanStep = {
    id: generateId("step"),
    action,
    params,
    dependencies,
    status: "pending",
  };
  plan.steps.push(step);
  plan.updatedAt = nowMs();
  return step;
}

export function updateStepStatus(
  plan: ExecutionPlan,
  stepId: string,
  status: PlanStep["status"],
  result?: unknown,
  error?: string,
): void {
  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) return;
  step.status = status;
  if (result !== undefined) step.result = result;
  if (error !== undefined) step.error = error;
  plan.updatedAt = nowMs();
}

export function addReflection(
  plan: ExecutionPlan,
  stepId: string,
  observation: string,
  adjustment?: string,
): void {
  const entry: ReflectionEntry = {
    stepId,
    observation,
    adjustment,
    timestamp: nowMs(),
  };
  plan.reflections.push(entry);
  plan.updatedAt = nowMs();
}

export function getPlanProgress(plan: ExecutionPlan): {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  percentage: number;
} {
  const total = plan.steps.length;
  const completed = plan.steps.filter((s) => s.status === "completed").length;
  const failed = plan.steps.filter((s) => s.status === "failed").length;
  const pending = plan.steps.filter((s) => s.status === "pending").length;

  return {
    total,
    completed,
    failed,
    pending,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// === LLM-based Planning ===

export interface PlannerConfig {
  maxSteps?: number;
  allowRetry?: boolean;
  reflectionEnabled?: boolean;
}

export class TaskPlanner {
  private inferenceEngine: InferenceEngine;
  private config: PlannerConfig;

  constructor(inferenceEngine: InferenceEngine, config: PlannerConfig = {}) {
    this.inferenceEngine = inferenceEngine;
    this.config = {
      maxSteps: 10,
      allowRetry: true,
      reflectionEnabled: true,
      ...config,
    };
  }

  /**
   * Create plan from natural language instruction
   */
  async createPlan(instruction: string): Promise<ExecutionPlan> {
    log.info(`Creating plan for: ${instruction}`);

    const prompt = this.buildPlanningPrompt(instruction);

    const response = await this.inferenceEngine.infer({
      messages: [
        {
          role: "system",
          content:
            "You are a task planning assistant. Break down the user's request into clear, executable steps.",
        },
        { role: "user", content: prompt },
      ],
      mode: "balanced",
    });

    const plan = this.parsePlanFromResponse(instruction, response.content);

    log.info(`Plan created with ${plan.steps.length} steps`);
    return plan;
  }

  /**
   * Refine plan based on execution results
   */
  async refinePlan(
    plan: ExecutionPlan,
    failedStepId: string,
    error: string,
  ): Promise<ExecutionPlan> {
    log.info(`Refining plan after failure in step ${failedStepId}`);

    const failedStep = plan.steps.find((s) => s.id === failedStepId);
    if (!failedStep) return plan;

    const prompt = this.buildRefinementPrompt(plan, failedStep, error);

    const response = await this.inferenceEngine.infer({
      messages: [
        {
          role: "system",
          content:
            "You are a task planning assistant. The previous plan failed. Suggest adjustments.",
        },
        { role: "user", content: prompt },
      ],
      mode: "deep",
    });

    // Add reflection
    addReflection(
      plan,
      failedStepId,
      `Step failed: ${error}`,
      response.content,
    );

    // Create adjusted plan
    const adjustedPlan = this.parsePlanFromResponse(plan.goal, response.content);
    adjustedPlan.reflections = [...plan.reflections];

    return adjustedPlan;
  }

  private buildPlanningPrompt(instruction: string): string {
    return `Break down the following task into executable steps:

Task: ${instruction}

Provide your response in this JSON format:
{
  "steps": [
    {
      "action": "step description",
      "params": { "key": "value" },
      "dependencies": []
    }
  ]
}

Guidelines:
- Each step should be atomic and executable
- Use dependencies to indicate order
- Keep steps under ${this.config.maxSteps}
- Be specific about parameters`;
  }

  private buildRefinementPrompt(
    plan: ExecutionPlan,
    failedStep: PlanStep,
    error: string,
  ): string {
    const progress = getPlanProgress(plan);

    return `The following plan failed during execution:

Goal: ${plan.goal}
Progress: ${progress.completed}/${progress.total} steps completed

Failed Step: ${failedStep.action}
Error: ${error}

Previous Steps:
${plan.steps
  .map(
    (s) =>
      `- ${s.action} (${s.status})${s.error ? ` [Error: ${s.error}]` : ""}`,
  )
  .join("\n")}

Please suggest an adjusted plan to complete the task.
Provide your response in the same JSON format as before.`;
  }

  private parsePlanFromResponse(
    goal: string,
    content: string,
  ): ExecutionPlan {
    const plan = createEmptyPlan(goal);

    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                       content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]!);

        if (parsed.steps && Array.isArray(parsed.steps)) {
          for (const step of parsed.steps) {
            addStep(
              plan,
              step.action,
              step.params || {},
              step.dependencies || [],
            );
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to parse plan from response: ${error}`);

      // Fallback: create single-step plan
      addStep(plan, goal);
    }

    plan.status = "planning";
    return plan;
  }
}

// === Plan Execution ===

export interface PlanExecutor {
  executeStep(step: PlanStep): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
}

export async function executePlan(
  plan: ExecutionPlan,
  executor: PlanExecutor,
  options: {
    onStepStart?: (step: PlanStep) => void;
    onStepComplete?: (step: PlanStep) => void;
    onStepError?: (step: PlanStep, error: string) => void;
  } = {},
): Promise<ExecutionPlan> {
  log.info(`Executing plan: ${plan.id}`);

  plan.status = "executing";

  for (const step of plan.steps) {
    // Check dependencies
    const depsCompleted = step.dependencies.every((depId) => {
      const dep = plan.steps.find((s) => s.id === depId);
      return dep?.status === "completed";
    });

    if (!depsCompleted) {
      step.status = "skipped";
      continue;
    }

    // Execute step
    options.onStepStart?.(step);
    step.status = "running";

    try {
      const result = await executor.executeStep(step);

      if (result.success) {
        updateStepStatus(plan, step.id, "completed", result.result);
        options.onStepComplete?.(step);
      } else {
        updateStepStatus(plan, step.id, "failed", undefined, result.error);
        options.onStepError?.(step, result.error || "Unknown error");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      updateStepStatus(plan, step.id, "failed", undefined, errorMsg);
      options.onStepError?.(step, errorMsg);
    }
  }

  // Update plan status
  const progress = getPlanProgress(plan);
  if (progress.failed > 0) {
    plan.status = "failed";
  } else if (progress.completed === progress.total) {
    plan.status = "completed";
  }

  log.info(`Plan execution complete: ${progress.completed}/${progress.total} steps`);

  return plan;
}

// === Exports ===

export {
  createEmptyPlan,
  addStep,
  updateStepStatus,
  addReflection,
  getPlanProgress,
  TaskPlanner,
  executePlan,
};

export default TaskPlanner;
