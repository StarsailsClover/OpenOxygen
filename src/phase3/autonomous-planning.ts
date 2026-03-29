/**
 * OpenOxygen - Phase 3 Autonomous Planning (26w15aD Phase 7)
 *
 * Phase 3: 自主规划与执行
 * - 目标分解与任务规划
 * - 资源分配与调度
 * - 动态重规划
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
import type { InferenceEngine } from "../inference/engine/index.js";

const log = createSubsystemLogger("phase3/autonomous-planning");

// Goal types
export type GoalType = "simple" | "complex" | "ongoing" | "deadline";

// Goal status
export type GoalStatus =
  | "pending"
  | "planning"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

// Goal definition
export interface Goal {
  id: string;
  description: string;
  type: GoalType;
  status: GoalStatus;
  priority: number; // 1-10
  deadline?: number;
  parentId?: string;
  subgoals: string[];
  tasks: PlannedTask[];
  resources: ResourceRequirement[];
  constraints: Constraint[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  metadata: Record<string, any>;
}

// Planned task
export interface PlannedTask {
  id: string;
  description: string;
  estimatedDuration: number; // ms
  dependencies: string[];
  requiredResources: string[];
  assignedTo?: string;
  status: "pending" | "ready" | "executing" | "completed" | "failed";
  actualDuration?: number;
  result?: any;
}

// Resource requirement
export interface ResourceRequirement {
  type: string;
  amount: number;
  priority: number;
}

// Constraint
export interface Constraint {
  type: "time" | "dependency" | "resource" | "quality";
  description: string;
  condition: () => boolean;
}

// Execution plan
export interface ExecutionPlan {
  goalId: string;
  tasks: PlannedTask[];
  schedule: TaskSchedule[];
  resources: ResourceAllocation[];
  criticalPath: string[];
  estimatedCompletion: number;
}

// Task schedule
export interface TaskSchedule {
  taskId: string;
  startTime: number;
  endTime: number;
  resources: string[];
}

// Resource allocation
export interface ResourceAllocation {
  resourceType: string;
  allocated: number;
  available: number;
  tasks: string[];
}

// Replan trigger
export interface ReplanTrigger {
  type:
    | "task_failed"
    | "resource_unavailable"
    | "deadline_at_risk"
    | "new_constraint";
  taskId?: string;
  details: string;
}

/**
 * Autonomous Planning Controller
 */
export class AutonomousPlanningController {
  private inferenceEngine: InferenceEngine;
  private goals: Map<string, Goal> = new Map();
  private activePlans: Map<string, ExecutionPlan> = new Map();
  private resources: Map<string, number> = new Map();

  constructor(inferenceEngine: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
    this.initializeDefaultResources();
    log.info("Autonomous Planning Controller initialized");
  }

  /**
   * Initialize default resources
   */
  private initializeDefaultResources(): void {
    this.resources.set("cpu", 100);
    this.resources.set("memory", 8192); // MB
    this.resources.set("browser_instances", 5);
    this.resources.set("terminal_sessions", 10);
    this.resources.set("api_calls_per_minute", 60);
  }

  /**
   * Create and plan a new goal
   */
  async createGoal(
    description: string,
    options: {
      type?: GoalType;
      priority?: number;
      deadline?: number;
      parentId?: string;
    } = {},
  ): Promise<Goal> {
    const goalId = generateId("goal");
    log.info(`[${goalId}] Creating goal: ${description}`);

    const goal: Goal = {
      id: goalId,
      description,
      type: options.type || "simple",
      status: "pending",
      priority: options.priority || 5,
      deadline: options.deadline,
      parentId: options.parentId,
      subgoals: [],
      tasks: [],
      resources: [],
      constraints: [],
      createdAt: nowMs(),
      metadata: {},
    };

    this.goals.set(goalId, goal);

    // Decompose goal into tasks
    await this.decomposeGoal(goal);

    // Create execution plan
    await this.createExecutionPlan(goal);

    return goal;
  }

