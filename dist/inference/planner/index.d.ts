/**
 * OpenOxygen — Task Planner
 *
 * 任务规划引擎：将用户意图分解为可执行的多步骤计划。
 * 实现「推理-规划-执行-反馈-反思」一体化循环。
 */
import type { ExecutionPlan, PlanStep } from "../../types/index.js";
import type { InferenceEngine } from "../engine/index.js";
export declare function createEmptyPlan(goal: string): ExecutionPlan;
export declare function addStep(plan: ExecutionPlan, action: string, params?: Record<string, unknown>, dependencies?: string[]): PlanStep;
export declare function updateStepStatus(plan: ExecutionPlan, stepId: string, status: PlanStep["status"], result?: unknown, error?: string): void;
export declare function addReflection(plan: ExecutionPlan, stepId: string, observation: string, adjustment?: string): void;
export declare function getNextExecutableSteps(plan: ExecutionPlan): PlanStep[];
export declare function isPlanComplete(plan: ExecutionPlan): boolean;
export declare function isPlanFailed(plan: ExecutionPlan): boolean;
export declare class TaskPlanner {
    private engine;
    constructor(engine: InferenceEngine);
    generatePlan(goal: string, context?: string): Promise<ExecutionPlan>;
    reflectOnStep(plan: ExecutionPlan, stepId: string, result: unknown, error?: string): Promise<{
        shouldContinue: boolean;
        adjustment?: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map