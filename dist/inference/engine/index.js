/**
 * OpenOxygen - Inference Engine
 *
 * 自适应推理引擎：根据任务复杂度自动选择推理模式。
 * 支持 fast/balanced/deep 三种推理深度。
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs, withTimeout } from "../../utils/index.js";
const log = createSubsystemLogger("inference/engine");
// === Complexity Analyzer ===
function analyzeComplexity(messages) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg)
        return "balanced";
    const content = lastUserMsg.content.toLowerCase();
    const length = content.length;
    // Fast mode indicators
    const fastIndicators = [
        "hello", "hi", "hey",
        "what is", "who is", "where is",
        "simple", "quick", "fast",
        "yes", "no", "ok", "sure",
    ];
    if (fastIndicators.some(i => content.includes(i)) && length < 100) {
        return "fast";
    }
    // Deep mode indicators
    const deepIndicators = [
        "analyze", "explain in detail",
        "step by step", "comprehensive",
        "architecture", "design",
        "debug", "troubleshoot",
        "complex", "complicated",
        "optimize", "improve",
    ];
    if (deepIndicators.some(i => content.includes(i)) || length > 500) {
        return "deep";
    }
    return "balanced";
}
// === Inference Engine ===
export class InferenceEngine {
    config;
    modelPool = new Map();
    constructor(config) {
        this.config = config;
        this.initializeModelPool();
        log.info("InferenceEngine initialized");
    }
    initializeModelPool() {
        for (const model of this.config.models || []) {
            this.modelPool.set(`${model.provider}:${model.model}`, model);
        }
    }
    /**
     * Select best model for mode
     */
    selectModel(mode) {
        const models = Array.from(this.modelPool.values());
        if (models.length === 0) {
            // Default to ollama
            return {
                provider: "ollama",
                model: "qwen3:4b",
                baseUrl: "http://localhost:11434",
            };
        }
        // Sort by capability for mode
        const scored = models.map(m => ({
            model: m,
            score: this.scoreModelForMode(m, mode),
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.model || models[0];
    }
    scoreModelForMode(model, mode) {
        // Simple scoring based on model name
        const name = model.model.toLowerCase();
        if (mode === "fast") {
            if (name.includes("mini") || name.includes("small") || name.includes("1.8b"))
                return 10;
            if (name.includes("4b") || name.includes("7b"))
                return 7;
            return 5;
        }
        if (mode === "deep") {
            if (name.includes("opus") || name.includes("gpt-4") || name.includes("32b"))
                return 10;
            if (name.includes("sonnet") || name.includes("14b"))
                return 8;
            return 5;
        }
        // Balanced
        if (name.includes("4b") || name.includes("7b") || name.includes("sonnet"))
            return 10;
        return 7;
    }
    /**
     * Execute inference
     */
    async infer(request) {
        const startTime = nowMs();
        const mode = request.mode || analyzeComplexity(request.messages);
        const model = request.model || this.selectModel(mode);
        log.info(`Inference started: mode=${mode}, model=${model.model}`);
        try {
            const response = await this.callModel(model, request, mode);
            log.info(`Inference completed: ${response.durationMs}ms`);
            return response;
        }
        catch (error) {
            log.error(`Inference failed: ${error}`);
            throw error;
        }
    }
    /**
     * Call specific model provider
     */
    async callModel(model, request, mode) {
        const startTime = nowMs();
        switch (model.provider) {
            case "ollama":
                return this.callOllama(model, request, mode, startTime);
            case "openai":
                return this.callOpenAI(model, request, mode, startTime);
            case "anthropic":
                return this.callAnthropic(model, request, mode, startTime);
            default:
                throw new Error(`Unsupported provider: ${model.provider}`);
        }
    }
    async callOllama(model, request, mode, startTime) {
        const baseUrl = model.baseUrl || "http://localhost:11434";
        const timeout = mode === "fast" ? 10000 : mode === "deep" ? 60000 : 30000;
        const response = await withTimeout(fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model.model,
                messages: request.messages,
                stream: false,
                options: {
                    temperature: request.temperature ?? (mode === "deep" ? 0.3 : 0.7),
                    num_predict: request.maxTokens ?? (mode === "deep" ? 4096 : 2048),
                },
            }),
        }), timeout);
        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return {
            id: generateId("inf"),
            content: data.message?.content || "",
            usage: {
                promptTokens: data.prompt_eval_count || 0,
                completionTokens: data.eval_count || 0,
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
            },
            model: model.model,
            provider: "ollama",
            durationMs: nowMs() - startTime,
            mode,
        };
    }
    async callOpenAI(model, request, mode, startTime) {
        const baseUrl = model.baseUrl || "https://api.openai.com/v1";
        const timeout = mode === "fast" ? 15000 : mode === "deep" ? 120000 : 60000;
        if (!model.apiKey) {
            throw new Error("OpenAI API key required");
        }
        const response = await withTimeout(fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${model.apiKey}`,
            },
            body: JSON.stringify({
                model: model.model,
                messages: request.messages,
                temperature: request.temperature ?? (mode === "deep" ? 0.3 : 0.7),
                max_tokens: request.maxTokens ?? (mode === "deep" ? 4096 : 2048),
                tools: request.tools,
            }),
        }), timeout);
        if (!response.ok) {
            throw new Error(`OpenAI error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const choice = data.choices?.[0];
        return {
            id: data.id || generateId("inf"),
            content: choice?.message?.content || "",
            toolCalls: choice?.message?.tool_calls?.map((tc) => ({
                id: tc.id,
                name: tc.function?.name,
                arguments: tc.function?.arguments,
            })),
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
            },
            model: model.model,
            provider: "openai",
            durationMs: nowMs() - startTime,
            mode,
        };
    }
    async callAnthropic(model, request, mode, startTime) {
        const baseUrl = model.baseUrl || "https://api.anthropic.com/v1";
        const timeout = mode === "fast" ? 15000 : mode === "deep" ? 120000 : 60000;
        if (!model.apiKey) {
            throw new Error("Anthropic API key required");
        }
        // Convert messages to Anthropic format
        const systemMsg = request.messages.find(m => m.role === "system");
        const conversation = request.messages.filter(m => m.role !== "system");
        const response = await withTimeout(fetch(`${baseUrl}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": model.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: model.model,
                system: systemMsg?.content,
                messages: conversation.map(m => ({
                    role: m.role === "assistant" ? "assistant" : "user",
                    content: m.content,
                })),
                temperature: request.temperature ?? (mode === "deep" ? 0.3 : 0.7),
                max_tokens: request.maxTokens ?? (mode === "deep" ? 4096 : 2048),
            }),
        }), timeout);
        if (!response.ok) {
            throw new Error(`Anthropic error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return {
            id: data.id || generateId("inf"),
            content: data.content?.[0]?.text || "",
            usage: {
                promptTokens: data.usage?.input_tokens || 0,
                completionTokens: data.usage?.output_tokens || 0,
                totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
            },
            model: model.model,
            provider: "anthropic",
            durationMs: nowMs() - startTime,
            mode,
        };
    }
    /**
     * Stream inference
     */
    async *stream(request) {
        // Placeholder for streaming implementation
        const response = await this.infer(request);
        yield response.content;
    }
}
// === Factory ===
export function createInferenceEngine(config) {
    return new InferenceEngine(config);
}
// === Exports ===
export { analyzeComplexity };
export default InferenceEngine;
