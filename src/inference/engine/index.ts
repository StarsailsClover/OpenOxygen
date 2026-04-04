/**
<<<<<<< HEAD
 * OpenOxygen �?Inference Engine
 *
 * 自适应推理引擎：根据任务复杂度自动选择推理模式�?
 * 支持 fast/balanced/deep 三档推理深度�?
=======
 * OpenOxygen - Inference Engine
 *
 * 自适应推理引擎：根据任务复杂度自动选择推理模式。
 * 支持 fast/balanced/deep 三种推理深度。
>>>>>>> dev
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type {
  InferenceMode,
  ModelConfig,
  OxygenConfig,
  ToolInvocation,
  ToolResult,
} from "../../types/index.js";
import { generateId, nowMs, withTimeout } from "../../utils/index.js";

const log = createSubsystemLogger("inference/engine");

// === Message Types ===

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
  arguments: string; // JSON string
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

// === Complexity Analyzer ===

function analyzeComplexity(messages: ChatMessage[]): InferenceMode {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return "balanced";

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

<<<<<<< HEAD
// ─── Provider Adapters ──────────────────────────────────────────────────────

type ProviderAdapter = {
  name: string;
  chat: (
    messages: ChatMessage[],
    config: ModelConfig,
    tools?: ToolDefinition[],
  ) => Promise<InferenceResponse>;
};

async function callOpenAICompatible(
  messages: ChatMessage[],
  config: ModelConfig,
  tools: ToolDefinition[] | undefined,
  providerName: string,
): Promise<InferenceResponse> {
  const startTime = nowMs();
  const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";

  const requestBody: Record<string, unknown> = {
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
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
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
    throw new Error(
      `${providerName} API error (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    id: string;
    choices: Array<{
      message: {
        content?: string;
        reasoning?: string;
        tool_calls?: ToolCallRequest[];
      };
    }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  const choice = data.choices[0];
  // Qwen3 thinking 模式：content 可能为空，实际内容在 reasoning 字段
  const rawContent = choice?.message.content || "";
  const reasoning = choice?.message.reasoning || "";
  // 优先使用 content，如果为空则�?reasoning 提取最终答�?
  let finalContent = rawContent;
  if (!finalContent && reasoning) {
    // 尝试提取 reasoning 中最后一段作为答�?
    const lines = reasoning
      .split("\n")
      .filter((l: string) => l.trim().length > 0);
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

const providers: Record<string, ProviderAdapter> = {
  openai: {
    name: "openai",
    chat: (msgs, cfg, tools) =>
      callOpenAICompatible(msgs, cfg, tools, "openai"),
  },
  anthropic: {
    name: "anthropic",
    chat: async (messages, config, tools) => {
      const startTime = nowMs();
      const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";

      // Convert to Anthropic format
      const systemMsg = messages.find((m) => m.role === "system");
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");

      const requestBody: Record<string, unknown> = {
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
        throw new Error(
          `Anthropic API error (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        id: string;
        content: Array<{ type: string; text?: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };

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
    chat: (msgs, cfg, tools) =>
      callOpenAICompatible(
        msgs,
        {
          ...cfg,
          baseUrl:
            cfg.baseUrl ??
            "https://generativelanguage.googleapis.com/v1beta/openai",
        },
        tools,
        "gemini",
      ),
  },
  openrouter: {
    name: "openrouter",
    chat: (msgs, cfg, tools) =>
      callOpenAICompatible(
        msgs,
        { ...cfg, baseUrl: cfg.baseUrl ?? "https://openrouter.ai/api/v1" },
        tools,
        "openrouter",
      ),
  },
  stepfun: {
    name: "stepfun",
    chat: (msgs, cfg, tools) =>
      callOpenAICompatible(
        msgs,
        { ...cfg, baseUrl: cfg.baseUrl ?? "https://api.stepfun.com/v1" },
        tools,
        "stepfun",
      ),
  },
  ollama: {
    name: "ollama",
    chat: (msgs, cfg, tools) =>
      callOpenAICompatible(
        msgs,
        { ...cfg, baseUrl: cfg.baseUrl ?? "http://localhost:11434/v1" },
        tools,
        "ollama",
      ),
  },
  custom: {
    name: "custom",
    chat: (msgs, cfg, tools) =>
      callOpenAICompatible(msgs, cfg, tools, "custom"),
  },
};

// ─── Inference Engine ───────────────────────────────────────────────────────
=======
// === Inference Engine ===
>>>>>>> dev

export class InferenceEngine {
  private config: OxygenConfig;
  private modelPool: Map<string, ModelConfig> = new Map();

  constructor(config: OxygenConfig) {
    this.config = config;
    this.initializeModelPool();
    log.info("InferenceEngine initialized");
  }

  private initializeModelPool(): void {
    for (const model of this.config.models || []) {
      this.modelPool.set(`${model.provider}:${model.model}`, model);
    }
  }

  /**
   * Select best model for mode
   */
  private selectModel(mode: InferenceMode): ModelConfig {
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
    return scored[0]?.model || models[0]!;
  }

  private scoreModelForMode(model: ModelConfig, mode: InferenceMode): number {
    // Simple scoring based on model name
    const name = model.model.toLowerCase();
    
    if (mode === "fast") {
      if (name.includes("mini") || name.includes("small") || name.includes("1.8b")) return 10;
      if (name.includes("4b") || name.includes("7b")) return 7;
      return 5;
    }
    
    if (mode === "deep") {
      if (name.includes("opus") || name.includes("gpt-4") || name.includes("32b")) return 10;
      if (name.includes("sonnet") || name.includes("14b")) return 8;
      return 5;
    }
    
    // Balanced
    if (name.includes("4b") || name.includes("7b") || name.includes("sonnet")) return 10;
    return 7;
  }

  /**
   * Execute inference
   */
  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = nowMs();
    const mode = request.mode || analyzeComplexity(request.messages);
    const model = request.model || this.selectModel(mode);

    log.info(`Inference started: mode=${mode}, model=${model.model}`);

    try {
      const response = await this.callModel(model, request, mode);
      
      log.info(`Inference completed: ${response.durationMs}ms`);
      return response;
    } catch (error) {
      log.error(`Inference failed: ${error}`);
      throw error;
    }
  }

  /**
   * Call specific model provider
   */
  private async callModel(
    model: ModelConfig,
    request: InferenceRequest,
    mode: InferenceMode,
  ): Promise<InferenceResponse> {
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

  private async callOllama(
    model: ModelConfig,
    request: InferenceRequest,
    mode: InferenceMode,
    startTime: number,
  ): Promise<InferenceResponse> {
    const baseUrl = model.baseUrl || "http://localhost:11434";
    const timeout = mode === "fast" ? 10000 : mode === "deep" ? 60000 : 30000;

    const response = await withTimeout(
      fetch(`${baseUrl}/api/chat`, {
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
      }),
      timeout,
    );

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

  private async callOpenAI(
    model: ModelConfig,
    request: InferenceRequest,
    mode: InferenceMode,
    startTime: number,
  ): Promise<InferenceResponse> {
    const baseUrl = model.baseUrl || "https://api.openai.com/v1";
    const timeout = mode === "fast" ? 15000 : mode === "deep" ? 120000 : 60000;

    if (!model.apiKey) {
      throw new Error("OpenAI API key required");
    }

    const response = await withTimeout(
      fetch(`${baseUrl}/chat/completions`, {
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
      }),
      timeout,
    );

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      id: data.id || generateId("inf"),
      content: choice?.message?.content || "",
      toolCalls: choice?.message?.tool_calls?.map((tc: any) => ({
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

  private async callAnthropic(
    model: ModelConfig,
    request: InferenceRequest,
    mode: InferenceMode,
    startTime: number,
  ): Promise<InferenceResponse> {
    const baseUrl = model.baseUrl || "https://api.anthropic.com/v1";
    const timeout = mode === "fast" ? 15000 : mode === "deep" ? 120000 : 60000;

    if (!model.apiKey) {
      throw new Error("Anthropic API key required");
    }

    // Convert messages to Anthropic format
    const systemMsg = request.messages.find(m => m.role === "system");
    const conversation = request.messages.filter(m => m.role !== "system");

    const response = await withTimeout(
      fetch(`${baseUrl}/messages`, {
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
      }),
      timeout,
    );

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
  async *stream(request: InferenceRequest): AsyncGenerator<string, void, unknown> {
    // Placeholder for streaming implementation
    const response = await this.infer(request);
    yield response.content;
  }
}

// === Factory ===

export function createInferenceEngine(config: OxygenConfig): InferenceEngine {
  return new InferenceEngine(config);
}

// === Exports ===

export { analyzeComplexity };
export default InferenceEngine;
