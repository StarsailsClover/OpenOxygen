/**
 * OpenOxygen — Inference Engine
 *
 * 自适应推理引擎：根据任务复杂度自动选择推理模式。
 * 支持 fast/balanced/deep 三档推理深度。
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs, withTimeout } from "../../utils/index.js";
const log = createSubsystemLogger("inference/engine");
// ─── Complexity Analyzer ────────────────────────────────────────────────────
function analyzeComplexity(messages) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg)
        return "fast";
    const content = lastUserMsg.content;
    const length = content.length;
    // Heuristics for complexity detection
    const deepIndicators = [
        /分析|analyze|evaluate|research|compare|investigate/i,
        /报告|report|comprehensive|detailed|thorough/i,
        /规划|plan|strategy|architecture|design/i,
        /多步|multi.?step|chain|workflow|pipeline/i,
    ];
    const balancedIndicators = [
        /解释|explain|describe|summarize|列出|list/i,
        /如何|how to|what is|why|when/i,
        /帮我|help me|create|make|build/i,
    ];
    if (length > 500 || deepIndicators.some((r) => r.test(content))) {
        return "deep";
    }
    if (length > 100 || balancedIndicators.some((r) => r.test(content))) {
        return "balanced";
    }
    return "fast";
}
async function callOpenAICompatible(messages, config, tools, providerName) {
    const startTime = nowMs();
    const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    const requestBody = {
        model: config.model,
        messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.name ? { name: m.name } : {}),
            ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
            ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
        })),
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 4096,
    };
    if (tools && tools.length > 0) {
        requestBody["tools"] = tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.parameters },
        }));
    }
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${providerName} API error (${response.status}): ${errorText}`);
    }
    const data = (await response.json());
    const choice = data.choices[0];
    // Qwen3 thinking 模式：content 可能为空，实际内容在 reasoning 字段
    const rawContent = choice?.message.content || "";
    const reasoning = choice?.message.reasoning || "";
    // 优先使用 content，如果为空则从 reasoning 提取最终答案
    let finalContent = rawContent;
    if (!finalContent && reasoning) {
        // 尝试提取 reasoning 中最后一段作为答案
        const lines = reasoning.split("\n").filter((l) => l.trim().length > 0);
        finalContent = lines[lines.length - 1] || reasoning.slice(0, 500);
    }
    return {
        id: data.id ?? generateId("inf"),
        content: finalContent,
        toolCalls: choice?.message.tool_calls,
        usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
            }
            : undefined,
        model: config.model,
        provider: providerName,
        durationMs: nowMs() - startTime,
        mode: "balanced",
    };
}
const providers = {
    openai: {
        name: "openai",
        chat: (msgs, cfg, tools) => callOpenAICompatible(msgs, cfg, tools, "openai"),
    },
    anthropic: {
        name: "anthropic",
        chat: async (messages, config, tools) => {
            const startTime = nowMs();
            const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";
            // Convert to Anthropic format
            const systemMsg = messages.find((m) => m.role === "system");
            const nonSystemMsgs = messages.filter((m) => m.role !== "system");
            const requestBody = {
                model: config.model,
                max_tokens: config.maxTokens ?? 4096,
                messages: nonSystemMsgs.map((m) => ({
                    role: m.role === "tool" ? "user" : m.role,
                    content: m.content,
                })),
            };
            if (systemMsg) {
                requestBody["system"] = systemMsg.content;
            }
            if (tools && tools.length > 0) {
                requestBody["tools"] = tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    input_schema: t.parameters,
                }));
            }
            const response = await fetch(`${baseUrl}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": config.apiKey ?? "",
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
            }
            const data = (await response.json());
            const textContent = data.content
                .filter((c) => c.type === "text")
                .map((c) => c.text ?? "")
                .join("");
            return {
                id: data.id,
                content: textContent,
                usage: data.usage
                    ? {
                        promptTokens: data.usage.input_tokens,
                        completionTokens: data.usage.output_tokens,
                        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
                    }
                    : undefined,
                model: config.model,
                provider: "anthropic",
                durationMs: nowMs() - startTime,
                mode: "balanced",
            };
        },
    },
    gemini: {
        name: "gemini",
        chat: (msgs, cfg, tools) => callOpenAICompatible(msgs, { ...cfg, baseUrl: cfg.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta/openai" }, tools, "gemini"),
    },
    openrouter: {
        name: "openrouter",
        chat: (msgs, cfg, tools) => callOpenAICompatible(msgs, { ...cfg, baseUrl: cfg.baseUrl ?? "https://openrouter.ai/api/v1" }, tools, "openrouter"),
    },
    stepfun: {
        name: "stepfun",
        chat: (msgs, cfg, tools) => callOpenAICompatible(msgs, { ...cfg, baseUrl: cfg.baseUrl ?? "https://api.stepfun.com/v1" }, tools, "stepfun"),
    },
    ollama: {
        name: "ollama",
        chat: (msgs, cfg, tools) => callOpenAICompatible(msgs, { ...cfg, baseUrl: cfg.baseUrl ?? "http://localhost:11434/v1" }, tools, "ollama"),
    },
    custom: {
        name: "custom",
        chat: (msgs, cfg, tools) => callOpenAICompatible(msgs, cfg, tools, "custom"),
    },
};
// ─── Inference Engine ───────────────────────────────────────────────────────
export class InferenceEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    updateConfig(config) {
        this.config = config;
    }
    async infer(request) {
        const mode = request.mode ?? analyzeComplexity(request.messages);
        const model = request.model ?? this.selectModel(mode);
        if (!model) {
            throw new Error("No model configured for inference");
        }
        const adapter = providers[model.provider];
        if (!adapter) {
            throw new Error(`Unknown model provider: ${model.provider}`);
        }
        // Prepend system prompt if provided
        let messages = [...request.messages];
        if (request.systemPrompt) {
            messages = [{ role: "system", content: request.systemPrompt }, ...messages];
        }
        log.info(`Inference [${mode}] via ${model.provider}/${model.model}`);
        const timeoutMs = mode === "deep" ? 120_000 : mode === "balanced" ? 60_000 : 30_000;
        const response = await withTimeout(adapter.chat(messages, model, request.tools), timeoutMs, `inference:${model.provider}`);
        response.mode = mode;
        log.info(`Inference completed in ${response.durationMs}ms (${response.usage?.totalTokens ?? "?"} tokens)`);
        return response;
    }
    selectModel(mode) {
        const models = this.config.models;
        if (models.length === 0)
            return null;
        // Simple strategy: use first available model
        // Future: implement model routing based on mode
        return models[0] ?? null;
    }
    getAvailableProviders() {
        return this.config.models.map((m) => `${m.provider}/${m.model}`);
    }
}
//# sourceMappingURL=index.js.map