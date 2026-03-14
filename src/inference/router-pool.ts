/**
 * OpenOxygen — Pool-Integrated Router (26w11aE)
 */

import { createSubsystemLogger } from "../logging/index.js";
import type { ModelConfig, InferenceMode } from "../types/index.js";
import type { ChatMessage } from "./engine/index.js";

const log = createSubsystemLogger("inference/router-pool");

export type ModelRequest = { messages: ChatMessage[] };

export interface RoutingDecision {
  model: string;
  provider: string;
  reason: string;
  confidence: number;
  estimatedLatency: number;
}

export class PoolIntegratedRouter {
  private modelConfigs: Map<string, ModelConfig>;

  constructor(configs: ModelConfig[]) {
    this.modelConfigs = new Map(configs.map(c => [c.model, c]));
  }

  decide(params: {
    instruction: string;
    messages: ChatMessage[];
    mode?: InferenceMode;
    needsVision?: boolean;
    preferredModel?: string;
  }): RoutingDecision {
    const { instruction, mode, needsVision, preferredModel } = params;

    if (preferredModel && this.modelConfigs.has(preferredModel)) {
      return { model: preferredModel, provider: this.modelConfigs.get(preferredModel)!.provider, reason: "User preferred", confidence: 1.0, estimatedLatency: 300 };
    }

    if (needsVision) {
      const vl = [...this.modelConfigs.keys()].find(m => m.includes("vl"));
      if (vl) return { model: vl, provider: this.modelConfigs.get(vl)!.provider, reason: "Vision task", confidence: 0.95, estimatedLatency: 500 };
    }

    if (mode === "deep") {
      const big = [...this.modelConfigs.keys()].find(m => m.includes("20b"));
      if (big) return { model: big, provider: this.modelConfigs.get(big)!.provider, reason: "Deep mode", confidence: 0.9, estimatedLatency: 2000 };
    }

    const fast = [...this.modelConfigs.keys()].find(m => m.includes("4b") && !m.includes("vl")) || [...this.modelConfigs.keys()][0]!;
    return { model: fast, provider: this.modelConfigs.get(fast)!.provider, reason: "Default fast", confidence: 0.7, estimatedLatency: 300 };
  }

  async infer(decision: RoutingDecision, request: ModelRequest): Promise<{ success: boolean; data?: unknown; error?: string; latency: number }> {
    const start = Date.now();
    const config = this.modelConfigs.get(decision.model);
    if (!config) return { success: false, error: `Model ${decision.model} not configured`, latency: 0 };

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: decision.model, messages: request.messages }),
      });
      const data = await response.json();
      return { success: response.ok, data, latency: Date.now() - start };
    } catch (err) {
      return { success: false, error: String(err), latency: Date.now() - start };
    }
  }
}
