/**
 * Interrupt System
 *
 * Real-time task interruption and execution adjustment
 * Allows users to pause, resume, or cancel running tasks
 */

import { createSubsystemLogger } from "../logging/index.js";
import { EventEmitter } from "node:events";

const log = createSubsystemLogger("core/interrupt");

// ============================================================================
// Interrupt Types
// ============================================================================

export type InterruptType = "pause" | "resume" | "cancel" | "adjust";

export interface InterruptRequest {
  type: InterruptType;
  taskId?: string;
  reason?: string;
  adjustments?: TaskAdjustments;
}

export interface TaskAdjustments {
  priority?: number;
  timeout?: number;
  resources?: ResourceLimits;
  parameters?: Record<string, unknown>;
}

export interface ResourceLimits {
  maxMemoryMB?: number;
  maxCpuPercent?: number;
  maxTokens?: number;
}

export interface InterruptResponse {
  success: boolean;
  taskId: string;
  previousState: TaskState;
  currentState: TaskState;
  message: string;
}

export type TaskState =
  | "pending"
  | "running"
  | "paused"
  | "cancelled"
  | "completed"
  | "failed";

// ============================================================================
// Task State Machine
// ============================================================================

export interface Task {
  id: string;
  name: string;
  state: TaskState;
  priority: number;
  startTime?: number;
  pauseTime?: number;
  totalPauseDuration: number;
  adjustments: TaskAdjustments[];
  progress: number;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Interrupt Manager
// ============================================================================

export class InterruptManager extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private pausedTasks: Set<string> = new Set();

  constructor() {
    super();
    log.info("Interrupt manager initialized");
  }

  /**
   * Register a task for interrupt management
   */
  registerTask(taskId: string, name: string, priority: number = 5): Task {
    const task: Task = {
      id: taskId,
      name,
      state: "pending",
      priority,
      totalPauseDuration: 0,
      adjustments: [],
      progress: 0,
      metadata: {},
    };

    this.tasks.set(taskId, task);
    log.info(`Task registered: ${name} (${taskId})`);

    this.emit("taskRegistered", task);
    return task;
  }

