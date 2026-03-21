/**
 * OpenOxygen — Inference Engine
 *
 * 自适应推理引擎：根据任务复杂度自动选择推理模式。
 * 支持 fast/balanced/deep 三档推理深度。
 */
import type { InferenceMode, ModelConfig, OxygenConfig } from "../../types/index.js";
export type ChatRole = "system" | "user" | "assistant" | "tool";
export type ChatMessage = {
    role: ChatRole;
    content: string;
    name?: string;
    toolCallId?: string;
    toolCalls?: ToolCallRequest[];
};
export type ToolCallRequest = {
    id: string;
    name: string;
    arguments: string;
};
export type InferenceRequest = {
    messages: ChatMessage[];
    model?: ModelConfig;
    mode?: InferenceMode;
    tools?: ToolDefinition[];
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
};
export type ToolDefinition = {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
};
export type InferenceResponse = {
    id: string;
    content: string;
    toolCalls?: ToolCallRequest[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: string;
    durationMs: number;
    mode: InferenceMode;
};
export declare class InferenceEngine {
    private config;
    constructor(config: OxygenConfig);
    updateConfig(config: OxygenConfig): void;
    infer(request: InferenceRequest): Promise<InferenceResponse>;
    private selectModel;
    getAvailableProviders(): string[];
}
//# sourceMappingURL=index.d.ts.map