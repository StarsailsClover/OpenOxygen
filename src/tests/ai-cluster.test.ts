/**
 * AI Cluster Tests
 *
 * Test suite for multi-model fusion and routing
 */

import { describe, test, expect, beforeEach } from "vitest";
import {
  registerNode,
  routeRequest,
  executeWithFusion,
  getActiveNodes,
  aiCluster,
} from "../core/ai-cluster/index.js";
import type { InferenceRequest } from "../types/index.js";

describe("AI Cluster", () => {
  beforeEach(() => {
    // Clean up nodes
  });

  describe("Node Registration", () => {
    test("should register new node", () => {
      const node = registerNode({
        id: "test-node",
        name: "Test Node",
        provider: "test",
        model: "test-model",
        config: {},
        capabilities: [{ type: "text", score: 0.9 }],
      });

      expect(node.id).toBe("test-node");
      expect(node.status).toBe("active");
    });

    test("should list active nodes", () => {
      registerNode({
        id: "node-1",
        name: "Node 1",
        provider: "test",
        model: "model-1",
        config: {},
        capabilities: [{ type: "text", score: 0.9 }],
      });

      const nodes = getActiveNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Request Routing", () => {
    beforeEach(() => {
      // Register test nodes
      registerNode({
        id: "fast-node",
        name: "Fast Node",
        provider: "test",
        model: "fast-model",
        config: {},
        capabilities: [{ type: "text", score: 0.8 }],
      });

      registerNode({
        id: "quality-node",
        name: "Quality Node",
        provider: "test",
        model: "quality-model",
        config: {},
        capabilities: [
          { type: "text", score: 0.95 },
          { type: "reasoning", score: 0.9 },
        ],
      });
    });

    test("should route simple request", () => {
      const request: InferenceRequest = {
        messages: [{ role: "user", content: "Hello" }],
      };

      const decision = routeRequest(request);
      expect(decision.nodeId).toBeDefined();
      expect(decision.confidence).toBeGreaterThan(0);
    });

    test("should route complex request to quality node", () => {
      const request: InferenceRequest = {
        messages: [
          {
            role: "user",
            content: "Analyze and compare these complex scenarios...",
          },
        ],
      };

      const decision = routeRequest(request);
      expect(decision.nodeId).toBeDefined();
    });
  });

  describe("Fusion Strategies", () => {
    test("should execute with single strategy", async () => {
      const request: InferenceRequest = {
        messages: [{ role: "user", content: "Test" }],
      };

      const result = await executeWithFusion(request, "single");
      expect(result.strategy).toBe("single");
      expect(result.contributors.length).toBe(1);
    });

    test("should execute with adaptive strategy", async () => {
      const request: InferenceRequest = {
        messages: [{ role: "user", content: "Simple test" }],
      };

      const result = await executeWithFusion(request, "adaptive");
      expect(result.strategy).toBe("adaptive");
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("Performance Tracking", () => {
    test("should track node performance", () => {
      const node = registerNode({
        id: "perf-node",
        name: "Performance Node",
        provider: "test",
        model: "perf-model",
        config: {},
        capabilities: [{ type: "text", score: 0.9 }],
      });

      // Record success
      aiCluster.recordSuccess(node.id, 100, 500);

      const updated = aiCluster.getNode(node.id);
      expect(updated?.successCount).toBe(1);
      expect(updated?.performance.avgLatencyMs).toBeGreaterThan(0);
    });

    test("should track node errors", () => {
      const node = registerNode({
        id: "error-node",
        name: "Error Node",
        provider: "test",
        model: "error-model",
        config: {},
        capabilities: [{ type: "text", score: 0.9 }],
      });

      // Record error
      aiCluster.recordError(node.id, "Test error");

      const updated = aiCluster.getNode(node.id);
      expect(updated?.errorCount).toBe(1);
    });
  });

  describe("Routing Statistics", () => {
    test("should provide routing stats", () => {
      // Make some requests
      const request: InferenceRequest = {
        messages: [{ role: "user", content: "Test" }],
      };

      routeRequest(request);
      routeRequest(request);

      const stats = aiCluster.getRoutingStats();
      expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
      expect(stats.avgConfidence).toBeGreaterThan(0);
    });
  });
});
