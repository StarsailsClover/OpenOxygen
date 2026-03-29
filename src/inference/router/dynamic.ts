/**
 * OpenOxygen �?Dynamic Model Router (26w11aD)
 *
 * 智能模型路由器：根据任务类型、输入复杂度、资源状�?
 * 自动从多模型配置中选择最优模型�?
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type {
  InferenceMode,
  ModelConfig,
  ModelProvider,
} from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type {
  InferenceEngine,
  ChatMessage,
  InferenceResponse,
} from "../../inference/engine/index.js";

const log = createSubsystemLogger("routing");

// ══════════════════════════════════════════════════════════════════════════�?
// Model Capability Profiles
// ══════════════════════════════════════════════════════════════════════════�?

type ModelProfile = {
  model: string;
  provider: ModelProvider;
  reasoning: number; // 1-10: deep reasoning capability
  speed: number; // 1-10: inference speed
  vision: boolean; // Supports image input
  contextWindow: number; // Max tokens
  sizeGB: number; // Memory footprint
  bestFor: string[]; // Task types
};

const MODEL_PROFILES: Record<string, ModelProfile> = {
  "qwen3:4b": {
    model: "qwen3:4b",
    provider: "ollama",
    reasoning: 6,
    speed: 9,
    vision: false,
    contextWindow: 16384,
    sizeGB: 2.5,
    bestFor: ["chat", "fast-query", "file-ops", "quick-answer"],
  },
  "qwen3-vl:4b": {
    model: "qwen3-vl:4b",
    provider: "ollama",
    reasoning: 6,
    speed: 7,
    vision: true,
    contextWindow: 16384,
    sizeGB: 3.3,
    bestFor: ["screen-analysis", "ui-detection", "vision", "screenshot"],
  },
  "gpt-oss:20b": {
    model: "gpt-oss:20b",
    provider: "ollama",
    reasoning: 9,
    speed: 4,
    vision: false,
    contextWindow: 32768,
    sizeGB: 13,
    bestFor: [
      "planning",
      "reasoning",
      "analysis",
      "deep-thinking",
      "optimization",
    ],
  },
};

// ══════════════════════════════════════════════════════════════════════════�?
// Task Type Detector
// ══════════════════════════════════════════════════════════════════════════�?

function detectTaskType(instruction: string): string[] {
  const lower = instruction.toLowerCase();
  const tasks: string[] = [];

  // Vision tasks
  if (/截图|screen|capture|image|图片|照片|桌面|窗口/.test(lower)) {
    tasks.push("vision", "screen-analysis");
  }

  // Planning tasks
  if (
    /规划|plan|步骤|steps|strategy|analyze|分析|optimize|优化/.test(lower) &&
    instruction.length > 100
  ) {
    tasks.push("planning", "reasoning");
  }

  // File operations
  if (/文件|file|folder|目录|移动|复制|删除|整理/.test(lower)) {
    tasks.push("file-ops");
  }

  // Quick queries
  const hasQuestion = instruction.includes("?") || instruction.includes("�?);
  if (hasQuestion && instruction.length < 50) {
    tasks.push("quick-answer", "fast-query");
  }

  // Default
  if (tasks.length === 0) tasks.push("chat");

  return tasks;
}

// ══════════════════════════════════════════════════════════════════════════�?
// Model Router
// ══════════════════════════════════════════════════════════════════════════�?

export type RoutingDecision = {
  model: ModelConfig;
  reason: string;
  confidence: number;
  alternatives: ModelConfig[];
};

export class DynamicModelRouter {
  private models: ModelConfig[];
  private defaultModel: ModelConfig;

  constructor(models: ModelConfig[]) {
    this.models = models;
    // Set default: prefer qwen3:4b, fallback to first available
    this.defaultModel =
      models.find((m) => m.model.includes("qwen3:4b")) ?? models[0]!;
  }

  updateModels(models: ModelConfig[]): void {
    this.models = models;
    this.defaultModel =
      models.find((m) => m.model.includes("qwen3:4b")) ?? models[0]!;
  }

  /**
   * Route a request to the optimal model.
   */
  route(params: {
    instruction: string;
    messages: ChatMessage[];
    mode?: InferenceMode;
    needsVision?: boolean;
  }): RoutingDecision {
    const { instruction, messages, mode, needsVision } = params;

    // 1. Vision requirement �?must use vision model
    if (needsVision) {
      const visionModel = this.models.find((m) => this.hasVision(m.model));
      if (visionModel) {
        return {
          model: visionModel,
          reason: "Vision required �?selected qwen3-vl:4b",
          confidence: 1.0,
          alternatives: this.getVisionCapable(),
        };
      }
    }

    // 2. Mode-based routing
    if (mode === "deep") {
      const deepModel = this.models.find((m) =>
        m.model.includes("gpt-oss:20b"),
      );
      if (deepModel)
        return {
          model: deepModel,
          reason: "Deep mode �?selected gpt-oss:20b for reasoning",
          confidence: 0.9,
          alternatives: this.models.filter(
            (m) => !m.model.includes("gpt-oss:20b"),
          ),
        };
    }

    if (mode === "fast") {
      const fastModel = this.models.find(
        (m) => m.model.includes("qwen3:4b") && !m.model.includes("vl"),
      );
      if (fastModel)
        return {
          model: fastModel,
          reason: "Fast mode �?selected qwen3:4b for speed",
          confidence: 0.9,
          alternatives: this.models.filter((m) => m.model !== fastModel.model),
        };
    }

    // 3. Task-based routing
    const tasks = detectTaskType(instruction);
    const scored = this.models.map((m) => {
      const profile = MODEL_PROFILES[m.model];
      let score = 0;

      if (profile) {
        // Match task types
        for (const task of tasks) {
          if (profile.bestFor.includes(task)) score += 2;
        }
        // Bonus for speed on simple tasks
        if (tasks.includes("fast-query") && profile.speed >= 8) score += 1;
        // Penalize large models for simple tasks
        if (tasks.length === 1 && tasks[0] === "chat" && profile.sizeGB > 5)
          score -= 1;
      }

      return { model: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]!;

    return {
      model: best.model,
      reason: `Task analysis [${tasks.join(", ")}] �?selected ${best.model.model} (score: ${best.score})`,
      confidence: Math.min(0.7 + best.score * 0.1, 0.95),
      alternatives:
        best.model === this.defaultModel && scored.length > 1
          ? [scored[1]!.model]
          : [],
    };
  }

  /**
   * Route with fallback �?if primary fails, try alternatives.
   */
  async routeWithFallback<T>(
    decision: RoutingDecision,
    execute: (model: ModelConfig) => Promise<T>,
  ): Promise<{ result: T; model: ModelConfig; attempts: number }> {
    const candidates = [decision.model, ...decision.alternatives];

    for (let i = 0; i < candidates.length; i++) {
      const model = candidates[i]!;
      try {
        const result = await execute(model);
        log.info(`Routing succeeded with ${model.model} (attempt ${i + 1})`);
        return { result, model, attempts: i + 1 };
      } catch (err) {
        log.warn(`Model ${model.model} failed (attempt ${i + 1}):`, err);
        if (i === candidates.length - 1) throw err;
      }
    }

    throw new Error("All models failed");
  }

  private hasVision(modelName: string): boolean {
    const profile = MODEL_PROFILES[modelName];
    return profile?.vision ?? false;
  }

  private getVisionCapable(): ModelConfig[] {
    return this.models.filter((m) => this.hasVision(m.model));
  }

  getAvailableModels(): { name: string; sizeGB: number; vision: boolean }[] {
    return this.models.map((m) => {
      const profile = MODEL_PROFILES[m.model];
      return {
        name: m.model,
        sizeGB: profile?.sizeGB ?? 0,
        vision: profile?.vision ?? false,
      };
    });
  }
}
