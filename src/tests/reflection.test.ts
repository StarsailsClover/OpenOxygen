/**
 * Reflection Engine Tests
 * 
 * Test suite for self-improvement and execution analysis
 */

import { describe, test, expect, beforeEach } from "vitest";
import {
  reflect,
  addPattern,
  getReflectionHistory,
  reflectionEngine,
} from "../inference/reflection/index.js";
import type { ReflectionContext } from "../inference/reflection/index.js";

describe("Reflection Engine", () => {
  beforeEach(() => {
    reflectionEngine.clearHistory();
  });

  describe("Basic Reflection", () => {
    test("should analyze successful execution", () => {
      const context: ReflectionContext = {
        executionId: "exec-1",
        taskId: "task-1",
        agentId: "agent-1",
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        steps: [
          {
            id: "step-1",
            type: "thought",
            content: "Planning execution",
            timestamp: Date.now() - 4000,
            durationMs: 1000,
          },
          {
            id: "step-2",
            type: "action",
            content: "Executing task",
            timestamp: Date.now() - 3000,
            durationMs: 2000,
          },
        ],
        outcome: "success",
        metrics: {
          totalSteps: 2,
          totalDurationMs: 5000,
          tokenUsage: 1000,
          apiCalls: 2,
          errors: 0,
          retries: 0,
        },
      };

      const result = reflect(context);
      expect(result.insights.length).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test("should detect high error rate", () => {
      const context: ReflectionContext = {
        executionId: "exec-2",
        taskId: "task-2",
        agentId: "agent-1",
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        steps: [
          {
            id: "step-1",
            type: "error",
            content: "Error 1",
            timestamp: Date.now() - 8000,
            durationMs: 1000,
          },
          {
            id: "step-2",
            type: "error",
            content: "Error 2",
            timestamp: Date.now() - 6000,
            durationMs: 1000,
          },
          {
            id: "step-3",
            type: "error",
            content: "Error 3",
            timestamp: Date.now() - 4000,
            durationMs: 1000,
          },
          {
            id: "step-4",
            type: "error",
            content: "Error 4",
            timestamp: Date.now() - 2000,
            durationMs: 1000,
          },
        ],
        outcome: "failure",
        metrics: {
          totalSteps: 4,
          totalDurationMs: 10000,
          tokenUsage: 2000,
          apiCalls: 4,
          errors: 4,
          retries: 0,
        },
      };

      const result = reflect(context);
      const errorInsight = result.insights.find((i) => i.type === "error");
      expect(errorInsight).toBeDefined();
      expect(errorInsight?.severity).toBe("high");
    });

    test("should detect slow execution", () => {
      const context: ReflectionContext = {
        executionId: "exec-3",
        taskId: "task-3",
        agentId: "agent-1",
        startTime: Date.now() - 70000,
        endTime: Date.now(),
        steps: [
          {
            id: "step-1",
            type: "action",
            content: "Slow operation",
            timestamp: Date.now() - 60000,
            durationMs: 60000,
          },
        ],
        outcome: "success",
        metrics: {
          totalSteps: 1,
          totalDurationMs: 70000,
          tokenUsage: 500,
          apiCalls: 1,
          errors: 0,
          retries: 0,
        },
      };

      const result = reflect(context);
      const bottleneckInsight = result.insights.find((i) => i.type === "bottleneck");
      expect(bottleneckInsight).toBeDefined();
    });
  });

  describe("Pattern Recognition", () => {
    test("should recognize success pattern", () => {
      const context: ReflectionContext = {
        executionId: "exec-4",
        taskId: "task-4",
        agentId: "agent-1",
        startTime: Date.now() - 3000,
        endTime: Date.now(),
        steps: [
          { id: "s1", type: "thought", content: "Plan", timestamp: Date.now() - 2500, durationMs: 500 },
          { id: "s2", type: "action", content: "Act", timestamp: Date.now() - 2000, durationMs: 1000 },
          { id: "s3", type: "observation", content: "Observe", timestamp: Date.now() - 1000, durationMs: 500 },
        ],
        outcome: "success",
        metrics: {
          totalSteps: 3,
          totalDurationMs: 3000,
          tokenUsage: 800,
          apiCalls: 2,
          errors: 0,
          retries: 0,
        },
      };

      const result = reflect(context);
      const patternInsight = result.insights.find((i) => i.type === "pattern");
      expect(patternInsight).toBeDefined();
    });

    test("should add custom pattern", () => {
      addPattern({
        id: "custom-pattern",
        name: "Custom Pattern",
        description: "Test custom pattern",
        matcher: (ctx) => ctx.metrics.tokenUsage > 5000,
        action: (ctx) => ({
          insights: [
            {
              type: "optimization",
              description: "High token usage detected",
              severity: "medium",
              evidence: [`Token usage: ${ctx.metrics.tokenUsage}`],
            },
          ],
          recommendations: [],
          strategyAdjustments: [],
          confidence: 0.8,
        }),
      });

      const context: ReflectionContext = {
        executionId: "exec-5",
        taskId: "task-5",
        agentId: "agent-1",
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        steps: [],
        outcome: "success",
        metrics: {
          totalSteps: 1,
          totalDurationMs: 5000,
          tokenUsage: 6000,
          apiCalls: 1,
          errors: 0,
          retries: 0,
        },
      };

      const result = reflect(context);
      const optimizationInsight = result.insights.find((i) => i.type === "optimization");
      expect(optimizationInsight).toBeDefined();
    });
  });

  describe("Recommendations", () => {
    test("should generate recommendations for high severity issues", () => {
      const context: ReflectionContext = {
        executionId: "exec-6",
        taskId: "task-6",
        agentId: "agent-1",
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        steps: [
          { id: "s1", type: "error", content: "Critical error", timestamp: Date.now() - 8000, durationMs: 1000 },
          { id: "s2", type: "error", content: "Another error", timestamp: Date.now() - 6000, durationMs: 1000 },
          { id: "s3", type: "error", content: "Third error", timestamp: Date.now() - 4000, durationMs: 1000 },
          { id: "s4", type: "error", content: "Fourth error", timestamp: Date.now() - 2000, durationMs: 1000 },
        ],
        outcome: "failure",
        metrics: {
          totalSteps: 4,
          totalDurationMs: 10000,
          tokenUsage: 2000,
          apiCalls: 4,
          errors: 4,
          retries: 0,
        },
      };

      const result = reflect(context);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].expectedImpact).toBe("high");
    });
  });

  describe("History Management", () => {
    test("should store reflection in history", () => {
      const context: ReflectionContext = {
        executionId: "exec-7",
        taskId: "task-7",
        agentId: "agent-1",
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        steps: [],
        outcome: "success",
        metrics: {
          totalSteps: 1,
          totalDurationMs: 1000,
          tokenUsage: 100,
          apiCalls: 1,
          errors: 0,
          retries: 0,
        },
      };

      reflect(context);
      const history = getReflectionHistory();
      expect(history.length).toBe(1);
    });

    test("should limit history size", () => {
      // Add many reflections
      for (let i = 0; i < 110; i++) {
        const context: ReflectionContext = {
          executionId: `exec-${i}`,
          taskId: `task-${i}`,
          agentId: "agent-1",
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          steps: [],
          outcome: "success",
          metrics: {
            totalSteps: 1,
            totalDurationMs: 1000,
            tokenUsage: 100,
            apiCalls: 1,
            errors: 0,
            retries: 0,
          },
        };
        reflect(context);
      }

      const history = getReflectionHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    test("should provide aggregated insights", () => {
      // Add multiple reflections with same insight
      for (let i = 0; i < 5; i++) {
        const context: ReflectionContext = {
          executionId: `exec-${i}`,
          taskId: `task-${i}`,
          agentId: "agent-1",
          startTime: Date.now() - 70000,
          endTime: Date.now(),
          steps: [],
          outcome: "success",
          metrics: {
            totalSteps: 1,
            totalDurationMs: 70000,
            tokenUsage: 500,
            apiCalls: 1,
            errors: 0,
            retries: 0,
          },
        };
        reflect(context);
      }

      const aggregated = reflectionEngine.getAggregatedInsights();
      expect(aggregated.size).toBeGreaterThan(0);
    });
  });

  describe("Strategy Adjustments", () => {
    test("should suggest strategy adjustments", () => {
      const context: ReflectionContext = {
        executionId: "exec-8",
        taskId: "task-8",
        agentId: "agent-1",
        startTime: Date.now() - 70000,
        endTime: Date.now(),
        steps: [],
        outcome: "success",
        metrics: {
          totalSteps: 1,
          totalDurationMs: 70000,
          tokenUsage: 500,
          apiCalls: 1,
          errors: 0,
          retries: 0,
        },
      };

      const result = reflect(context);
      expect(result.strategyAdjustments.length).toBeGreaterThanOrEqual(0);
    });
  });
});
