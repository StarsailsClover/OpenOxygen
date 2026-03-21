/**
 * OpenOxygen — Dynamic Model Router (26w11aD)
 *
 * 智能模型路由器：根据任务类型、输入复杂度、资源状态
 * 自动从多模型配置中选择最优模型。
 */
import type { InferenceMode, ModelConfig } from "../../types/index.js";
import type { ChatMessage } from "../../inference/engine/index.js";
export type RoutingDecision = {
    model: ModelConfig;
    reason: string;
    confidence: number;
    alternatives: ModelConfig[];
};
export declare class DynamicModelRouter {
    private models;
    private defaultModel;
    constructor(models: ModelConfig[]);
    updateModels(models: ModelConfig[]): void;
    /**
     * Route a request to the optimal model.
     */
    route(params: {
        instruction: string;
        messages: ChatMessage[];
        mode?: InferenceMode;
        needsVision?: boolean;
    }): RoutingDecision;
    /**
     * Route with fallback — if primary fails, try alternatives.
     */
    routeWithFallback<T>(decision: RoutingDecision, execute: (model: ModelConfig) => Promise<T>): Promise<{
        result: T;
        model: ModelConfig;
        attempts: number;
    }>;
    private hasVision;
    private getVisionCapable;
    getAvailableModels(): {
        name: string;
        sizeGB: number;
        vision: boolean;
    }[];
}
//# sourceMappingURL=dynamic.d.ts.map