/**
 * OpenOxygen - Reflection Engine
 *
 * Self-improvement through execution analysis and strategy refinement
 * Enables the system to learn from past executions and optimize future performance
 */
import type { ToolResult } from "../../types/index.js";
export interface ReflectionContext {
    executionId: string;
    taskId: string;
    agentId: string;
    startTime: number;
    endTime?: number;
    steps: ExecutionStep[];
    outcome: "success" | "failure" | "partial";
    metrics: ExecutionMetrics;
}
export interface ExecutionStep {
    id: string;
    type: "thought" | "action" | "observation" | "error";
    content: string;
    timestamp: number;
    durationMs: number;
    result?: ToolResult;
}
export interface ExecutionMetrics {
    totalSteps: number;
    totalDurationMs: number;
    tokenUsage: number;
    apiCalls: number;
    errors: number;
    retries: number;
}
export interface ReflectionResult {
    insights: Insight[];
    recommendations: Recommendation[];
    strategyAdjustments: StrategyAdjustment[];
    confidence: number;
}
export interface Insight {
    type: "pattern" | "bottleneck" | "error" | "optimization";
    description: string;
    severity: "low" | "medium" | "high";
    evidence: string[];
}
export interface Recommendation {
    id: string;
    category: "prompt" | "tool" | "workflow" | "model";
    description: string;
    expectedImpact: "low" | "medium" | "high";
    implementation: string;
}
export interface StrategyAdjustment {
    target: string;
    currentValue: unknown;
    suggestedValue: unknown;
    rationale: string;
}
export interface ReflectionPattern {
    id: string;
    name: string;
    description: string;
    matcher: (context: ReflectionContext) => boolean;
    action: (context: ReflectionContext) => ReflectionResult;
}
export declare class ReflectionEngine {
    private patterns;
    private reflectionHistory;
    private maxHistorySize;
    constructor();
    /**
     * Analyze execution and generate insights
     */
    reflect(context: ReflectionContext): ReflectionResult;
    /**
     * Add custom reflection pattern
     */
    addPattern(pattern: ReflectionPattern): void;
    /**
     * Remove reflection pattern
     */
    removePattern(id: string): boolean;
    /**
     * Get reflection history
     */
    getHistory(limit?: number): ReflectionResult[];
    /**
     * Clear reflection history
     */
    clearHistory(): void;
    /**
     * Get aggregated insights from history
     */
    getAggregatedInsights(): Map<string, number>;
    private initializeDefaultPatterns;
    private analyzeMetrics;
    private generateRecommendations;
    private calculateConfidence;
    private addToHistory;
}
export declare const reflectionEngine: ReflectionEngine;
export declare function reflect(context: ReflectionContext): ReflectionResult;
export declare function addPattern(pattern: ReflectionPattern): void;
export declare function getReflectionHistory(limit?: number): ReflectionResult[];
//# sourceMappingURL=index.d.ts.map
