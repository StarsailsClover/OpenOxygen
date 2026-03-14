/**
 * OpenOxygen — Model Router with Pool Integration (26w11aE_P2)
 *
 * 整合 ModelProcessPool 的动态路由
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type { ModelConfig, InferenceMode } from "../../types/index.js";
import type { ChatMessage } from "../engine/index.js";
import { ModelProcessPool, ModelRequest } from "../pool/index.js";

const log = createSubsystemLogger("inference/router-pool");

export interface RoutingDecision {
  model: string;
  provider: string;
  reason: string;
  confidence: number;
  estimatedLatency: number;
}

export class PoolIntegratedRouter {
  private pool: ModelProcessPool;
  private modelConfigs: Map<string, ModelConfig>;

  constructor(pool: ModelProcessPool, configs: ModelConfig[]) {
    this.pool = pool;
    this.modelConfigs = new Map(configs.map(c => [c.model, c]));
  }

  /**
   * 路由决策
   */
  decide(params: {
    instruction: string;
    messages: ChatMessage[];
    mode?: InferenceMode;
    needsVision?: boolean;
    preferredModel?: string;
  }): RoutingDecision {
    const { instruction, mode, needsVision, preferredModel } = params;

    // 1. 优先使用用户指定的模型
    if (preferredModel && this.modelConfigs.has(preferredModel)) {
      return {
        model: preferredModel,
        provider: this.modelConfigs.get(preferredModel)!.provider,
        reason: "User preferred model",
        confidence: 1.0,
        estimatedLatency: this.estimateLatency(preferredModel),
      };
    }

    // 2. Vision 任务 → qwen3-vl
    if (needsVision) {
      const visionModel = Array.from(this.modelConfigs.keys()).find(m => m.includes("vl"));
      if (visionModel) {
        return {
          model: visionModel,
          provider: this.modelConfigs.get(visionModel)!.provider,
          reason: "Vision task requires VL model",
          confidence: 0.95,
          estimatedLatency: this.estimateLatency(visionModel),
        };
      }
    }

    // 3. 模式驱动的路由
    if (mode === "deep") {
      const deepModel = Array.from(this.modelConfigs.keys()).find(m => 
        m.includes("20b") || m.includes("70b")
      );
      if (deepModel) {
        return {
          model: deepModel,
          provider: this.modelConfigs.get(deepModel)!.provider,
          reason: "Deep mode selected for complex reasoning",
          confidence: 0.9,
          estimatedLatency: this.estimateLatency(deepModel),
        };
      }
    }

    if (mode === "fast") {
      const fastModel = Array.from(this.modelConfigs.keys()).find(m => 
        m.includes("4b") && !m.includes("vl")
      );
      if (fastModel) {
        return {
          model: fastModel,
          provider: this.modelConfigs.get(fastModel)!.provider,
          reason: "Fast mode selected for quick response",
          confidence: 0.9,
          estimatedLatency: this.estimateLatency(fastModel),
        };
      }
    }

    // 4. 基于指令复杂度的启发式路由
    const complexity = this.assessComplexity(instruction);
    
    if (complexity > 0.7) {
      // 复杂任务 → 大模型
      const largeModel = Array.from(this.modelConfigs.keys()).find(m => m.includes("20b"));
      if (largeModel) {
        return {
          model: largeModel,
          provider: this.modelConfigs.get(largeModel)!.provider,
          reason: `High complexity (${complexity.toFixed(2)}) requires large model`,
          confidence: 0.85,
          estimatedLatency: this.estimateLatency(largeModel),
        };
      }
    }

    // 5. 默认 → qwen3:4b
    const defaultModel = Array.from(this.modelConfigs.keys()).find(m => m === "qwen3:4b") 
      || Array.from(this.modelConfigs.keys())[0]!;

    return {
      model: defaultModel,
      provider: this.modelConfigs.get(defaultModel)!.provider,
      reason: "Default model for general tasks",
      confidence: 0.7,
      estimatedLatency: this.estimateLatency(defaultModel),
    };
  }

  /**
   * 执行推理
   */
  async infer(decision: RoutingDecision, request: ModelRequest): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    latency: number;
  }> {
    const start = Date.now();

    // 确保模型已启动
    await this.pool.startModel(decision.model);

    // 执行推理
    const result = await this.pool.infer(decision.model, request);

    return {
      ...result,
      latency: Date.now() - start,
    };
  }

  private assessComplexity(instruction: string): number {
    let score = 0.5;
    const lower = instruction.toLowerCase();

    // 长度因子
    if (instruction.length > 200) score += 0.1;
    if (instruction.length > 500) score += 0.1;

    // 关键词因子
    const complexKeywords = ["分析", "规划", "优化", "详细", "全面", "深度", "比较", "评估"];
    for (const kw of complexKeywords) {
      if (lower.includes(kw)) score += 0.05;
    }

    // 多步骤指示
    if (/步骤|step|first|then|finally/.test(lower)) score += 0.1;

    return Math.min(score, 1.0);
  }

  private estimateLatency(model: string): number {
    // 基于模型的预估延迟
    if (model.includes("70b")) return 5000;
    if (model.includes("20b")) return 2000;
    if (model.includes("7b")) return 800;
    if (model.includes("4b")) return 300;
    return 500;
  }
}
