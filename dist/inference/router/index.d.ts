/**
 * OpenOxygen — Multi-Model Router
 *
 * 多模型智能路由：根据任务类型、复杂度、成本约束自动选择最优模型。
 * 支持负载均衡、故障转移、API Key 轮换。
 */
import type { InferenceMode, ModelConfig, ModelProvider } from "../../types/index.js";
export type RoutingStrategy = "performance" | "cost" | "balanced" | "failover";
export type RoutingConstraints = {
    strategy?: RoutingStrategy;
    maxCostPer1kTokens?: number;
    requireVision?: boolean;
    requireToolUse?: boolean;
    minContextLength?: number;
    preferredProviders?: ModelProvider[];
    excludeProviders?: ModelProvider[];
};
export type RoutingDecision = {
    model: ModelConfig;
    reason: string;
    score: number;
    fallbacks: ModelConfig[];
};
export declare function registerKeyPool(provider: string, keys: string[]): void;
export declare function getNextKey(provider: string): string | null;
export declare function markKeyFailed(provider: string, key: string): void;
export declare class ModelRouter {
    private models;
    constructor(models: ModelConfig[]);
    private initKeyPools;
    updateModels(models: ModelConfig[]): void;
    route(mode: InferenceMode, constraints?: RoutingConstraints): RoutingDecision | null;
    private filterCandidates;
    private scoreModel;
}
//# sourceMappingURL=index.d.ts.map