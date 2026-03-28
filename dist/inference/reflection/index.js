/**
 * OpenOxygen - Reflection Engine
 *
 * Self-improvement through execution analysis and strategy refinement
 * Enables the system to learn from past executions and optimize future performance
 */
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("inference/reflection");
// ============================================================================
// Reflection Types
// ============================================================================
export export export export export export export export 
// ============================================================================
// Reflection Engine
// ============================================================================
export class ReflectionEngine {
    patterns = new Map();
    reflectionHistory = [];
    maxHistorySize = 100;
    constructor() {
        this.initializeDefaultPatterns();
        log.info("Reflection engine initialized");
    }
    /**
     * Analyze execution and generate insights
     */
    reflect(context) {
        log.info(`Starting reflection for execution ${context.executionId}`);
        const insights = [];
        const recommendations = [];
        const strategyAdjustments = [];
        // Apply all matching patterns
        for (const pattern of this.patterns.values()) {
            try {
                if (pattern.matcher(context)) {
                    const result = pattern.action(context);
                    insights.push(...result.insights);
                    recommendations.push(...result.recommendations);
                    strategyAdjustments.push(...result.strategyAdjustments);
                }
            }
            catch (error) {
                log.error(`Pattern ${pattern.id} failed:`, error);
            }
        }
        // Generate additional insights from metrics
        const metricInsights = this.analyzeMetrics(context.metrics);
        insights.push(...metricInsights);
        // Generate recommendations from insights
        const insightRecommendations = this.generateRecommendations(insights);
        recommendations.push(...insightRecommendations);
        const result = {
            insights,
            recommendations,
            strategyAdjustments,
            confidence, : .calculateConfidence(insights, context),
        };
        // Store in history
        this.addToHistory(result);
        log.info(`Reflection complete: ${insights.length} insights, ${recommendations.length} recommendations`);
        return result;
    }
    /**
     * Add custom reflection pattern
     */
    addPattern(pattern) {
        this.patterns.set(pattern.id, pattern);
        log.info(`Reflection pattern added: ${pattern.name}`);
    }
    /**
     * Remove reflection pattern
     */
    removePattern(id) {
        const existed = this.patterns.has(id);
        if (existed) {
            this.patterns.delete(id);
            log.info(`Reflection pattern removed: ${id}`);
        }
        return existed;
    }
    /**
     * Get reflection history
     */
    getHistory(limit) {
        const history = [...this.reflectionHistory];
        if (limit) {
            return history.slice(-limit);
        }
        return history;
    }
    /**
     * Clear reflection history
     */
    clearHistory() {
        this.reflectionHistory = [];
        log.info("Reflection history cleared");
    }
    /**
     * Get aggregated insights from history
     */
    getAggregatedInsights() {
        const aggregated = new Map();
        for (const result of this.reflectionHistory) {
            for (const insight of result.insights) {
                const key = `${insight.type}:${insight.description}`;
                aggregated.set(key, (aggregated.get(key) || 0) + 1);
            }
        }
        return aggregated;
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    initializeDefaultPatterns() {
        // Pattern Error Rate
        this.addPattern({
            id: "high-error-rate",
            name: "High Error Rate Detection",
            description: "Detects executions with high error rates",
            matcher, : .metrics.errors > 3 || ctx.metrics.errors / ctx.metrics.totalSteps > 0.3,
            action: (ctx) => ({
                insights: [
                    {
                        type: "error",
                        description: `High error rate detected: ${ctx.metrics.errors} errors in ${ctx.metrics.totalSteps} steps`,
                        severity: "high",
                        evidence, : .steps.filter((s) => s.type === "error").map((s) => s.content),
                    },
                ],
                recommendations: [
                    {
                        id: "rec-error-handling",
                        category: "workflow",
                        description: "Improve error handling and retry logic",
                        expectedImpact: "high",
                        implementation: "Add more robust error recovery mechanisms",
                    },
                ],
                strategyAdjustments: [
                    {
                        target: "maxRetries",
                        currentValue,
                        suggestedValue,
                        rationale: "High error rate suggests need for more retries",
                    },
                ],
                confidence, .8: ,
            }),
        });
        // Pattern Execution
        this.addPattern({
            id: "slow-execution",
            name: "Slow Execution Detection",
            description: "Detects unusually slow executions",
            matcher, : .metrics.totalDurationMs > 60000, // > 1 minute
            action: (ctx) => ({
                insights: [
                    {
                        type: "bottleneck",
                        description: `Slow execution detected: ${ctx.metrics.totalDurationMs}ms total`,
                        severity: "medium",
                        evidence: [`Average step duration: ${ctx.metrics.totalDurationMs / ctx.metrics.totalSteps}ms`],
                    },
                ],
                recommendations: [
                    {
                        id: "rec-optimization",
                        category: "tool",
                        description: "Optimize slow operations",
                        expectedImpact: "medium",
                        implementation: "Profile and optimize the slowest steps",
                    },
                ],
                strategyAdjustments: [
                    {
                        target: "timeoutMs",
                        currentValue,
                        suggestedValue, : .min(ctx.metrics.totalDurationMs * 1.5, 300000),
                        rationale: "Adjust timeout based on actual execution time",
                    },
                ],
                confidence, .7: ,
            }),
        });
        // Pattern Efficiency
        this.addPattern({
            id: "token-efficiency",
            name: "Token Usage Analysis",
            description: "Analyzes token usage efficiency",
            matcher, : .metrics.tokenUsage > 4000,
            action: (ctx) => ({
                insights: [
                    {
                        type: "optimization",
                        description: `High token usage: ${ctx.metrics.tokenUsage} tokens`,
                        severity: "medium",
                        evidence: [`Average per step: ${ctx.metrics.tokenUsage / ctx.metrics.totalSteps} tokens`],
                    },
                ],
                recommendations: [
                    {
                        id: "rec-prompt-optimization",
                        category: "prompt",
                        description: "Optimize prompts to reduce token usage",
                        expectedImpact: "medium",
                        implementation: "Use more concise prompts and reduce context",
                    },
                ],
                strategyAdjustments: [
                    {
                        target: "maxTokens",
                        currentValue,
                        suggestedValue,
                        rationale: "Reduce max tokens to encourage efficiency",
                    },
                ],
                confidence, .6: ,
            }),
        });
        // Pattern Pattern
        this.addPattern({
            id: "success-pattern",
            name: "Success Pattern Recognition",
            description: "Identifies patterns in successful executions",
            matcher, : .outcome === "success" && ctx.metrics.totalSteps < 10,
            action: (ctx) => ({
                insights: [
                    {
                        type: "pattern",
                        description: "Efficient execution pattern detected",
                        severity: "low",
                        evidence: [`Completed in ${ctx.metrics.totalSteps} steps`],
                    },
                ],
                recommendations: [
                    {
                        id: "rec-document-pattern",
                        category: "workflow",
                        description: "Document this efficient execution pattern",
                        expectedImpact: "low",
                        implementation: "Add to best practices documentation",
                    },
                ],
                strategyAdjustments: [],
                confidence, .9: ,
            }),
        });
    }
    analyzeMetrics(metrics) {
        const insights = [];
        // Check retry ratio
        const retryRatio = metrics.retries / metrics.totalSteps;
        if (retryRatio > 0.2) {
            insights.push({
                type: "pattern",
                description: `High retry ratio: ${(retryRatio * 100).toFixed(1)}%`,
                severity: "medium",
                evidence: [`${metrics.retries} retries in ${metrics.totalSteps} steps`],
            });
        }
        // Check API call efficiency
        const callsPerStep = metrics.apiCalls / metrics.totalSteps;
        if (callsPerStep > 2) {
            insights.push({
                type: "optimization",
                description: `High API call ratio: ${callsPerStep.toFixed(2)} calls per step`,
                severity: "low",
                evidence: [`${metrics.apiCalls} API calls total`],
            });
        }
        return insights;
    }
    generateRecommendations(insights) {
        const recommendations = [];
        for (const insight of insights) {
            if (insight.severity === "high") {
                recommendations.push({
                    id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    category: "workflow",
                    description: `Address high severity issue: ${insight.description}`,
                    expectedImpact: "high",
                    implementation: "Review and fix the identified issue",
                });
            }
        }
        return recommendations;
    }
    calculateConfidence(insights, context) {
        if (insights.length === 0)
            return 0.5;
        // Base confidence on data quality
        let confidence = 0.5;
        // More steps = more data = higher confidence
        confidence += Math.min(context.metrics.totalSteps / 20, 0.2);
        // Successful outcomes increase confidence
        if (context.outcome === "success")
            confidence += 0.1;
        // High severity insights reduce confidence (uncertainty)
        const highSeverityCount = insights.filter((i) => i.severity === "high").length;
        confidence -= highSeverityCount * 0.05;
        return Math.max(0, Math.min(1, confidence));
    }
    addToHistory(result) {
        this.reflectionHistory.push(result);
        // Trim history if too large
        if (this.reflectionHistory.length > this.maxHistorySize) {
            this.reflectionHistory = this.reflectionHistory.slice(-this.maxHistorySize);
        }
    }
}
// ============================================================================
// Singleton Export
// ============================================================================
export const reflectionEngine = new ReflectionEngine();
// Convenience functions
export function reflect(context) {
    return reflectionEngine.reflect(context);
}
export function addPattern(pattern) {
    reflectionEngine.addPattern(pattern);
}
export function getReflectionHistory(limit) {
    return reflectionEngine.getHistory(limit);
}