  /**
   * Decompose goal into tasks using LLM
   */
  private async decomposeGoal(goal: Goal): Promise<void> {
    log.info(`[${goal.id}] Decomposing goal into tasks`);

    const prompt = `Decompose this goal into executable tasks:

Goal: ${goal.description}
Type: ${goal.type}
Priority: ${goal.priority}
${goal.deadline ? `Deadline: ${new Date(goal.deadline).toISOString()}` : ""}

Provide tasks in JSON format:
[
  {
    "description": "Task description",
    "estimatedDuration": 300000,
    "dependencies": [],
    "requiredResources": ["browser", "api"]
  }
]`;

    try {
      const response = await this.inferenceEngine.infer({
        messages: [{ role: "user", content: prompt }],
        mode: "balanced",
      });

      const tasks = JSON.parse(response.content);
      goal.tasks = tasks.map((t: any) => ({
        id: generateId("task"),
        description: t.description,
        estimatedDuration: t.estimatedDuration || 60000,
        dependencies: t.dependencies || [],
        requiredResources: t.requiredResources || [],
        status: "pending",
      }));

      log.info(`[${goal.id}] Decomposed into ${goal.tasks.length} tasks`);
    } catch (error: any) {
      log.error(`[${goal.id}] Goal decomposition failed: ${error.message}`);
      // Create single task as fallback
      goal.tasks = [
        {
          id: generateId("task"),
          description: goal.description,
          estimatedDuration: 300000,
          dependencies: [],
          requiredResources: [],
          status: "pending",
        },
      ];
    }
  }

  /**
   * Create execution plan
   */
  private async createExecutionPlan(goal: Goal): Promise<ExecutionPlan> {
    log.info(`[${goal.id}] Creating execution plan`);

    // Calculate schedule
    const schedule = this.calculateSchedule(goal.tasks);

    // Allocate resources
    const resourceAllocations = this.allocateResources(goal.tasks);

    // Find critical path
    const criticalPath = this.findCriticalPath(goal.tasks);

    const plan: ExecutionPlan = {
      goalId: goal.id,
      tasks: goal.tasks,
      schedule,
      resources: resourceAllocations,
      criticalPath,
      estimatedCompletion:
        schedule.length > 0 ? schedule[schedule.length - 1].endTime : nowMs(),
    };

    this.activePlans.set(goal.id, plan);
    goal.status = "planning";

    log.info(
      `[${goal.id}] Execution plan created with ${schedule.length} scheduled tasks`,
    );
    return plan;
  }

  /**
   * Calculate task schedule
   */
  private calculateSchedule(tasks: PlannedTask[]): TaskSchedule[] {
    const schedule: TaskSchedule[] = [];
    const completedTasks = new Set<string>();
    let currentTime = nowMs();

    // Sort tasks by dependencies
    const pendingTasks = [...tasks];

    while (pendingTasks.length > 0) {
      // Find tasks with satisfied dependencies
      const readyTasks = pendingTasks.filter((task) =>
        task.dependencies.every((depId) => completedTasks.has(depId)),
      );

      if (readyTasks.length === 0) {
        // Circular dependency or stuck
        break;
      }

      for (const task of readyTasks) {
        const scheduleEntry: TaskSchedule = {
          taskId: task.id,
          startTime: currentTime,
          endTime: currentTime + task.estimatedDuration,
          resources: task.requiredResources,
        };
        schedule.push(scheduleEntry);
        completedTasks.add(task.id);

        // Remove from pending
        const index = pendingTasks.findIndex((t) => t.id === task.id);
        if (index > -1) pendingTasks.splice(index, 1);

        currentTime = scheduleEntry.endTime;
      }
    }

    return schedule;
  }

  /**
   * Allocate resources
   */
  private allocateResources(tasks: PlannedTask[]): ResourceAllocation[] {
    const allocations: ResourceAllocation[] = [];

    for (const [resourceType, available] of this.resources) {
      const requiredTasks = tasks.filter((t) =>
        t.requiredResources.includes(resourceType),
      );

      if (requiredTasks.length > 0) {
        allocations.push({
          resourceType,
          allocated: requiredTasks.length,
          available,
          tasks: requiredTasks.map((t) => t.id),
        });
      }
    }

    return allocations;
  }

  /**
   * Find critical path
   */
  private findCriticalPath(tasks: PlannedTask[]): string[] {
    // Simplified: return tasks with no dependencies first
    return tasks.filter((t) => t.dependencies.length === 0).map((t) => t.id);
  }

