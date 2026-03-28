/**
 * OpenOxygen - Reflection Engine
 *
 * Self-improvement through execution analysis and strategy refinement
 * Enables the system to learn from past executions and optimize future performance
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type { ToolResult, ExecutionContext } from "../../types/index.js";

const log = createSubsystemLogger("inference/reflection");

// ============================================================================
// Reflection Types
// ============================================================================

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

// ============================================================================
// Reflection Engine
// ============================================================================

export class ReflectionEngine {
  private patterns: Map<string, ReflectionPattern> = new Map();
  private reflectionHistory: ReflectionResult[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.initializeDefaultPatterns();
    log.info("Reflection engine initialized");
  }

  /**
   * Analyze execution and generate insights
   */
  reflect(context: ReflectionContext): ReflectionResult {
    log.info(`Starting reflection for execution ${context.executionId}`);

    const insights: Insight[] = [];
    const recommendations: Recommendation[] = [];
    const strategyAdjustments: StrategyAdjustment[] = [];

    // Apply all matching patterns
    for (const pattern of this.patterns.values()) {
      try {
        if (pattern.matcher(context)) {
          const result = pattern.action(context);
          insights.push(...result.insights);
          recommendations.push(...result.recommendations);
          strategyAdjustments.push(...result.strategyAdjustments);
        }
      } catch (error) {
        log.error(`Pattern ${pattern.id} failed:`, error);
      }
    }

    // Generate additional insights from metrics
    const metricInsights = this.analyzeMetrics(context.metrics);
    insights.push(...metricInsights);

    // Generate recommendations from insights
    const insightRecommendations = this.generateRecommendations(insights);
    recommendations.push(...insightRecommendations);

    const result: ReflectionResult = {
      insights,
      recommendations,
      strategyAdjustments,
      confidence: this.calculateConfidence(insights, context),
    };

    // Store in history
    this.addToHistory(result);

    log.info(`Reflection complete: ${insights.length} insights, ${recommendations.length} recommendations`);

    return result;
  }

  /**
   * Add custom reflection pattern
   */
  addPattern(pattern: ReflectionPattern): void {
    this.patterns.set(pattern.id, pattern);
    log.info(`Reflection pattern added: ${pattern.name}`);
  }

  /**
   * Remove reflection pattern
   */
  removePattern(id: string): boolean {
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
  getHistory(limit?: number): ReflectionResult[] {
    const history = [...this.reflectionHistory];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Clear reflection history
   */
  clearHistory(): void {
    this.reflectionHistory = [];
    log.info("Reflection history cleared");
  }

  /**
   * Get aggregated insights from history
   */
  getAggregatedInsights(): Map<string, number> {
    const aggregated = new Map<string, number>();

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

  private initializeDefaultPatterns(): void {
    // Pattern: High Error Rate
    this.addPattern({
      id: "high-error-rate",
      name: "High Error Rate Detection",
      description: "Detects executions with high error rates",
      matcher: (ctx) => ctx.metrics.errors > 3 || ctx.metrics.errors / ctx.metrics.totalSteps > 0.3,
      action: (ctx) => ({
        insights: [
          {
            type: "error",
            description: `High error rate detected: ${ctx.metrics.errors} errors in ${ctx.metrics.totalSteps} steps`,
            severity: "high",
            evidence: ctx.steps.filter((s) => s.type === "error").map((s) => s.content),
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
            currentValue: 3,
            suggestedValue: 5,
            rationale: "High error rate suggests need for more retries",
          },
        ],
        confidence: 0.8,
      }),
    });

    // Pattern: Slow Execution
    this.addPattern({
      id: "slow-execution",
      name: "Slow Execution Detection",
      description: "Detects unusually slow executions",
      matcher: (ctx) => ctx.metrics.totalDurationMs > 60000, // > 1 minute
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
            currentValue: 30000,
            suggestedValue: Math.min(ctx.metrics.totalDurationMs * 1.5, 300000),
            rationale: "Adjust timeout based on actual execution time",
          },
        ],
        confidence: 0.7,
      }),
    });

    // Pattern: Token Efficiency
    this.addPattern({
      id: "token-efficiency",
      name: "Token Usage Analysis",
      description: "Analyzes token usage efficiency",
      matcher: (ctx) => ctx.metrics.tokenUsage > 4000,
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
            currentValue: 2048,
            suggestedValue: 1536,
            rationale: "Reduce max tokens to encourage efficiency",
          },
        ],
        confidence: 0.6,
      }),
    });

    // Pattern: Success Pattern
    this.addPattern({
      id: "success-pattern",
      name: "Success Pattern Recognition",
      description: "Identifies patterns in successful executions",
      matcher: (ctx) => ctx.outcome === "success" && ctx.metrics.totalSteps < 10,
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
        confidence: 0.9,
      }),
    });
  }

  private analyzeMetrics(metrics: ExecutionMetrics): Insight[] {
    const insights: Insight[] = [];

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

  private generateRecommendations(insights: Insight[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

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

  private calculateConfidence(insights: Insight[], context: ReflectionContext): number {
    if (insights.length === 0) return 0.5;

    // Base confidence on data quality
    let confidence = 0.5;

    // More steps = more data = higher confidence
    confidence += Math.min(context.metrics.totalSteps / 20, 0.2);

    // Successful outcomes increase confidence
    if (context.outcome === "success") confidence += 0.1;

    // High severity insights reduce confidence (uncertainty)
    const highSeverityCount = insights.filter((i) => i.severity === "high").length;
    confidence -= highSeverityCount * 0.05;

    return Math.max(0, Math.min(1, confidence));
  }

  private addToHistory(result: ReflectionResult): void {
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
export function reflect(context: ReflectionContext): ReflectionResult {
  return reflectionEngine.reflect(context);
}

export function addPattern(pattern: ReflectionPattern): void {
  reflectionEngine.addPattern(pattern);
}

export function getReflectionHistory(limit?: number): ReflectionResult[] {
  return reflectionEngine.getHistory(limit);
}
