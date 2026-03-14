/**
 * OpenOxygen — AI Thinking Cluster (26w11aE)
 *
 * 多模型协同推理集群
 *
 * 核心概念：
 * - ThoughtRouter: 将复杂任务分解为子任务，路由到不同模型
 * - ConsensusEngine: 多模型结果投票融合
 * - ReflectionLoop: 反思迭代优化
 * - KnowledgeFusion: 跨模型知识整合
 *
 * 目标：比单模型推理更准确、更鲁棒、更透明
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type { InferenceEngine, ChatMessage, InferenceResponse } from "../../inference/engine/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { computeStack } from "../async/index.js";

const log = createSubsystemLogger("ai-cluster");

// ═══════════════════════════════════════════════════════════════════════════
// Core Types
// ═══════════════════════════════════════════════════════════════════════════

export type ThinkingNode = {
  id: string;
  model: string;
  role: "reasoner" | "critic" | "synthesizer" | "verifier";
  input: string;
  output: string;
  confidence: number;
  timestamp: number;
  latency: number;
};

export type ThinkingGraph = {
  id: string;
  goal: string;
  nodes: ThinkingNode[];
  consensus?: string;
  finalAnswer?: string;
  iterations: number;
  totalLatency: number;
};

export type ConsensusStrategy = 
  | "majority"      // 多数投票
  | "weighted"      // 加权投票（按模型能力）
  | "best"          // 选择置信度最高的
  | "merge";        // 合并所有答案

// ═══════════════════════════════════════════════════════════════════════════
// Thought Router
// ═══════════════════════════════════════════════════════════════════════════

export class ThoughtRouter {
  private models: string[];

  constructor(models: string[]) {
    this.models = models;
  }

  /**
   * 分析任务复杂度，决定路由策略
   */
  analyzeComplexity(task: string): {
    strategy: "single" | "parallel" | "iterative";
    roles: Array<"reasoner" | "critic" | "synthesizer">;
    estimatedSteps: number;
  } {
    const lower = task.toLowerCase();
    
    // 简单任务：单模型
    if (task.length < 100 && !/分析|规划|比较|评估/.test(lower)) {
      return { strategy: "single", roles: ["reasoner"], estimatedSteps: 1 };
    }
    
    // 中等复杂度：并行推理 + 综合
    if (task.length < 500 && !/详细|全面|深度/.test(lower)) {
      return { 
        strategy: "parallel", 
        roles: ["reasoner", "reasoner", "synthesizer"],
        estimatedSteps: 2 
      };
    }
    
    // 复杂任务：迭代反思
    return { 
      strategy: "iterative", 
      roles: ["reasoner", "critic", "synthesizer", "verifier"],
      estimatedSteps: 3 
    };
  }

  /**
   * 为子任务选择最优模型
   */
  selectModelForRole(role: string, availableModels: string[]): string {
    // 启发式选择
    const modelScores = availableModels.map(m => {
      let score = 0;
      if (m.includes("gpt-oss:20b")) score += role === "reasoner" ? 3 : 2;
      if (m.includes("qwen3-vl")) score += role === "verifier" ? 2 : 1;
      if (m.includes("qwen3:4b")) score += role === "critic" ? 2 : 1;
      return { model: m, score };
    });

    modelScores.sort((a, b) => b.score - a.score);
    return modelScores[0]?.model || availableModels[0]!;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Consensus Engine
// ═══════════════════════════════════════════════════════════════════════════

export class ConsensusEngine {
  private strategy: ConsensusStrategy;

  constructor(strategy: ConsensusStrategy = "weighted") {
    this.strategy = strategy;
  }

  /**
   * 对多模型输出达成共识
   */
  reachConsensus(nodes: ThinkingNode[]): {
    answer: string;
    confidence: number;
    dissent?: string[];
  } {
    switch (this.strategy) {
      case "majority":
        return this.majorityVote(nodes);
      case "weighted":
        return this.weightedVote(nodes);
      case "best":
        return this.bestAnswer(nodes);
      case "merge":
        return this.mergeAnswers(nodes);
      default:
        return this.weightedVote(nodes);
    }
  }

  private majorityVote(nodes: ThinkingNode[]) {
    const answers = nodes.map(n => n.output.trim().toLowerCase());
    const counts = new Map<string, number>();
    
    for (const ans of answers) {
      counts.set(ans, (counts.get(ans) || 0) + 1);
    }

    let best = "";
    let bestCount = 0;
    for (const [ans, count] of counts) {
      if (count > bestCount) {
        best = ans;
        bestCount = count;
      }
    }

    const confidence = bestCount / nodes.length;
    const dissent = nodes.filter(n => n.output.trim().toLowerCase() !== best).map(n => n.output);

    return { answer: best, confidence, dissent: dissent.length > 0 ? dissent : undefined };
  }

  private weightedVote(nodes: ThinkingNode[]) {
    // 按置信度加权
    const weights = new Map<string, number>();
    
    for (const node of nodes) {
      const key = node.output.trim();
      const current = weights.get(key) || 0;
      weights.set(key, current + node.confidence);
    }

    let best = "";
    let bestWeight = 0;
    let totalWeight = 0;

    for (const [ans, weight] of weights) {
      totalWeight += weight;
      if (weight > bestWeight) {
        best = ans;
        bestWeight = weight;
      }
    }

    return { answer: best, confidence: bestWeight / totalWeight };
  }

  private bestAnswer(nodes: ThinkingNode[]) {
    const best = nodes.reduce((max, node) => 
      node.confidence > max.confidence ? node : max
    );
    return { answer: best.output, confidence: best.confidence };
  }

  private mergeAnswers(nodes: ThinkingNode[]) {
    // 使用综合模型合并答案
    const merged = nodes.map(n => `[${n.model}]: ${n.output}`).join("\n\n");
    return { answer: merged, confidence: 0.8 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Reflection Loop
// ═══════════════════════════════════════════════════════════════════════════

export class ReflectionLoop {
  private maxIterations: number;
  private improvementThreshold: number;

  constructor(maxIterations = 3, improvementThreshold = 0.1) {
    this.maxIterations = maxIterations;
    this.improvementThreshold = improvementThreshold;
  }

  /**
   * 迭代反思优化
   */
  async iterate(
    initialAnswer: string,
    criticFn: (answer: string) => Promise<{ critique: string; score: number }>,
    improveFn: (answer: string, critique: string) => Promise<string>
  ): Promise<{
    finalAnswer: string;
    iterations: number;
    improvement: number;
    history: Array<{ answer: string; score: number }>;
  }> {
    let current = initialAnswer;
    let currentScore = 0.5;
    const history: Array<{ answer: string; score: number }> = [];

    for (let i = 0; i < this.maxIterations; i++) {
      const { critique, score } = await criticFn(current);
      history.push({ answer: current, score });

      const improvement = score - currentScore;
      if (improvement < this.improvementThreshold && i > 0) {
        log.debug(`Reflection converged after ${i + 1} iterations`);
        break;
      }

      currentScore = score;
      current = await improveFn(current, critique);
    }

    return {
      finalAnswer: current,
      iterations: history.length,
      improvement: currentScore - history[0]!.score,
      history,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI Thinking Cluster (Main Export)
// ═══════════════════════════════════════════════════════════════════════════

export class AIThinkingCluster {
  private inferenceEngine: InferenceEngine;
  private router: ThoughtRouter;
  private consensus: ConsensusEngine;
  private reflection: ReflectionLoop;

  constructor(
    inferenceEngine: InferenceEngine,
    options?: {
      consensusStrategy?: ConsensusStrategy;
      maxReflectionIterations?: number;
    }
  ) {
    this.inferenceEngine = inferenceEngine;
    this.router = new ThoughtRouter(inferenceEngine.getAvailableProviders());
    this.consensus = new ConsensusEngine(options?.consensusStrategy);
    this.reflection = new ReflectionLoop(options?.maxReflectionIterations);
  }

  /**
   * 执行集群推理
   */
  async think(goal: string, context?: string): Promise<ThinkingGraph> {
    const startTime = nowMs();
    const graph: ThinkingGraph = {
      id: generateId("think"),
      goal,
      nodes: [],
      iterations: 0,
      totalLatency: 0,
    };

    // 1. 分析任务复杂度
    const analysis = this.router.analyzeComplexity(goal);
    log.info(`Thinking strategy: ${analysis.strategy}, steps: ${analysis.estimatedSteps}`);

    // 2. 根据策略执行
    if (analysis.strategy === "single") {
      // 简单任务：单模型
      const model = this.router.selectModelForRole("reasoner", this.inferenceEngine.getAvailableProviders());
      const node = await this.executeNode(goal, model, "reasoner");
      graph.nodes.push(node);
      graph.finalAnswer = node.output;
    } else if (analysis.strategy === "parallel") {
      // 并行推理 + 综合
      const models = analysis.roles.map(r => 
        this.router.selectModelForRole(r, this.inferenceEngine.getAvailableProviders())
      );

      const nodes = await Promise.all(
        models.map((m, i) => this.executeNode(goal, m, analysis.roles[i]!))
      );
      graph.nodes.push(...nodes);

      // 达成共识
      const consensus = this.consensus.reachConsensus(nodes);
      graph.consensus = consensus.answer;
      graph.finalAnswer = consensus.answer;
    } else {
      // 迭代反思
      const model = this.router.selectModelForRole("reasoner", this.inferenceEngine.getAvailableProviders());
      const initial = await this.executeNode(goal, model, "reasoner");
      graph.nodes.push(initial);

      // 反思优化
      const reflection = await this.reflection.iterate(
        initial.output,
        async (answer) => {
          const critique = await this.executeNode(
            `Critique this answer: "${answer}"`,
            this.router.selectModelForRole("critic", this.inferenceEngine.getAvailableProviders()),
            "critic"
          );
          return { critique: critique.output, score: critique.confidence };
        },
        async (answer, critique) => {
          const improved = await this.executeNode(
            `Improve this answer based on critique:\nAnswer: ${answer}\nCritique: ${critique}`,
            this.router.selectModelForRole("synthesizer", this.inferenceEngine.getAvailableProviders()),
            "synthesizer"
          );
          return improved.output;
        }
      );

      graph.finalAnswer = reflection.finalAnswer;
      graph.iterations = reflection.iterations;
    }

    graph.totalLatency = nowMs() - startTime;
    log.info(`Thinking complete: ${graph.nodes.length} nodes, ${graph.totalLatency}ms`);

    return graph;
  }

  private async executeNode(
    input: string,
    model: string,
    role: ThinkingNode["role"]
  ): Promise<ThinkingNode> {
    const startTime = nowMs();

    const response = await this.inferenceEngine.infer({
      messages: [{ role: "user", content: input }],
      model: { provider: "ollama", model },
    });

    return {
      id: generateId("node"),
      model,
      role,
      input,
      output: response.content,
      confidence: response.usage ? response.usage.totalTokens / 100 : 0.5,
      timestamp: nowMs(),
      latency: nowMs() - startTime,
    };
  }
}
