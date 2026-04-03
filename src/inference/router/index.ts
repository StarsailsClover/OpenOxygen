/**
 * OpenOxygen - Multi-Model Router
 *
 * 多模型智能路由：根据任务类型、复杂度、成本约束自动选择最优模型。
 * 支持负载均衡、故障转移、API Key 轮换。
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type {
  InferenceMode,
  ModelConfig,
  ModelProvider,
} from "../../types/index.js";

const log = createSubsystemLogger("inference/router");

// === Model Capability Profile ===

type ModelCapability = {
  reasoning: number; // 0-10
  speed: number; // 0-10
  vision: number; // 0-10
  toolUse: number; // 0-10
  costPer1kTokens: number; // USD
  maxContext: number; // tokens
};

const MODEL_PROFILES: Record<string, ModelCapability> = {
  "gpt-4o": {
    reasoning: 9,
    speed: 7,
    vision: 9,
    toolUse: 9,
    costPer1kTokens: 0.005,
    maxContext: 128000,
  },
  "gpt-4o-mini": {
    reasoning: 7,
    speed: 9,
    vision: 7,
    toolUse: 8,
    costPer1kTokens: 0.00015,
    maxContext: 128000,
  },
  "gpt-4.5": {
    reasoning: 10,
    speed: 6,
    vision: 10,
    toolUse: 10,
    costPer1kTokens: 0.01,
    maxContext: 256000,
  },
  "claude-sonnet-4-20250514": {
    reasoning: 9,
    speed: 7,
    vision: 8,
    toolUse: 9,
    costPer1kTokens: 0.003,
    maxContext: 200000,
  },
  "claude-opus-4-20250514": {
    reasoning: 10,
    speed: 5,
    vision: 9,
    toolUse: 9,
    costPer1kTokens: 0.015,
    maxContext: 200000,
  },
  "gemini-2.5-pro": {
    reasoning: 9,
    speed: 7,
    vision: 9,
    toolUse: 8,
    costPer1kTokens: 0.00125,
    maxContext: 1000000,
  },
  "gemini-2.5-flash": {
    reasoning: 7,
    speed: 9,
    vision: 7,
    toolUse: 7,
    costPer1kTokens: 0.00015,
    maxContext: 1000000,
  },
  "qwen3:4b": {
    reasoning: 6,
    speed: 10,
    vision: 0,
    toolUse: 6,
    costPer1kTokens: 0,
    maxContext: 32768,
  },
  "qwen3:32b": {
    reasoning: 8,
    speed: 7,
    vision: 0,
    toolUse: 8,
    costPer1kTokens: 0,
    maxContext: 131072,
  },
};

// === Router ===

export type RouterStrategy = "cost" | "quality" | "speed" | "balanced";

export interface RouterConfig {
  strategy: RouterStrategy;
  maxCostPerRequest?: number;
  preferredProviders?: ModelProvider[];
  fallbackEnabled: boolean;
  loadBalance: boolean;
}

export class ModelRouter {
  private config: RouterConfig;
  private availableModels: ModelConfig[];
  private healthStatus: Map<string, boolean> = new Map();
  private requestCount: Map<string, number> = new Map();

  constructor(config: RouterConfig, models: ModelConfig[]) {
    this.config = {
      strategy: "balanced",
      fallbackEnabled: true,
      loadBalance: true,
      ...config,
    };
    this.availableModels = models;
    
    // Initialize health status
    for (const model of models) {
      const key = `${model.provider}:${model.model}`;
      this.healthStatus.set(key, true);
      this.requestCount.set(key, 0);
    }

    log.info(`ModelRouter initialized with ${models.length} models`);
  }

  /**
   * Select best model for task
   */
  selectModel(
    task: {
      complexity?: "low" | "medium" | "high";
      requiresVision?: boolean;
      requiresTools?: boolean;
      estimatedTokens?: number;
    },
  ): ModelConfig {
    const candidates = this.getHealthyModels();
    
    if (candidates.length === 0) {
      throw new Error("No healthy models available");
    }

    // Score each candidate
    const scored = candidates.map(model => ({
      model,
      score: this.scoreModel(model, task),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const selected = scored[0]?.model;
    if (!selected) {
      throw new Error("Failed to select model");
    }

    // Update request count for load balancing
    const key = `${selected.provider}:${selected.model}`;
    this.requestCount.set(key, (this.requestCount.get(key) || 0) + 1);

    log.debug(`Selected model: ${selected.model} (${selected.provider})`);
    return selected;
  }

  private scoreModel(
    model: ModelConfig,
    task: {
      complexity?: "low" | "medium" | "high";
      requiresVision?: boolean;
      requiresTools?: boolean;
      estimatedTokens?: number;
    },
  ): number {
    const profile = MODEL_PROFILES[model.model] || {
      reasoning: 5,
      speed: 5,
      vision: 0,
      toolUse: 5,
      costPer1kTokens: 0.001,
      maxContext: 8192,
    };

    let score = 0;

    // Strategy-based scoring
    switch (this.config.strategy) {
      case "cost":
        score += (1 - Math.min(profile.costPer1kTokens * 100, 1)) * 10;
        score += profile.speed * 2;
        break;
      case "quality":
        score += profile.reasoning * 3;
        score += profile.toolUse * 2;
        break;
      case "speed":
        score += profile.speed * 4;
        break;
      case "balanced":
      default:
        score += profile.reasoning * 2;
        score += profile.speed * 1.5;
        score += (1 - Math.min(profile.costPer1kTokens * 100, 1)) * 5;
        break;
    }

    // Task requirements
    if (task.requiresVision && profile.vision > 0) {
      score += profile.vision;
    } else if (task.requiresVision && profile.vision === 0) {
      score -= 10; // Penalize non-vision models for vision tasks
    }

    if (task.requiresTools && profile.toolUse > 0) {
      score += profile.toolUse;
    }

    // Complexity matching
    if (task.complexity === "high" && profile.reasoning >= 8) {
      score += 5;
    } else if (task.complexity === "low" && profile.speed >= 8) {
      score += 5;
    }

    // Context window check
    if (task.estimatedTokens && task.estimatedTokens > profile.maxContext) {
      score -= 100; // Heavy penalty for insufficient context
    }

    // Load balancing penalty
    const key = `${model.provider}:${model.model}`;
    const requestCount = this.requestCount.get(key) || 0;
    score -= requestCount * 0.1;

    // Provider preference
    if (this.config.preferredProviders?.includes(model.provider)) {
      score += 3;
    }

    return score;
  }

  private getHealthyModels(): ModelConfig[] {
    return this.availableModels.filter(model => {
      const key = `${model.provider}:${model.model}`;
      return this.healthStatus.get(key) !== false;
    });
  }

  /**
   * Mark model as unhealthy
   */
  markUnhealthy(model: ModelConfig): void {
    const key = `${model.provider}:${model.model}`;
    this.healthStatus.set(key, false);
    log.warn(`Model marked unhealthy: ${key}`);

    // Auto-recovery after 60 seconds
    setTimeout(() => {
      this.healthStatus.set(key, true);
      log.info(`Model health restored: ${key}`);
    }, 60000);
  }

  /**
   * Get router stats
   */
  getStats(): {
    totalModels: number;
    healthyModels: number;
    requestDistribution: Record<string, number>;
  } {
    const healthy = this.getHealthyModels();
    const distribution: Record<string, number> = {};
    
    for (const [key, count] of this.requestCount.entries()) {
      distribution[key] = count;
    }

    return {
      totalModels: this.availableModels.length,
      healthyModels: healthy.length,
      requestDistribution: distribution,
    };
  }

  /**
   * Update model list
   */
  updateModels(models: ModelConfig[]): void {
    this.availableModels = models;
    
    // Update health status for new models
    for (const model of models) {
      const key = `${model.provider}:${model.model}`;
      if (!this.healthStatus.has(key)) {
        this.healthStatus.set(key, true);
        this.requestCount.set(key, 0);
      }
    }

    log.info(`Model list updated: ${models.length} models`);
  }
}

// === Factory ===

export function createModelRouter(
  config: RouterConfig,
  models: ModelConfig[],
): ModelRouter {
  return new ModelRouter(config, models);
}

// === Default Export ===

export default ModelRouter;
