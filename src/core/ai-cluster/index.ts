/**
 * OpenOxygen - AI Cluster
 *
 * Multi-model fusion and intelligent routing
 * Combines multiple LLM providers for optimal performance and reliability
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type { InferenceRequest, InferenceResult, ModelConfig } from "../../types/index.js";

const log = createSubsystemLogger("core/ai-cluster");

// ============================================================================
// AI Cluster Types
// ============================================================================

export interface ClusterNode {
  id: string;
  name: string;
  provider: string;
  model: string;
  config: ModelConfig;
  status: "active" | "degraded" | "offline";
  capabilities: ModelCapability[];
  performance: PerformanceMetrics;
  lastUsed: number;
  errorCount: number;
  successCount: number;
}

export interface ModelCapability {
  type: "text" | "vision" | "code" | "reasoning" | "multilingual" | "embedding";
  score: number; // 0-1
}

export interface PerformanceMetrics {
  avgLatencyMs: number;
  avgTokensPerSecond: number;
  successRate: number;
  costPer1KTokens: number;
  lastUpdated: number;
}

export interface FusionStrategy {
  type: "single" | "ensemble" | "cascade" | "adaptive";
  config: Record<string, unknown>;
}

export interface FusionResult {
  result: InferenceResult;
  contributors: string[];
  confidence: number;
  strategy: string;
  metadata: FusionMetadata;
}

export interface FusionMetadata {
  totalLatencyMs: number;
  totalCost: number;
  tokenUsage: number;
  nodeResults: NodeResult[];
}

export interface NodeResult {
  nodeId: string;
  success: boolean;
  latencyMs: number;
  tokensUsed: number;
  error?: string;
}

export interface RoutingDecision {
  nodeId: string;
  reason: string;
  confidence: number;
  estimatedLatency: number;
  estimatedCost: number;
}

// ============================================================================
// AI Cluster Manager
// ============================================================================

export class AICluster {
  private nodes: Map<string, ClusterNode> = new Map();
  private fusionStrategies: Map<string, FusionStrategy> = new Map();
  private requestHistory: RoutingDecision[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.initializeDefaultStrategies();
    log.info("AI Cluster initialized");
  }

  /**
   * Register a new model node
   */
  registerNode(node: Omit<ClusterNode, "status" | "performance" | "lastUsed" | "errorCount" | "successCount">): ClusterNode {
    const fullNode: ClusterNode = {
      ...node,
      status: "active",
      performance: {
        avgLatencyMs: 0,
        avgTokensPerSecond: 0,
        successRate: 1,
        costPer1KTokens: 0,
        lastUpdated: Date.now(),
      },
      lastUsed: 0,
      errorCount: 0,
      successCount: 0,
    };

    this.nodes.set(fullNode.id, fullNode);
    log.info(`Node registered: ${fullNode.name} (${fullNode.id})`);

    return fullNode;
  }

  /**
   * Unregister a model node
   */
  unregisterNode(nodeId: string): boolean {
    const existed = this.nodes.has(nodeId);
    if (existed) {
      this.nodes.delete(nodeId);
      log.info(`Node unregistered: ${nodeId}`);
    }
    return existed;
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): ClusterNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * List all nodes
   */
  listNodes(): ClusterNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get active nodes
   */
  getActiveNodes(): ClusterNode[] {
    return this.listNodes().filter((n) => n.status === "active");
  }

  /**
   * Update node status
   */
  updateNodeStatus(nodeId: string, status: ClusterNode["status"]): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = status;
      log.info(`Node ${nodeId} status updated to ${status}`);
    }
  }

  /**
   * Update node performance metrics
   */
  updateNodeMetrics(nodeId: string, metrics: Partial<PerformanceMetrics>): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.performance = {
        ...node.performance,
        ...metrics,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Record node success
   */
  recordSuccess(nodeId: string, latencyMs: number, tokensUsed: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.successCount++;
      node.lastUsed = Date.now();

      // Update rolling average latency
      const alpha = 0.1; // Smoothing factor
      node.performance.avgLatencyMs =
        (1 - alpha) * node.performance.avgLatencyMs + alpha * latencyMs;

      // Update success rate
      const total = node.successCount + node.errorCount;
      node.performance.successRate = node.successCount / total;

      log.debug(`Node ${nodeId} success recorded: ${latencyMs}ms, ${tokensUsed} tokens`);
    }
  }

  /**
   * Record node error
   */
  recordError(nodeId: string, error: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.errorCount++;
      node.lastUsed = Date.now();

      // Update success rate
      const total = node.successCount + node.errorCount;
      node.performance.successRate = node.successCount / total;

      // Degrade status if too many errors
      if (node.errorCount > 5 && node.performance.successRate < 0.8) {
        node.status = "degraded";
        log.warn(`Node ${nodeId} degraded due to high error rate`);
      }

      log.error(`Node ${nodeId} error recorded: ${error}`);
    }
  }

  /**
   * Route request to best node
   */
  routeRequest(request: InferenceRequest): RoutingDecision {
    const activeNodes = this.getActiveNodes();

    if (activeNodes.length === 0) {
      throw new Error("No active nodes available");
    }

    // Score each node
    const scoredNodes = activeNodes.map((node) => ({
      node,
      score: this.calculateNodeScore(node, request),
    }));

    // Sort by score (descending)
    scoredNodes.sort((a, b) => b.score - a.score);

    const bestNode = scoredNodes[0];

    const decision: RoutingDecision = {
      nodeId: bestNode.node.id,
      reason: `Selected based on capability match and performance score ${bestNode.score.toFixed(2)}`,
      confidence: bestNode.score,
      estimatedLatency: bestNode.node.performance.avgLatencyMs,
      estimatedCost: this.estimateCost(bestNode.node, request),
    };

    this.addToHistory(decision);
    log.info(`Request routed to ${bestNode.node.name} (score: ${bestNode.score.toFixed(2)})`);

    return decision;
  }

  /**
   * Execute with fusion strategy
   */
  async executeWithFusion(
    request: InferenceRequest,
    strategyId: string = "adaptive",
  ): Promise<FusionResult> {
    const strategy = this.fusionStrategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Fusion strategy '${strategyId}' not found`);
    }

    log.info(`Executing with fusion strategy: ${strategyId}`);

    switch (strategy.type) {
      case "single":
        return this.executeSingle(request);
      case "ensemble":
        return this.executeEnsemble(request, strategy.config);
      case "cascade":
        return this.executeCascade(request, strategy.config);
      case "adaptive":
        return this.executeAdaptive(request);
      default:
        throw new Error(`Unknown fusion strategy: ${strategy.type}`);
    }
  }

  /**
   * Add custom fusion strategy
   */
  addFusionStrategy(id: string, strategy: FusionStrategy): void {
    this.fusionStrategies.set(id, strategy);
    log.info(`Fusion strategy added: ${id}`);
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalRequests: number;
    avgConfidence: number;
    nodeDistribution: Map<string, number>;
  } {
    const total = this.requestHistory.length;
    const avgConfidence =
      total > 0
        ? this.requestHistory.reduce((sum, d) => sum + d.confidence, 0) / total
        : 0;

    const distribution = new Map<string, number>();
    for (const decision of this.requestHistory) {
      distribution.set(decision.nodeId, (distribution.get(decision.nodeId) || 0) + 1);
    }

    return {
      totalRequests: total,
      avgConfidence,
      nodeDistribution: distribution,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeDefaultStrategies(): void {
    this.fusionStrategies.set("single", {
      type: "single",
      config: {},
    });

    this.fusionStrategies.set("ensemble", {
      type: "ensemble",
      config: { minNodes: 2, maxNodes: 3, votingMethod: "weighted" },
    });

    this.fusionStrategies.set("cascade", {
      type: "cascade",
      config: { maxAttempts: 3, fallbackOnError: true },
    });

    this.fusionStrategies.set("adaptive", {
      type: "adaptive",
      config: { complexityThreshold: 0.7 },
    });
  }

  private calculateNodeScore(node: ClusterNode, request: InferenceRequest): number {
    let score = 0;

    // Capability match
    const requiredCapabilities = this.inferCapabilities(request);
    for (const required of requiredCapabilities) {
      const capability = node.capabilities.find((c) => c.type === required);
      if (capability) {
        score += capability.score * 0.3;
      }
    }

    // Performance score
    score += node.performance.successRate * 0.3;
    score += Math.max(0, 1 - node.performance.avgLatencyMs / 10000) * 0.2;

    // Recency bonus (prefer recently used nodes for cache warmth)
    const hoursSinceUse = (Date.now() - node.lastUsed) / 3600000;
    score += Math.max(0, 0.1 - hoursSinceUse * 0.01);

    // Error penalty
    score -= node.errorCount * 0.05;

    return Math.max(0, Math.min(1, score));
  }

  private inferCapabilities(request: InferenceRequest): ModelCapability["type"][] {
    const capabilities: ModelCapability["type"][] = ["text"];

    if (request.messages?.some((m) => m.content?.includes("image"))) {
      capabilities.push("vision");
    }

    if (request.messages?.some((m) => m.content?.includes("code"))) {
      capabilities.push("code");
    }

    if (request.messages?.some((m) => m.content?.includes("think") || m.content?.includes("reason"))) {
      capabilities.push("reasoning");
    }

    return capabilities;
  }

  private estimateCost(node: ClusterNode, request: InferenceRequest): number {
    const estimatedTokens = (request.maxTokens || 2048) + this.estimateInputTokens(request);
    return (estimatedTokens / 1000) * node.performance.costPer1KTokens;
  }

  private estimateInputTokens(request: InferenceRequest): number {
    let tokens = 0;
    for (const message of request.messages || []) {
      tokens += Math.ceil((message.content?.length || 0) / 4);
    }
    return tokens;
  }

  private async executeSingle(request: InferenceRequest): Promise<FusionResult> {
    const decision = this.routeRequest(request);
    const node = this.nodes.get(decision.nodeId)!;

    const startTime = Date.now();
    // Note: Actual inference execution would happen here
    // For now, we return a placeholder result
    const result: InferenceResult = {
      content: "",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: node.model,
      finishReason: "stop",
    };

    const latencyMs = Date.now() - startTime;
    this.recordSuccess(node.id, latencyMs, result.usage.totalTokens);

    return {
      result,
      contributors: [node.id],
      confidence: decision.confidence,
      strategy: "single",
      metadata: {
        totalLatencyMs: latencyMs,
        totalCost: this.estimateCost(node, request),
        tokenUsage: result.usage.totalTokens,
        nodeResults: [
          {
            nodeId: node.id,
            success: true,
            latencyMs,
            tokensUsed: result.usage.totalTokens,
          },
        ],
      },
    };
  }

  private async executeEnsemble(
    request: InferenceRequest,
    config: Record<string, unknown>,
  ): Promise<FusionResult> {
    const minNodes = (config.minNodes as number) || 2;
    const maxNodes = (config.maxNodes as number) || 3;

    const activeNodes = this.getActiveNodes();
    const selectedNodes = activeNodes.slice(0, Math.min(maxNodes, activeNodes.length));

    if (selectedNodes.length < minNodes) {
      throw new Error(`Not enough nodes for ensemble: ${selectedNodes.length} < ${minNodes}`);
    }

    // Execute on all selected nodes in parallel
    const results = await Promise.all(
      selectedNodes.map(async (node) => {
        try {
          const startTime = Date.now();
          // Placeholder for actual execution
          const result: InferenceResult = {
            content: "",
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            model: node.model,
            finishReason: "stop",
          };
          const latencyMs = Date.now() - startTime;
          this.recordSuccess(node.id, latencyMs, result.usage.totalTokens);

          return {
            nodeId: node.id,
            success: true,
            latencyMs,
            tokensUsed: result.usage.totalTokens,
            result,
          };
        } catch (error) {
          this.recordError(node.id, String(error));
          return {
            nodeId: node.id,
            success: false,
            latencyMs: 0,
            tokensUsed: 0,
            error: String(error),
          };
        }
      }),
    );

    // Aggregate results (simple voting for now)
    const successfulResults = results.filter((r) => r.success);
    const bestResult = successfulResults[0]?.result || {
      content: "",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: "ensemble",
      finishReason: "stop",
    };

    const totalLatency = results.reduce((sum, r) => sum + r.latencyMs, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);

    return {
      result: bestResult,
      contributors: selectedNodes.map((n) => n.id),
      confidence: successfulResults.length / selectedNodes.length,
      strategy: "ensemble",
      metadata: {
        totalLatencyMs: totalLatency,
        totalCost: selectedNodes.reduce((sum, n) => sum + this.estimateCost(n, request), 0),
        tokenUsage: totalTokens,
        nodeResults: results.map((r) => ({
          nodeId: r.nodeId,
          success: r.success,
          latencyMs: r.latencyMs,
          tokensUsed: r.tokensUsed,
          error: r.error,
        })),
      },
    };
  }

  private async executeCascade(
    request: InferenceRequest,
    config: Record<string, unknown>,
  ): Promise<FusionResult> {
    const maxAttempts = (config.maxAttempts as number) || 3;
    const activeNodes = this.getActiveNodes();

    const nodeResults: NodeResult[] = [];
    let totalLatency = 0;
    let totalTokens = 0;

    for (let i = 0; i < Math.min(maxAttempts, activeNodes.length); i++) {
      const node = activeNodes[i];
      const startTime = Date.now();

      try {
        // Placeholder for actual execution
        const result: InferenceResult = {
          content: "",
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          model: node.model,
          finishReason: "stop",
        };

        const latencyMs = Date.now() - startTime;
        this.recordSuccess(node.id, latencyMs, result.usage.totalTokens);

        nodeResults.push({
          nodeId: node.id,
          success: true,
          latencyMs,
          tokensUsed: result.usage.totalTokens,
        });

        totalLatency += latencyMs;
        totalTokens += result.usage.totalTokens;

        return {
          result,
          contributors: activeNodes.slice(0, i + 1).map((n) => n.id),
          confidence: 1 - i * 0.1,
          strategy: "cascade",
          metadata: {
            totalLatencyMs: totalLatency,
            totalCost: activeNodes
              .slice(0, i + 1)
              .reduce((sum, n) => sum + this.estimateCost(n, request), 0),
            tokenUsage: totalTokens,
            nodeResults,
          },
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        this.recordError(node.id, String(error));

        nodeResults.push({
          nodeId: node.id,
          success: false,
          latencyMs,
          tokensUsed: 0,
          error: String(error),
        });

        totalLatency += latencyMs;

        // Continue to next node
        continue;
      }
    }

    // All attempts failed
    throw new Error(`Cascade execution failed after ${maxAttempts} attempts`);
  }

  private async executeAdaptive(request: InferenceRequest): Promise<FusionResult> {
    // Analyze request complexity
    const complexity = this.estimateComplexity(request);

    if (complexity > 0.7) {
      // Complex request: use ensemble for better quality
      return this.executeEnsemble(request, { minNodes: 2, maxNodes: 3, votingMethod: "weighted" });
    } else if (complexity < 0.3) {
      // Simple request: use single node for efficiency
      return this.executeSingle(request);
    } else {
      // Medium complexity: use cascade for reliability
      return this.executeCascade(request, { maxAttempts: 2, fallbackOnError: true });
    }
  }

  private estimateComplexity(request: InferenceRequest): number {
    let complexity = 0.5;

    // Factor 1: Message length
    const totalLength = request.messages?.reduce((sum, m) => sum + (m.content?.length || 0), 0) || 0;
    complexity += Math.min(totalLength / 10000, 0.2);

    // Factor 2: Number of messages
    const messageCount = request.messages?.length || 0;
    complexity += Math.min(messageCount / 10, 0.1);

    // Factor 3: Presence of complex keywords
    const complexKeywords = ["analyze", "compare", "evaluate", "synthesize", "reason"];
    const hasComplexKeywords = request.messages?.some((m) =>
      complexKeywords.some((kw) => m.content?.toLowerCase().includes(kw)),
    );
    if (hasComplexKeywords) complexity += 0.1;

    return Math.min(1, complexity);
  }

  private addToHistory(decision: RoutingDecision): void {
    this.requestHistory.push(decision);
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const aiCluster = new AICluster();

// Convenience functions
export function registerNode(node: Omit<ClusterNode, "status" | "performance" | "lastUsed" | "errorCount" | "successCount">): ClusterNode {
  return aiCluster.registerNode(node);
}

export function routeRequest(request: InferenceRequest): RoutingDecision {
  return aiCluster.routeRequest(request);
}

export function executeWithFusion(
  request: InferenceRequest,
  strategyId?: string,
): Promise<FusionResult> {
  return aiCluster.executeWithFusion(request, strategyId);
}

export function getActiveNodes(): ClusterNode[] {
  return aiCluster.getActiveNodes();
}
