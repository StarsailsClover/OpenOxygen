/**
 * OpenOxygen — Task Orchestrator (26w15a Phase 3)
 *
 * 任务编排器：复杂任务自动分解、并行执行、结果聚合
 *
 * 功能：
 *   - 任务分解（"部署项目" → [构建, 测试, 部署]）
 *   - 并行执行（子任务同时运行）
 *   - 结果聚合（合并子任务结果）
 *   - 失败重试（单个子任务失败可重试）
 *   - 依赖管理（任务 A 依赖任务 B）
 *   - 执行计划可视化
 */
import type { ExecutionMode } from "../../types/index.js";
import { type AgentDelegatedResult } from "../communication/index.js";
export type SubTask = {
    id: string;
    name: string;
    instruction: string;
    mode?: ExecutionMode;
    dependsOn?: string[];
    retryCount: number;
    maxRetries: number;
    timeoutMs: number;
    result?: AgentDelegatedResult;
    status: "pending" | "waiting" | "running" | "completed" | "failed" | "skipped";
    startedAt?: number;
    completedAt?: number;
};
export type OrchestratedTask = {
    id: string;
    name: string;
    instruction: string;
    subtasks: SubTask[];
    strategy: "sequential" | "parallel" | "dag";
    status: "pending" | "running" | "completed" | "failed" | "partial";
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    results: {
        success: number;
        failed: number;
        skipped: number;
        total: number;
    };
};
export type TaskPlan = {
    name: string;
    description: string;
    subtasks: Array<{
        name: string;
        instruction: string;
        mode?: ExecutionMode;
        dependsOn?: string[];
        maxRetries?: number;
        timeoutMs?: number;
    }>;
    strategy: "sequential" | "parallel" | "dag";
};
/**
 * 基于 LLM 的任务分解（简化版：使用关键词匹配）
 */
export declare function decomposeTask(instruction: string): TaskPlan;
declare const orchestrations: Map<string, OrchestratedTask>;
export declare function createOrchestration(instruction: string, plan?: TaskPlan): OrchestratedTask;
export declare function getOrchestration(id: string): OrchestratedTask | null;
export declare function executeOrchestration(orchestrationId: string, options?: {
    onProgress?: (orch: OrchestratedTask, subtask: SubTask) => void;
    onComplete?: (orch: OrchestratedTask) => void;
}): Promise<OrchestratedTask>;
export declare function generateExecutionReport(orch: OrchestratedTask): string;
export declare function cleanupOrchestration(id: string): void;
export declare function listOrchestrations(): OrchestratedTask[];
export { orchestrations };
//# sourceMappingURL=index.d.ts.map