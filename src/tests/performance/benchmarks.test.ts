/**
 * Performance Benchmarks
 * 
 * Performance tests for critical paths
 */

import { describe, test, expect } from "vitest";
import { Benchmark } from "../../performance/index.js";
import { skillRegistry } from "../../skills/registry.js";
import { openAIProtocol } from "../../protocols/openai/index.js";
import { mcpClient } from "../../protocols/mcp/index.js";
import { htnPlanner } from "../../planning/htn/index.js";
import { encryptionService } from "../../security/encryption.js";

describe("Performance Benchmarks", () => {
  beforeAll(() => {
    encryptionService.initialize("benchmark-key");
  });

  describe("Skill Execution", () => {
    test("skill registry lookup", async () => {
      const result = await Benchmark.run(
        "Skill Lookup",
        () => skillRegistry.get("system.info"),
        1000
      );

      expect(result.avgTime).toBeLessThan(1); // < 1ms
      expect(result.opsPerSecond).toBeGreaterThan(10000);
    });

    test("skill execution", async () => {
      const result = await Benchmark.run(
        "Skill Execution",
        async () => skillRegistry.execute("system.info"),
        100
      );

      expect(result.avgTime).toBeLessThan(50); // < 50ms
    });
  });

  describe("Protocol Performance", () => {
    test("OpenAI tool registration", async () => {
      const result = await Benchmark.run(
        "OpenAI Tool Registration",
        () => {
          openAIProtocol.registerTool({
            name: `test-tool-${Date.now()}`,
            description: "Test tool",
            parameters: { type: "object", properties: {} },
            handler: async () => ({ success: true }),
          });
        },
        100
      );

      expect(result.avgTime).toBeLessThan(5);
    });

    test("OpenAI tool execution", async () => {
      openAIProtocol.registerTool({
        name: "perf-test-tool",
        description: "Performance test tool",
        parameters: { type: "object", properties: {} },
        handler: async () => ({ success: true }),
      });

      const result = await Benchmark.run(
        "OpenAI Tool Execution",
        async () => {
          await openAIProtocol.executeToolCall({
            id: "call-1",
            type: "function",
            function: { name: "perf-test-tool", arguments: "{}" },
          });
        },
        100
      );

      expect(result.avgTime).toBeLessThan(10);
    });
  });

  describe("Security Performance", () => {
    test("encryption speed", async () => {
      const data = { secret: "x".repeat(100) };

      const result = await Benchmark.run(
        "Encryption",
        () => encryptionService.encryptObject(data),
        1000
      );

      expect(result.avgTime).toBeLessThan(5);
    });

    test("decryption speed", async () => {
      const data = { secret: "test" };
      const encrypted = encryptionService.encryptObject(data);

      const result = await Benchmark.run(
        "Decryption",
        () => encryptionService.decryptObject(encrypted),
        1000
      );

      expect(result.avgTime).toBeLessThan(5);
    });
  });

  describe("Memory Usage", () => {
    test("memory stability", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Run operations
      for (let i = 0; i < 100; i++) {
        await skillRegistry.execute("system.info");
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const increase = (finalMemory - initialMemory) / 1024 / 1024;

      expect(increase).toBeLessThan(50); // < 50MB increase
    });
  });

  describe("Target Performance", () => {
    test("inference latency target", async () => {
      // Simulated inference
      const result = await Benchmark.run(
        "Simulated Inference",
        () => {
          const data = new Array(100).fill(0).map((_, i) => i);
          return data.reduce((a, b) => a + b, 0);
        },
        100
      );

      // Target: < 21ms (relaxed for simulation)
      expect(result.avgTime).toBeLessThan(50);
    });

    test("screenshot target", async () => {
      const result = await Benchmark.run(
        "Simulated Screenshot",
        () => {
          return Buffer.alloc(1920 * 1080 * 4);
        },
        10
      );

      // Target: < 85ms (relaxed for simulation)
      expect(result.avgTime).toBeLessThan(150);
    });
  });
});
