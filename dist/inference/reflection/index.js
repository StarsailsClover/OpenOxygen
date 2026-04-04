/**
 * OpenOxygen - Reflection Engine
 *
 * Self-improvement through execution analysis and strategy refinement
 * Enables the system to learn from past executions and optimize future performance
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { GlobalMemory } from "../../memory/global/index.js";
const log = createSubsystemLogger("inference/reflection");
// ============================================================================
// Reflection Engine
// ============================================================================
export class ReflectionEngine {
    inferenceEngine;
    memory;
    entries = [];
    constructor(inferenceEngine) {
        this.inferenceEngine = inferenceEngine;
        this.memory = new GlobalMemory();
        log.info("ReflectionEngine initialized");
    }
    /**
     * Analyze execution and generate reflections
     */
    async reflect(context) {
        log.info(`Reflecting on execution: ${context.executionId}`);
        const startTime = nowMs();
        // Generate insights
        const insights = await this.generateInsights(context);
        // Generate recommendations
        const recommendations = await this.generateRecommendations(context, insights);
        // Generate strategy adjustments
        const strategyAdjustments = await this.generateStrategyAdjustments(context, insights);
        // Calculate confidence
        const confidence = this.calculateConfidence(context, insights);
        const result = {
            insights,
            recommendations,
            strategyAdjustments,
            confidence,
        };
        // Store reflection
        const entry = {
            id: generateId("refl"),
            timestamp: nowMs(),
            context,
            result,
            applied: false,
        };
        this.entries.push(entry);
        await this.persistReflection(entry);
        log.info(`Reflection complete: ${insights.length} insights, ${recommendations.length} recommendations (${nowMs() - startTime}ms)`);
        return result;
    }
    /**
     * Generate insights from execution context
     */
    async generateInsights(context) {
        const insights = [];
        // Analyze patterns
        const patternInsights = this.analyzePatterns(context);
        insights.push(...patternInsights);
        // Identify bottlenecks
        const bottleneckInsights = this.identifyBottlenecks(context);
        insights.push(...bottleneckInsights);
        // Analyze errors
        const errorInsights = this.analyzeErrors(context);
        insights.push(...errorInsights);
        // Find optimizations
        const optimizationInsights = await this.findOptimizations(context);
        insights.push(...optimizationInsights);
        return insights;
    }
    /**
     * Analyze execution patterns
     */
    analyzePatterns(context) {
        const insights = [];
        // Check for repetitive actions
        const actionTypes = context.steps
            .filter((s) => s.type === "action")
            .map((s) => s.content);
        const repetitions = this.findRepetitions(actionTypes);
        if (repetitions.length > 0) {
            insights.push({
                type: "pattern",
                description: `Detected repetitive actions: ${repetitions.join(", ")}`,
                severity: "medium",
                evidence: repetitions,
            });
        }
        // Check for long-running steps
        const longSteps = context.steps.filter((s) => s.durationMs > 10000);
        if (longSteps.length > 0) {
            insights.push({
                type: "pattern",
                description: `Found ${longSteps.length} long-running steps (>10s)`,
                severity: "medium",
                evidence: longSteps.map((s) => s.content),
            });
        }
        return insights;
    }
    /**
     * Identify performance bottlenecks
     */
    identifyBottlenecks(context) {
        const insights = [];
        // Check API call efficiency
        if (context.metrics.apiCalls > context.metrics.totalSteps * 2) {
            insights.push({
                type: "bottleneck",
                description: "High API call ratio - consider batching",
                severity: "high",
                evidence: [`${context.metrics.apiCalls} calls for ${context.metrics.totalSteps} steps`],
            });
        }
        // Check error rate
        const errorRate = context.metrics.errors / context.metrics.totalSteps;
        if (errorRate > 0.3) {
            insights.push({
                type: "bottleneck",
                description: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
                severity: "high",
                evidence: [`${context.metrics.errors} errors in ${context.metrics.totalSteps} steps`],
            });
        }
        // Check retry rate
        if (context.metrics.retries > context.metrics.totalSteps * 0.5) {
            insights.push({
                type: "bottleneck",
                description: "High retry rate - consider improving reliability",
                severity: "medium",
                evidence: [`${context.metrics.retries} retries`],
            });
        }
        return insights;
    }
    /**
     * Analyze errors in execution
     */
    analyzeErrors(context) {
        const insights = [];
        const errorSteps = context.steps.filter((s) => s.type === "error" || (s.result && !s.result.success));
        if (errorSteps.length === 0) {
            return insights;
        }
        // Categorize errors
        const errorTypes = new Map();
        for (const step of errorSteps) {
            const errorType = this.categorizeError(step.result?.error || step.content);
            errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
        }
        // Report most common errors
        const sortedErrors = Array.from(errorTypes.entries()).sort((a, b) => b[1] - a[1]);
        for (const [type, count] of sortedErrors.slice(0, 3)) {
            insights.push({
                type: "error",
                description: `Frequent error type: ${type} (${count} occurrences)`,
                severity: count > 2 ? "high" : "medium",
                evidence: [`${count} occurrences`],
            });
        }
        return insights;
    }
    /**
     * Find optimization opportunities
     */
    async findOptimizations(context) {
        const insights = [];
        // Check for sequential independent actions
        const independentActions = this.findIndependentActions(context.steps);
        if (independentActions.length > 1) {
            insights.push({
                type: "optimization",
                description: "Independent actions could be parallelized",
                severity: "low",
                evidence: independentActions.map((a) => a.content),
            });
        }
        // Check token usage efficiency
        if (context.metrics.tokenUsage > 4000) {
            insights.push({
                type: "optimization",
                description: "High token usage - consider context optimization",
                severity: "medium",
                evidence: [`${context.metrics.tokenUsage} tokens used`],
            });
        }
        return insights;
    }
    /**
     * Generate recommendations based on insights
     */
    async generateRecommendations(context, insights) {
        const recommendations = [];
        for (const insight of insights) {
            switch (insight.type) {
                case "bottleneck":
                    if (insight.description.includes("API call")) {
                        recommendations.push({
                            id: generateId("rec"),
                            category: "workflow",
                            description: "Implement request batching to reduce API calls",
                            expectedImpact: "high",
                            implementation: "Group multiple operations into single API calls",
                        });
                    }
                    break;
                case "error":
                    recommendations.push({
                        id: generateId("rec"),
                        category: "prompt",
                        description: "Add error handling examples to system prompt",
                        expectedImpact: "medium",
                        implementation: "Include common error patterns and recovery strategies",
                    });
                    break;
                case "optimization":
                    if (insight.description.includes("parallelized")) {
                        recommendations.push({
                            id: generateId("rec"),
                            category: "workflow",
                            description: "Enable parallel execution for independent tasks",
                            expectedImpact: "medium",
                            implementation: "Use Promise.all for independent operations",
                        });
                    }
                    break;
            }
        }
        // Add general recommendations based on metrics
        if (context.metrics.totalDurationMs > 60000) {
            recommendations.push({
                id: generateId("rec"),
                category: "model",
                description: "Consider using faster model for simple tasks",
                expectedImpact: "high",
                implementation: "Route simple tasks to lightweight models",
            });
        }
        return recommendations;
    }
    /**
     * Generate strategy adjustments
     */
    async generateStrategyAdjustments(context, insights) {
        const adjustments = [];
        // Adjust retry strategy based on error rate
        const errorRate = context.metrics.errors / context.metrics.totalSteps;
        if (errorRate > 0.2) {
            adjustments.push({
                target: "retry.maxAttempts",
                currentValue: 3,
                suggestedValue: 5,
                rationale: "High error rate suggests need for more retries",
            });
        }
        // Adjust timeout based on step duration
        const avgDuration = context.metrics.totalDurationMs / context.metrics.totalSteps;
        if (avgDuration > 5000) {
            adjustments.push({
                target: "execution.timeoutMs",
                currentValue: 30000,
                suggestedValue: Math.min(avgDuration * 2, 120000),
                rationale: "Steps are taking longer than expected",
            });
        }
        return adjustments;
    }
    /**
     * Calculate reflection confidence
     */
    calculateConfidence(context, insights) {
        // Base confidence on data quality
        let confidence = 0.5;
        // More steps = more data = higher confidence
        if (context.metrics.totalSteps > 5) {
            confidence += 0.1;
        }
        // Successful executions provide better insights
        if (context.outcome === "success") {
            confidence += 0.2;
        }
        // More insights = higher confidence
        confidence += Math.min(insights.length * 0.05, 0.2);
        return Math.min(confidence, 1);
    }
    /**
     * Apply reflection insights to improve future executions
     */
    async applyReflection(entryId) {
        const entry = this.entries.find((e) => e.id === entryId);
        if (!entry) {
            return false;
        }
        log.info(`Applying reflection: ${entryId}`);
        // Apply strategy adjustments
        for (const adjustment of entry.result.strategyAdjustments) {
            await this.memory.setPreference(`strategy.${adjustment.target}`, adjustment.suggestedValue);
        }
        // Store successful patterns
        if (entry.context.outcome === "success") {
            await this.memory.setPreference(`pattern.success.${entry.context.taskId}`, {
                steps: entry.context.steps.map((s) => s.content),
                timestamp: entry.timestamp,
            });
        }
        entry.applied = true;
        await this.persistReflection(entry);
        return true;
    }
    /**
     * Get learning statistics
     */
    getStatistics() {
        const insightsByType = {};
        let totalConfidence = 0;
        for (const entry of this.entries) {
            for (const insight of entry.result.insights) {
                insightsByType[insight.type] = (insightsByType[insight.type] || 0) + 1;
            }
            totalConfidence += entry.result.confidence;
        }
        return {
            totalReflections: this.entries.length,
            appliedReflections: this.entries.filter((e) => e.applied).length,
            insightsByType,
            averageConfidence: this.entries.length > 0 ? totalConfidence / this.entries.length : 0,
        };
    }
    // ============================================================================
    // Utilities
    // ============================================================================
    findRepetitions(items) {
        const counts = new Map();
        for (const item of items) {
            counts.set(item, (counts.get(item) || 0) + 1);
        }
        return Array.from(counts.entries())
            .filter(([, count]) => count > 1)
            .map(([item]) => item);
    }
    categorizeError(error) {
        if (error.includes("timeout") || error.includes("Timeout")) {
            return "timeout";
        }
        if (error.includes("network") || error.includes("Network")) {
            return "network";
        }
        if (error.includes("permission") || error.includes("Permission")) {
            return "permission";
        }
        if (error.includes("not found") || error.includes("Not found")) {
            return "not_found";
        }
        return "unknown";
    }
    findIndependentActions(steps) {
        // Simplified: actions without dependencies are independent
        return steps.filter((s) => s.type === "action" && !s.content.includes("depends on"));
    }
    async persistReflection(entry) {
        await this.memory.setPreference(`reflection.${entry.id}`, entry);
    }
}
// Helper function to create reflection context
export function createReflectionContext(executionId, taskId, agentId, startTime) {
    return {
        executionId,
        taskId,
        agentId,
        startTime,
        steps: [],
        outcome: "success",
        metrics: {
            totalSteps: 0,
            totalDurationMs: 0,
            tokenUsage: 0,
            apiCalls: 0,
            errors: 0,
            retries: 0,
        },
    };
}
export default ReflectionEngine;
