/**
 * OpenOxygen â€?Pool-Integrated Router (26w11aE)
 */
import type { ModelConfig, InferenceMode } from "../types/index.js";
import type { ChatMessage } from "./engine/index.js";
export type ModelRequest = {
    messages: ChatMessage[];
};
export interface RoutingDecision {
    model: string;
    provider: string;
    reason: string;
    confidence: number;
    estimatedLatency: number;
}
export declare class PoolIntegratedRouter {
    private modelConfigs;
    constructor(configs: ModelConfig[]);
    decide(params: {
        instruction: string;
        messages: ChatMessage[];
        mode?: InferenceMode;
        needsVision?: boolean;
        preferredModel?: string;
    }): RoutingDecision;
    infer(decision: RoutingDecision, request: ModelRequest): Promise<{
        success: boolean;
        data?: unknown;
        error?: string;
        latency: number;
    }>;
}
//# sourceMappingURL=router-pool.d.ts.map