  /**
   * Start a task
   */
  startTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      log.error(`Task not found: ${taskId}`);
      return false;
    }

    if (task.state !== "pending") {
      log.warn(`Task ${taskId} is not in pending state: ${task.state}`);
      return false;
    }

    task.state = "running";
    task.startTime = Date.now();

    log.info(`Task started: ${task.name}`);
    this.emit("taskStarted", task);

    return true;
  }

  /**
   * Pause a running task
   */
  pauseTask(taskId: string, reason?: string): InterruptResponse {
    const task = this.tasks.get(taskId);
    if (!task) {
      return this.createErrorResponse(taskId, "Task not found");
    }

    if (task.state !== "running") {
      return this.createErrorResponse(
        taskId,
        `Task is not running: ${task.state}`,
      );
    }

    const previousState = task.state;
    task.state = "paused";
    task.pauseTime = Date.now();
    this.pausedTasks.add(taskId);

    log.info(`Task paused: ${task.name}${reason ? ` (${reason})` : ""}`);
    this.emit("taskPaused", task, reason);

    return {
      success: true,
      taskId,
      previousState,
      currentState: task.state,
      message: `Task paused${reason ? `: ${reason}` : ""}`,
    };
  }

  /**
   * Resume a paused task
   */
  resumeTask(taskId: string): InterruptResponse {
    const task = this.tasks.get(taskId);
    if (!task) {
      return this.createErrorResponse(taskId, "Task not found");
    }

    if (task.state !== "paused") {
      return this.createErrorResponse(
        taskId,
        `Task is not paused: ${task.state}`,
      );
    }

    const previousState = task.state;

    // Calculate pause duration
    if (task.pauseTime) {
      task.totalPauseDuration += Date.now() - task.pauseTime;
      task.pauseTime = undefined;
    }

    task.state = "running";
    this.pausedTasks.delete(taskId);

    log.info(`Task resumed: ${task.name}`);
    this.emit("taskResumed", task);

    return {
      success: true,
      taskId,
      previousState,
      currentState: task.state,
      message: "Task resumed",
    };
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string, reason?: string): InterruptResponse {
    const task = this.tasks.get(taskId);
    if (!task) {
      return this.createErrorResponse(taskId, "Task not found");
    }

    if (task.state === "completed" || task.state === "cancelled") {
      return this.createErrorResponse(taskId, `Task already ${task.state}`);
    }

    const previousState = task.state;
    task.state = "cancelled";
    this.pausedTasks.delete(taskId);

    log.info(`Task cancelled: ${task.name}${reason ? ` (${reason})` : ""}`);
    this.emit("taskCancelled", task, reason);

    return {
      success: true,
      taskId,
      previousState,
      currentState: task.state,
      message: `Task cancelled${reason ? `: ${reason}` : ""}`,
    };
  }

  /**
   * Adjust task parameters
   */
  adjustTask(taskId: string, adjustments: TaskAdjustments): InterruptResponse {
    const task = this.tasks.get(taskId);
    if (!task) {
      return this.createErrorResponse(taskId, "Task not found");
    }

    if (task.state !== "running" && task.state !== "paused") {
      return this.createErrorResponse(
        taskId,
        `Cannot adjust task in state: ${task.state}`,
      );
    }

    const previousState = task.state;

    // Apply adjustments
    if (adjustments.priority !== undefined) {
      task.priority = adjustments.priority;
    }

    task.adjustments.push(adjustments);

    log.info(`Task adjusted: ${task.name}`, adjustments);
    this.emit("taskAdjusted", task, adjustments);

    return {
      success: true,
      taskId,
      previousState,
      currentState: task.state,
      message: "Task parameters adjusted",
    };
  }

  /**
   * Update task progress
   */
  updateProgress(taskId: string, progress: number): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.progress = Math.max(0, Math.min(100, progress));
    this.emit("progressUpdated", task);

    return true;
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.state = "completed";
    task.progress = 100;
    this.pausedTasks.delete(taskId);

    log.info(`Task completed: ${task.name}`);
    this.emit("taskCompleted", task);

    return true;
  }

  /**
   * Fail a task
   */
  failTask(taskId: string, error: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.state = "failed";
    task.metadata.error = error;
    this.pausedTasks.delete(taskId);

    log.error(`Task failed: ${task.name} - ${error}`);
    this.emit("taskFailed", task, error);

    return true;
  }

  /**
   * Get task status
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get running tasks
   */
  getRunningTasks(): Task[] {
    return this.getAllTasks().filter((t) => t.state === "running");
  }

  /**
   * Get paused tasks
   */
  getPausedTasks(): Task[] {
    return this.getAllTasks().filter((t) => t.state === "paused");
  }

  /**
   * Process interrupt request
   */
  processInterrupt(request: InterruptRequest): InterruptResponse {
    const { type, taskId, reason, adjustments } = request;

    if (!taskId) {
      return this.createErrorResponse("unknown", "Task ID required");
    }

    switch (type) {
      case "pause":
        return this.pauseTask(taskId, reason);
      case "resume":
        return this.resumeTask(taskId);
      case "cancel":
        return this.cancelTask(taskId, reason);
      case "adjust":
        if (!adjustments) {
          return this.createErrorResponse(taskId, "Adjustments required");
        }
        return this.adjustTask(taskId, adjustments);
      default:
        return this.createErrorResponse(
          taskId,
          `Unknown interrupt type: ${type}`,
        );
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    taskId: string,
    message: string,
  ): InterruptResponse {
    return {
      success: false,
      taskId,
      previousState: "pending",
      currentState: "pending",
      message,
    };
  }

  /**
   * Cleanup completed/cancelled tasks
   */
  cleanup(olderThanMs: number = 86400000): number {
    const cutoff = Date.now() - olderThanMs;
    let cleaned = 0;

    for (const [taskId, task] of this.tasks) {
      if (
        (task.state === "completed" ||
          task.state === "cancelled" ||
          task.state === "failed") &&
        task.startTime &&
        task.startTime < cutoff
      ) {
        this.tasks.delete(taskId);
        cleaned++;
      }
    }

    log.info(`Cleaned up ${cleaned} old tasks`);
    return cleaned;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const interruptManager = new InterruptManager();
