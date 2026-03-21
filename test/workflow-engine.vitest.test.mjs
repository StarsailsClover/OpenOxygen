/**
 * Workflow Engine 测试套件 (Vitest 标准格式)
 * 26w15aC Phase 4 验证
 */

import { describe, it, expect } from "vitest";
import { WorkflowEngine, predefinedWorkflows } from "../dist/tasks/workflow-engine.js";

describe("Workflow Engine", () => {
  const engine = new WorkflowEngine();

  describe("Workflow Registration", () => {
    it("should register a workflow", () => {
      engine.register("test-workflow", {
        steps: [
          { name: "step1", type: "delay", params: { duration: 100 } },
        ],
      });
      
      const workflow = engine.workflows.get("test-workflow");
      expect(workflow).toBeDefined();
      expect(workflow.name).toBe("test-workflow");
    });

    it("should have predefined workflows", () => {
      expect(predefinedWorkflows.dailyCheck).toBeDefined();
      expect(predefinedWorkflows.projectMonitor).toBeDefined();
      expect(predefinedWorkflows.dailyCheck.steps.length).toBeGreaterThan(0);
    });
  });

  describe("Workflow Execution", () => {
    it("should execute simple workflow", async () => {
      engine.register("simple-test", {
        steps: [
          { name: "delay1", type: "delay", params: { duration: 100 } },
          { name: "delay2", type: "delay", params: { duration: 100 } },
        ],
      });

      const result = await engine.execute("simple-test");
      expect(result).toBeDefined();
      expect(result.status).toBe("completed");
      expect(result.results).toHaveLength(2);
    }, 5000);

    it("should pass context between steps", async () => {
      engine.register("context-test", {
        steps: [
          { 
            name: "setContext", 
            type: "terminal", 
            action: "exec",
            params: { command: "echo test-value" },
            outputKey: "testValue",
          },
        ],
      });

      const result = await engine.execute("context-test", { initial: "data" });
      expect(result).toBeDefined();
      expect(result.context).toBeDefined();
    }, 10000);

    it("should handle workflow not found", async () => {
      await expect(engine.execute("non-existent")).rejects.toThrow("Workflow not found");
    });
  });

  describe("Condition Evaluation", () => {
    it("should evaluate true condition", async () => {
      const result = await engine.evaluateCondition("context.value > 0", { value: 5 });
      expect(result).toBe(true);
    });

    it("should evaluate false condition", async () => {
      const result = await engine.evaluateCondition("context.value > 10", { value: 5 });
      expect(result).toBe(false);
    });

    it("should handle invalid condition gracefully", async () => {
      const result = await engine.evaluateCondition("invalid syntax", {});
      expect(result).toBe(false);
    });
  });
});
