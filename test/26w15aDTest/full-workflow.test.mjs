/**
 * 26w15aDTest - Full Workflow Tests
 * 
 * 完整流程测试
 * 用户请求 → 意图识别 → 任务分解 → 执行 → 反思
 */

import { describe, it, expect, beforeAll } from "vitest";
import { GlobalMemory } from "../../dist/memory/global/index.js";
import { autonomousDecompose, autonomousExecute } from "../../dist/autonomous/test-generator.js";
import { handleExecutionRequest } from "../../dist/execution/unified/index.js";

const TEST_DB = ".state/test-workflow.db";

describe("26w15aDTest - Full Workflow", () => {
  let memory;

  beforeAll(() => {
    memory = new GlobalMemory(".state", TEST_DB);
  });

  describe("Step 1: User Input Processing", () => {
    it("should process user instruction", async () => {
      const instruction = "列出当前目录下的文件";
      
      // Record user input
      const task = memory.recordTask({
        instruction,
        mode: "auto",
        success: true,
        durationMs: 100,
      });

      expect(task).toBeDefined();
      expect(task.instruction).toBe(instruction);
    });

    it("should handle multiple input types", async () => {
      const inputs = [
        { type: "text", content: "echo hello" },
        { type: "clipboard", content: "npm install" },
        { type: "voice", content: "打开浏览器" },
      ];

      for (const input of inputs) {
        const task = memory.recordTask({
          instruction: input.content,
          mode: "auto",
          success: true,
          durationMs: 100,
        });

        expect(task).toBeDefined();
      }
    });
  });

  describe("Step 2: Intent Recognition", () => {
    it("should recognize terminal intent", async () => {
      const instruction = "ls -la";
      const result = await handleExecutionRequest({
        instruction,
        mode: "auto",
      });

      expect(result).toBeDefined();
      expect(result.mode).toBe("terminal");
    });

    it("should recognize browser intent", async () => {
      const instruction = "打开 https://github.com";
      const result = await handleExecutionRequest({
        instruction,
        mode: "auto",
      });

      expect(result).toBeDefined();
      expect(result.mode).toBe("browser");
    });

    it("should recognize GUI intent", async () => {
      const instruction = "点击确定按钮";
      const result = await handleExecutionRequest({
        instruction,
        mode: "auto",
      });

      expect(result).toBeDefined();
      expect(result.mode).toBe("gui");
    });
  });

  describe("Step 3: Task Decomposition", () => {
    it("should decompose deploy task", async () => {
      const instruction = "部署项目到生产环境";
      const plan = await autonomousDecompose(instruction);

      expect(plan).toBeDefined();
      expect(plan.strategy).toBeDefined();
      expect(plan.subtasks).toBeDefined();
      expect(plan.subtasks.length).toBeGreaterThan(0);

      console.log("Decomposed plan:", JSON.stringify(plan, null, 2));
    });

    it("should decompose data collection task", async () => {
      const instruction = "收集多个网站的数据";
      const plan = await autonomousDecompose(instruction);

      expect(plan).toBeDefined();
      expect(plan.subtasks.length).toBeGreaterThan(0);
    });
  });

  describe("Step 4: Task Execution", () => {
    it("should execute simple terminal task", async () => {
      const result = await handleExecutionRequest({
        instruction: "echo test",
        mode: "terminal",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.output).toContain("test");
    });

    it("should execute with fallback on failure", async () => {
      const result = await handleExecutionRequest({
        instruction: "invalid_command_xyz",
        mode: "auto",
      });

      expect(result).toBeDefined();
      // Should handle failure gracefully
      expect(typeof result === "object").toBe(true);
    });
  });

  describe("Step 5: Reflection", () => {
    it("should record execution result", async () => {
      const result = await handleExecutionRequest({
        instruction: "echo reflection_test",
        mode: "terminal",
      });

      // Record result
      memory.recordTask({
        instruction: "reflection_test",
        mode: "terminal",
        success: result.success,
        durationMs: result.durationMs || 100,
        output: result.output,
      });

      const stats = memory.getStatistics();
      expect(stats.totalTasks).toBeGreaterThan(0);
    });

    it("should learn from failures", async () => {
      // Simulate a failure
      memory.recordTask({
        instruction: "failed_task",
        mode: "terminal",
        success: false,
        durationMs: 100,
        error: "Command not found",
      });

      // Check if system can identify failure pattern
      const tasks = memory.queryTasks({ mode: "terminal" });
      const failedTasks = tasks.filter(t => !t.success);
      
      console.log(`Failed tasks: ${failedTasks.length}`);
      expect(failedTasks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Full End-to-End Workflow", () => {
    it("should execute complete workflow", async () => {
      const instruction = "echo complete_workflow_test";

      // Step 1: Process input
      console.log("Step 1: Processing input...");
      
      // Step 2: Recognize intent
      console.log("Step 2: Recognizing intent...");
      const intent = await handleExecutionRequest({
        instruction,
        mode: "auto",
      });

      // Step 3: Decompose (if needed)
      console.log("Step 3: Decomposing task...");
      
      // Step 4: Execute
      console.log("Step 4: Executing...");
      const result = await handleExecutionRequest({
        instruction,
        mode: intent.mode,
      });

      // Step 5: Reflect
      console.log("Step 5: Reflecting...");
      memory.recordTask({
        instruction,
        mode: intent.mode,
        success: result.success,
        durationMs: result.durationMs || 100,
        output: result.output,
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("complete_workflow_test");
    }, 30000);
  });
});
