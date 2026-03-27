/**
 * OpenOxygen — Reflection Engine
 *
 * 反思迭代器：执行后自我评估，发现问题并自适应调整。
 * 实现 ReAct (Reasoning + Acting) 循环的反思环节。
 */
import type { ExecutionPlan } from "../../types/index.js";
import type { InferenceEngine } from "../engine/index.js";
export type ReflectionResult = {
    quality: "good" | "acceptable" | "poor";
    issues: ReflectionIssue[];
    suggestions: string[];
    shouldRetry: boolean;
    adjustedPlan?: Partial<ExecutionPlan>;
};
export type ReflectionIssue = {
    severity: "low" | "medium" | "high" | "critical";
    category: "accuracy" | "completeness" | "safety" | "efficiency" | "format";
    description: string;
    affectedStepId?: string;
};
export declare class ReflectionEngine {
    private inferenceEngine;
    private maxReflectionDepth;
    constructor(inferenceEngine: InferenceEngine, maxDepth?: number);
    reflect(plan: ExecutionPlan, stepId: string, result: unknown, error?: string): Promise<ReflectionResult>;
    reflectOnPlan(plan: ExecutionPlan): Promise<ReflectionResult>;
}
//# sourceMappingURL=index.d.ts.map