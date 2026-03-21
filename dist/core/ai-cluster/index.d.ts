/**
 * OpenOxygen — AI Thinking Cluster (26w11aE)
 *
 * 多模型协同推理集群
 *
 * 核心概念：
 * - ThoughtRouter: 将复杂任务分解为子任务，路由到不同模型
 * - ConsensusEngine: 多模型结果投票融合
 * - ReflectionLoop: 反思迭代优化
 * - KnowledgeFusion: 跨模型知识整合
 *
 * 目标：比单模型推理更准确、更鲁棒、更透明
 */
import type { InferenceEngine } from "../../inference/engine/index.js";
export type ThinkingNode = {
    id: string;
    model: string;
    role: "reasoner" | "critic" | "synthesizer" | "verifier";
    input: string;
    output: string;
    confidence: number;
    timestamp: number;
    latency: number;
};
export type ThinkingGraph = {
    id: string;
    goal: string;
    nodes: ThinkingNode[];
    consensus?: string;
    finalAnswer?: string;
    iterations: number;
    totalLatency: number;
};
export type ConsensusStrategy = "majority" | "weighted" | "best" | "merge";
export declare class ThoughtRouter {
    private models;
    constructor(models: string[]);
    /**
     * 分析任务复杂度，决定路由策略
     */
    analyzeComplexity(task: string): {
        strategy: "single" | "parallel" | "iterative";
        roles: Array<"reasoner" | "critic" | "synthesizer" | "verifier">;
        estimatedSteps: number;
    };
    /**
     * 为子任务选择最优模型
     */
    selectModelForRole(role: string, availableModels: string[]): string;
}
export declare class ConsensusEngine {
    private strategy;
    constructor(strategy?: ConsensusStrategy);
    /**
     * 对多模型输出达成共识
     */
    reachConsensus(nodes: ThinkingNode[]): {
        answer: string;
        confidence: number;
        dissent?: string[];
    };
    private majorityVote;
    private weightedVote;
    private bestAnswer;
    private mergeAnswers;
}
export declare class ReflectionLoop {
    private maxIterations;
    private improvementThreshold;
    constructor(maxIterations?: number, improvementThreshold?: number);
    /**
     * 迭代反思优化
     */
    iterate(initialAnswer: string, criticFn: (answer: string) => Promise<{
        critique: string;
        score: number;
    }>, improveFn: (answer: string, critique: string) => Promise<string>): Promise<{
        finalAnswer: string;
        iterations: number;
        improvement: number;
        history: Array<{
            answer: string;
            score: number;
        }>;
    }>;
}
export declare class AIThinkingCluster {
    private inferenceEngine;
    private router;
    private consensus;
    private reflection;
    constructor(inferenceEngine: InferenceEngine, options?: {
        consensusStrategy?: ConsensusStrategy;
        maxReflectionIterations?: number;
    });
    /**
     * 执行集群推理
     */
    think(goal: string, context?: string): Promise<ThinkingGraph>;
    private executeNode;
}
//# sourceMappingURL=index.d.ts.map