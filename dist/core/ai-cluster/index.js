/**
 * OpenOxygen - AI Cluster
 *
 * Multi-model fusion and intelligent routing
 * Combines multiple LLM providers for optimal performance and reliability
 */
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("core/ai-cluster");
// ============================================================================
// AI Cluster Types
// ============================================================================
export export export export export export export export 
// ============================================================================
// AI Cluster Manager
// ============================================================================
export class AICluster {
    nodes = new Map();
    fusionStrategies = new Map();
    requestHistory = [];
    maxHistorySize = 1000;
    constructor() {
        this.initializeDefaultStrategies();
        log.info("AI Cluster initialized");
    }
    /**
     * Register a new model node
     */
    registerNode(node, , ClusterNode, , , , , , , , , ) { }
}
 > ;
{
    const fullNode = {
        ...node,
        status: "active",
        performance,
        lastUsed,
        errorCount,
        successCount,
    };
    this.nodes.set(fullNode.id, fullNode);
    log.info(`Node registered: ${fullNode.name} (${fullNode.id})`);
    return fullNode;
}
/**
 * Unregister a model node
 */
unregisterNode(nodeId);
{
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
getNode(nodeId) | undefined;
{
    return this.nodes.get(nodeId);
}
/**
 * List all nodes
 */
listNodes();
{
    return Array.from(this.nodes.values());
}
/**
 * Get active nodes
 */
getActiveNodes();
{
    return this.listNodes().filter((n) => n.status === "active");
}
/**
 * Update node status
 */
updateNodeStatus(nodeId, status["status"]);
{
    const node = this.nodes.get(nodeId);
    if (node) {
        node.status = status;
        log.info(`Node ${nodeId} status updated to ${status}`);
    }
}
/**
 * Update node performance metrics
 */
updateNodeMetrics(nodeId, metrics);
{
    const node = this.nodes.get(nodeId);
    if (node) {
        node.performance = {
            ...node.performance,
            ...metrics,
            lastUpdated, : .now(),
        };
    }
}
/**
 * Record node success
 */
recordSuccess(nodeId, latencyMs, tokensUsed);
{
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
recordError(nodeId, error);
{
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
routeRequest(request);
{
    const activeNodes = this.getActiveNodes();
    if (activeNodes.length === 0) {
        throw new Error("No active nodes available");
    }
    // Score each node
    const scoredNodes = activeNodes.map((node) => ({
        node,
        score, : .calculateNodeScore(node, request),
    }));
    // Sort by score (descending)
    scoredNodes.sort((a, b) => b.score - a.score);
    const bestNode = scoredNodes[0];
    const decision = {
        nodeId, : .node.id,
        reason: `Selected based on capability match and performance score ${bestNode.score.toFixed(2)}`,
        confidence, : .score,
        estimatedLatency, : .node.performance.avgLatencyMs,
        estimatedCost, : .estimateCost(bestNode.node, request),
    };
    this.addToHistory(decision);
    log.info(`Request routed to ${bestNode.node.name} (score: ${bestNode.score.toFixed(2)})`);
    return decision;
}
/**
 * Execute with fusion strategy
 */
async;
executeWithFusion(request, strategyId = "adaptive");
{
    const strategy = this.fusionStrategies.get(strategyId);
    if (!strategy) {
        throw new Error(`Fusion strategy '${strategyId}' not found`);
    }
    log.info(`Executing with fusion strategy: ${strategyId}`);
    switch (strategy.type) {
        case "single": this.executeSingle(request);
        case "ensemble": this.executeEnsemble(request, strategy.config);
        case "cascade": this.executeCascade(request, strategy.config);
        case "adaptive": this.executeAdaptive(request);
        default: new Error(`Unknown fusion strategy: ${strategy.type}`);
    }
}
/**
 * Add custom fusion strategy
 */
addFusionStrategy(id, strategy);
{
    this.fusionStrategies.set(id, strategy);
    log.info(`Fusion strategy added: ${id}`);
}
/**
 * Get routing statistics
 */
getRoutingStats();
{
    const total = this.requestHistory.length;
    const avgConfidence = total > 0
        ? this.requestHistory.reduce((sum, d) => sum + d.confidence, 0) / total
        :
    ;
    const distribution = new Map();
    for (const decision of this.requestHistory) {
        distribution.set(decision.nodeId, (distribution.get(decision.nodeId) || 0) + 1);
    }
    return {
        totalRequests,
        avgConfidence,
        nodeDistribution,
    };
}
initializeDefaultStrategies();
{
    this.fusionStrategies.set("single", {
        type: "single",
        config: {},
    });
    this.fusionStrategies.set("ensemble", {
        type: "ensemble",
        config,
    });
    this.fusionStrategies.set("cascade", {
        type: "cascade",
        config,
    });
    this.fusionStrategies.set("adaptive", {
        type: "adaptive",
        config,
    });
}
calculateNodeScore(node, request);
{
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
inferCapabilities(request)["type"][];
{
    const capabilities, [];
    "type";
    [] = ["text"];
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
estimateCost(node, request);
{
    const estimatedTokens = (request.maxTokens || 2048) + this.estimateInputTokens(request);
    return (estimatedTokens / 1000) * node.performance.costPer1KTokens;
}
estimateInputTokens(request);
{
    let tokens = 0;
    for (const message of request.messages || []) {
        tokens += Math.ceil((message.content?.length || 0) / 4);
    }
    return tokens;
}
async;
executeSingle(request);
{
    const decision = this.routeRequest(request);
    const node = this.nodes.get(decision.nodeId);
    const startTime = Date.now();
    // Note inference execution would happen here
    // For now, we return a placeholder result
    const result = {
        content: "",
        usage,
        model, : .model,
        finishReason: "stop",
    };
    const latencyMs = Date.now() - startTime;
    this.recordSuccess(node.id, latencyMs, result.usage.totalTokens);
    return {
        result,
        contributors: [node.id],
        confidence, : .confidence,
        strategy: "single",
        metadata,
    },
    ;
}
;
async;
executeEnsemble(request, config);
{
    const minNodes = (config.minNodes) || 2;
    const maxNodes = (config.maxNodes) || 3;
    const activeNodes = this.getActiveNodes();
    const selectedNodes = activeNodes.slice(0, Math.min(maxNodes, activeNodes.length));
    if (selectedNodes.length < minNodes) {
        throw new Error(`Not enough nodes for ensemble: ${selectedNodes.length} < ${minNodes}`);
    }
    // Execute on all selected nodes in parallel
    const results = await Promise.all(selectedNodes.map(async (node) => {
        try {
            const startTime = Date.now();
            // Placeholder for actual execution
            const result = {
                content: "",
                usage,
                model, : .model,
                finishReason: "stop",
            };
            const latencyMs = Date.now() - startTime;
            this.recordSuccess(node.id, latencyMs, result.usage.totalTokens);
            return {
                nodeId, : .id,
                success,
                latencyMs,
                tokensUsed, : .usage.totalTokens,
                result,
            };
        }
        catch (error) {
            this.recordError(node.id, String(error));
            return {
                nodeId, : .id,
                success,
                latencyMs,
                tokensUsed,
                error(error) { },
            };
        }
    }));
    // Aggregate results (simple voting for now)
    const successfulResults = results.filter((r) => r.success);
    const bestResult = successfulResults[0]?.result || {
        content: "",
        usage,
        model: "ensemble",
        finishReason: "stop",
    };
    const totalLatency = results.reduce((sum, r) => sum + r.latencyMs, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);
    return {
        result,
        contributors, : .map((n) => n.id),
        confidence, : .length / selectedNodes.length,
        strategy: "ensemble",
        metadata
    },
    ;
}
;
async;
executeCascade(request, config);
{
    const maxAttempts = (config.maxAttempts) || 3;
    const activeNodes = this.getActiveNodes();
    const nodeResults = [];
    let totalLatency = 0;
    let totalTokens = 0;
    for (let i = 0; i < Math.min(maxAttempts, activeNodes.length); i++) {
        const node = activeNodes[i];
        const startTime = Date.now();
        try {
            // Placeholder for actual execution
            const result = {
                content: "",
                usage,
                model, : .model,
                finishReason: "stop",
            };
            const latencyMs = Date.now() - startTime;
            this.recordSuccess(node.id, latencyMs, result.usage.totalTokens);
            nodeResults.push({
                nodeId, : .id,
                success,
                latencyMs,
                tokensUsed, : .usage.totalTokens,
            });
            totalLatency += latencyMs;
            totalTokens += result.usage.totalTokens;
            return {
                result,
                contributors, : .slice(0, i + 1).map((n) => n.id),
                confidence
            } - i * 0.1,
                strategy;
            "cascade",
                metadata,
            ;
        }
        finally { }
        ;
    }
    try { }
    catch (error) {
        const latencyMs = Date.now() - startTime;
        this.recordError(node.id, String(error));
        nodeResults.push({
            nodeId, : .id,
            success,
            latencyMs,
            tokensUsed,
            error(error) { },
        });
        totalLatency += latencyMs;
        // Continue to next node
        continue;
    }
}
// All attempts failed
throw new Error(`Cascade execution failed after ${maxAttempts} attempts`);
async;
executeAdaptive(request);
{
    // Analyze request complexity
    const complexity = this.estimateComplexity(request);
    if (complexity > 0.7) {
        // Complex request ensemble for better quality
        return this.executeEnsemble(request, { minNodes, maxNodes, votingMethod: "weighted" });
    }
    else if (complexity < 0.3) {
        // Simple request single node for efficiency
        return this.executeSingle(request);
    }
    else {
        // Medium complexity cascade for reliability
        return this.executeCascade(request, { maxAttempts, fallbackOnError });
    }
}
estimateComplexity(request);
{
    let complexity = 0.5;
    // Factor 1 length
    const totalLength = request.messages?.reduce((sum, m) => sum + (m.content?.length || 0), 0) || 0;
    complexity += Math.min(totalLength / 10000, 0.2);
    // Factor 2 of messages
    const messageCount = request.messages?.length || 0;
    complexity += Math.min(messageCount / 10, 0.1);
    // Factor 3 of complex keywords
    const complexKeywords = ["analyze", "compare", "evaluate", "synthesize", "reason"];
    const hasComplexKeywords = request.messages?.some((m) => complexKeywords.some((kw) => m.content?.toLowerCase().includes(kw)));
    if (hasComplexKeywords)
        complexity += 0.1;
    return Math.min(1, complexity);
}
addToHistory(decision);
{
    this.requestHistory.push(decision);
    if (this.requestHistory.length > this.maxHistorySize) {
        this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
}
// ============================================================================
// Singleton Export
// ============================================================================
export const aiCluster = new AICluster();
// Convenience functions
export function registerNode(node, , ClusterNode, , , , , , , , , ) { }
 > ;
{
    return aiCluster.registerNode(node);
}
export function routeRequest(request) {
    return aiCluster.routeRequest(request);
}
export function executeWithFusion(request, strategyId) {
    return aiCluster.executeWithFusion(request, strategyId);
}
export function getActiveNodes() {
    return aiCluster.getActiveNodes();
}
