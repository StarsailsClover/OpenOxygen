/**
 * OpenOxygen — Model Health Checker
 *
 * 26w11aD: Check model availability before inference
 */
import type { ModelConfig } from "../types/index.js";
export declare function checkModelHealth(config: ModelConfig): Promise<{
    healthy: boolean;
    error?: string;
}>;
export declare function filterHealthyModels(models: ModelConfig[]): Promise<{
    healthy: ModelConfig[];
    unhealthy: {
        config: ModelConfig;
        error: string;
    }[];
}>;
//# sourceMappingURL=health.d.ts.map