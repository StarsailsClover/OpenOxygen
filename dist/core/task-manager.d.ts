/**
 * OpenOxygen — Task Manager (26w12aA)
 *
 * 任务生命周期管理：创建、执行、打断、恢复、取消
 */
import type { ExecutionPlan, PlanStep } from "../types/index.js";
import type { InferenceEngine } from "../inference/engine/index.js";
export interface ManagedTask {
    plan: ExecutionPlan;
    status: "queued" | "running" | "paused" | "cancelled" | "completed" | "failed";
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
export declare class TaskManager {
    private tasks;
    private inferenceEngine;
    private planner;
    private reflection;
    private stepExecutor;
    constructor(inferenceEngine: InferenceEngine, stepExecutor: (step: PlanStep) => Promise<unknown>);
    /**
     * 创建并执行任务
     */
    createAndRun(goal: string, context?: string, options?: {
        maxRetries?: number;
        onProgress?: ManagedTask["onProgress"];
    }): Promise<TaskResult>;
    /**
     * 取消任务
     */
    cancel(taskId: string): boolean;
    /**
     * 暂停任务
     */
    pause(taskId: string): boolean;
    /**
     * 恢复任务
     */
    resume(taskId: string): Promise<TaskResult | null>;
    /**
     * 获取任务状态
     */
    getTask(taskId: string): ManagedTask | undefined;
    /**
     * 列出所有任务
     */
    listTasks(): Array<{
        id: string;
        goal: string;
        status: string;
        steps: number;
    }>;
    private runTask;
}
//# sourceMappingURL=task-manager.d.ts.map