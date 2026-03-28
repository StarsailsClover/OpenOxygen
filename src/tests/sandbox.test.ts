/**
 * Sandbox Tests
 * 
 * Test suite for secure code execution
 */

import { describe, test, expect, beforeEach } from "vitest";
import {
  executeSandboxed,
  createDefaultSandboxConfig,
  evaluateExpression,
  getActiveExecutions,
  getExecutionStats,
} from "../execution/sandbox/index.js";

describe("Sandbox", () => {
  beforeEach(() => {
    // Clean up any lingering executions
    const active = getActiveExecutions();
    for (const exec of active) {
      // Cancel if needed
    }
  });

  describe("Basic Execution", () => {
    test("should execute simple arithmetic", async () => {
      const result = await executeSandboxed("return 1 + 1");
      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });

    test("should execute string operations", async () => {
      const result = await executeSandboxed('return "hello" + " world"');
      expect(result.success).toBe(true);
      expect(result.data).toBe("hello world");
    });

    test("should execute array operations", async () => {
      const result = await executeSandboxed("return [1, 2, 3].map(x => x * 2)");
      expect(result.success).toBe(true);
      expect(result.data).toEqual([2, 4, 6]);
    });

    test("should execute object operations", async () => {
      const code = `
        const obj = { a: 1, b: 2 };
        return Object.keys(obj).length;
      `;
      const result = await executeSandboxed(code);
      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });
  });

  describe("Security", () => {
    test("should block require()", async () => {
      const result = await executeSandboxed("require('fs')");
      expect(result.success).toBe(false);
      expect(result.error).toContain("require() is not allowed");
    });

    test("should block eval()", async () => {
      const result = await executeSandboxed("eval('1 + 1')");
      expect(result.success).toBe(false);
      expect(result.error).toContain("eval() is not allowed");
    });

    test("should block Function constructor", async () => {
      const result = await executeSandboxed("new Function('return 1')");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Function constructor is not allowed");
    });

    test("should block process access", async () => {
      const result = await executeSandboxed("process.exit(0)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("process object access is not allowed");
    });

    test("should block global access", async () => {
      const result = await executeSandboxed("globalThis");
      expect(result.success).toBe(false);
      expect(result.error).toContain("global object access is not allowed");
    });

    test("should block Buffer access", async () => {
      const result = await executeSandboxed("Buffer.from('test')");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Buffer access is not allowed");
    });

    test("should block setTimeout", async () => {
      const result = await executeSandboxed("setTimeout(() => {}, 1000)");
      expect(result.success).toBe(false);
      expect(result.error).toContain("setTimeout is not allowed");
    });

    test("should block fetch", async () => {
      const result = await executeSandboxed("fetch('https://example.com')");
      expect(result.success).toBe(false);
      expect(result.error).toContain("fetch() is not allowed");
    });

    test("should block prototype pollution", async () => {
      const result = await executeSandboxed("{}.__proto__.polluted = true");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Prototype access is not allowed");
    });
  });

  describe("Context Passing", () => {
    test("should pass context to sandbox", async () => {
      const code = `
        const { x, y } = context;
        return x + y;
      `;
      const result = await executeSandboxed(code, createDefaultSandboxConfig(), { x: 10, y: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toBe(30);
    });

    test("should handle complex context", async () => {
      const code = `
        const { data } = context;
        return data.filter(x => x > 5).length;
      `;
      const result = await executeSandboxed(code, createDefaultSandboxConfig(), {
        data: [1, 6, 2, 8, 3, 9],
      });
      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
    });
  });

  describe("Timeout", () => {
    test("should respect timeout", async () => {
      const config = createDefaultSandboxConfig();
      config.timeoutMs = 100;

      const code = `
        let sum = 0;
        for (let i = 0; i < 100000000; i++) {
          sum += i;
        }
        return sum;
      `;

      const result = await executeSandboxed(code, config);
      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
    });
  });

  describe("Expression Evaluation", () => {
    test("should evaluate simple expression", async () => {
      const result = await evaluateExpression("2 + 3 * 4");
      expect(result.success).toBe(true);
      expect(result.data).toBe(14);
    });

    test("should evaluate with variables", async () => {
      const result = await evaluateExpression("x * y + z", { x: 2, y: 3, z: 4 });
      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    test("should reject unsafe expression", async () => {
      const result = await evaluateExpression("require('fs')");
      expect(result.success).toBe(false);
      expect(result.error).toContain("unsafe characters");
    });
  });

  describe("Execution Stats", () => {
    test("should track execution stats", async () => {
      // Execute some code
      await executeSandboxed("return 1");
      await executeSandboxed("return 2");

      const stats = getExecutionStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });
  });
});