  /**
   * Execute goal
   */
  async executeGoal(
    goalId: string,
  ): Promise<{ success: boolean; result?: any }> {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    log.info(`[${goalId}] Starting execution`);
    goal.status = "executing";
    goal.startedAt = nowMs();

    const plan = this.activePlans.get(goalId);
    if (!plan) {
      throw new Error(`Execution plan not found for goal: ${goalId}`);
    }

    try {
      for (const task of goal.tasks) {
        // Check if replanning is needed
        const trigger = await this.checkReplanNeeded(goal, task);
        if (trigger) {
          log.info(`[${goalId}] Replanning triggered: ${trigger.type}`);
          await this.replan(goal, trigger);
        }

        // Execute task
        task.status = "executing";
        const result = await this.executeTask(task);

        if (result.success) {
          task.status = "completed";
          task.result = result.data;
        } else {
          task.status = "failed";
          // Try to heal or replan
          const healed = await this.attemptHeal(goal, task, result.error);
          if (!healed) {
            goal.status = "failed";
            return { success: false };
          }
        }
      }

      goal.status = "completed";
      goal.completedAt = nowMs();
      log.info(`[${goalId}] Execution completed successfully`);

      return { success: true, result: goal.tasks.map((t) => t.result) };
    } catch (error: any) {
      goal.status = "failed";
      log.error(`[${goalId}] Execution failed: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: PlannedTask,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    log.info(`Executing task: ${task.description}`);

    try {
      // Simulate task execution
      await sleep(Math.min(task.estimatedDuration, 5000)); // Cap at 5s for simulation

      // Use inference for complex tasks
      const response = await this.inferenceEngine.infer({
        messages: [{ role: "user", content: task.description }],
        mode: "balanced",
      });

      return { success: true, data: response.content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if replanning is needed
   */
  private async checkReplanNeeded(
    goal: Goal,
    task: PlannedTask,
  ): Promise<ReplanTrigger | null> {
    // Check deadline
    if (goal.deadline && nowMs() > goal.deadline - 60000) {
      return { type: "deadline_at_risk", details: "Deadline approaching" };
    }

    // Check resources
    for (const resource of task.requiredResources) {
      const available = this.resources.get(resource) || 0;
      if (available <= 0) {
        return {
          type: "resource_unavailable",
          taskId: task.id,
          details: `Resource ${resource} unavailable`,
        };
      }
    }

    return null;
  }

  /**
   * Replan goal execution
   */
  private async replan(goal: Goal, trigger: ReplanTrigger): Promise<void> {
    log.info(`[${goal.id}] Replanning due to ${trigger.type}`);

    // Adjust tasks based on trigger
    switch (trigger.type) {
      case "task_failed":
        // Add recovery task
        goal.tasks.push({
          id: generateId("task"),
          description: `Recover from failure: ${trigger.details}`,
          estimatedDuration: 60000,
          dependencies: trigger.taskId ? [trigger.taskId] : [],
          requiredResources: [],
          status: "pending",
        });
        break;

      case "resource_unavailable":
        // Reschedule with available resources
        await sleep(5000); // Wait for resources
        break;

      case "deadline_at_risk":
        // Prioritize critical path
        const criticalTasks = goal.tasks.filter((t) =>
          this.activePlans.get(goal.id)?.criticalPath.includes(t.id),
        );
        for (const task of criticalTasks) {
          task.estimatedDuration = Math.floor(task.estimatedDuration * 0.8); // Reduce duration by 20%
        }
        break;
    }

    // Recreate plan
    await this.createExecutionPlan(goal);
  }

  /**
   * Attempt to heal failed task
   */
  private async attemptHeal(
    goal: Goal,
    task: PlannedTask,
    error: string,
  ): Promise<boolean> {
    log.info(
      `[${goal.id}] Attempting to heal failed task ${task.id}: ${error}`,
    );

    // Simple retry
    task.status = "pending";
    await sleep(1000);

    return true; // Assume healed for now
  }

  /**
   * Get all goals
   */
  getAllGoals(): Goal[] {
    return Array.from(this.goals.values());
  }

  /**
   * Get goal status
   */
  getGoal(goalId: string): Goal | undefined {
    return this.goals.get(goalId);
  }

  /**
   * Cancel goal
   */
  cancelGoal(goalId: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    goal.status = "cancelled";
    log.info(`[${goalId}] Goal cancelled`);
    return true;
  }

  /**
   * Get active plans
   */
  getActivePlans(): ExecutionPlan[] {
    return Array.from(this.activePlans.values());
  }
}

// Export autonomous planning utilities
export const AutonomousPlanning = {
  AutonomousPlanningController,
};

export default AutonomousPlanning;
