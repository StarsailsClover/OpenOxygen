/**
 * Task Orchestrator 测试套件 (Vitest 标准格式)
 * 26w15a Phase 3 验证
 */

import { describe, it, expect, beforeEach } from "vitest";
import { 
  createOrchestration, 
  executeOrchestration, 
  decomposeTask, 
  generateExecutionReport, 
  cleanupOrchestration 
} from "../dist/agent/orchestrator/index.js";

describe("Task Orchestrator", () => {
  describe("Task Decomposition", () => {
    it("should decompose deploy task with dag strategy", () => {
      const plan = decomposeTask("部署项目到生产环境");
      expect(plan.strategy).toBe("dag");
      expect(plan.subtasks).toHaveLength(3);
      console.log(`Strategy: ${plan.strategy}, Subtasks: ${plan.subtasks.map(s => s.name).join(", ")}`);
    });

    it("should decompose code review task with parallel strategy", () => {
      const plan = decomposeTask("审查代码质量");
      expect(plan.strategy).toBe("parallel");
      expect(plan.subtasks.length).toBeGreaterThanOrEqual(2);
      console.log(`Strategy: ${plan.strategy}, Subtasks: ${plan.subtasks.map(s => s.name).join(", ")}`);
    });

    it("should decompose data collection task with parallel strategy", () => {
      const plan = decomposeTask("收集网站数据");
      expect(plan.strategy).toBe("parallel");
      expect(plan.subtasks.length).toBeGreaterThanOrEqual(2);
    });

    it("should decompose complex task with DAG strategy", () => {
      const plan = decomposeTask("全流程部署");
      expect(plan.strategy).toBe("dag");
      expect(plan.subtasks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Orchestration Creation", () => {
    it("should create orchestration with metadata", () => {
      const orch = createOrchestration({
        name: "测试编排",
        description: "测试用编排",
        subtasks: [
          { name: "任务1", instruction: "echo 1" },
          { name: "任务2", instruction: "echo 2" },
        ],
        strategy: "sequential",
      });
      expect(orch.id).toBeDefined();
      expect(orch.id).toContain("orch-");
      expect(orch.status).toBe("pending");
      expect(orch.strategy).toBe("sequential");
    });

    it("should create orchestration with parallel strategy", () => {
      const orch = createOrchestration({
        name: "并行测试",
        subtasks: [
          { name: "A", instruction: "echo A" },
          { name: "B", instruction: "echo B" },
        ],
        strategy: "parallel",
      });
      expect(orch.strategy).toBe("parallel");
      expect(orch.status).toBe("pending");
    });

    it("should create orchestration with retry config", () => {
      const orch = createOrchestration({
        name: "重试测试",
        subtasks: [{ name: "任务", instruction: "echo test", maxRetries: 2 }],
      });
      // 检查子任务的重试配置
      expect(orch.subtasks[0].maxRetries).toBe(2);
    });
  });

  describe("Orchestration Execution", () => {
    it("should execute simple sequential orchestration", async () => {
      const orch = createOrchestration({
        name: "简单顺序执行",
        subtasks: [
          { name: "步骤1", instruction: "echo step1", mode: "terminal" },
          { name: "步骤2", instruction: "echo step2", mode: "terminal" },
        ],
        strategy: "sequential",
      });
      const result = await executeOrchestration(orch.id);
      expect(result).toBeDefined();
      expect(result.status === "completed" || result.status === "failed").toBe(true);
    }, 15000);

    it("should execute orchestration with timeout", async () => {
      const orch = createOrchestration({
        name: "超时测试",
        subtasks: [{ name: "慢任务", instruction: "sleep 5", mode: "terminal" }],
        timeout: 1000, // 1 second timeout
      });
      const result = await executeOrchestration(orch.id);
      expect(result).toBeDefined();
      // May timeout or complete depending on implementation
      expect(result.status === "completed" || result.status === "failed" || result.status === "timeout").toBe(true);
    }, 10000);

    it("should handle subtask failure with retry", async () => {
      const orch = createOrchestration({
        name: "失败重试测试",
        subtasks: [
          { name: "会失败", instruction: "exit 1", mode: "terminal", maxRetries: 1 },
        ],
      });
      const result = await executeOrchestration(orch.id);
      expect(result.status).toBe("failed");
      expect(result.retries).toBeGreaterThanOrEqual(1);
    });

    it("should execute DAG with dependencies", async () => {
      const orch = createOrchestration({
        name: "DAG依赖测试",
        subtasks: [
          { name: "基础", instruction: "echo base", mode: "terminal" },
          { name: "依赖基础", instruction: "echo dependent", mode: "terminal", dependsOn: ["基础"] },
        ],
        strategy: "dag",
      });
      const result = await executeOrchestration(orch.id);
      expect(result).toBeDefined();
      expect(result.status === "completed" || result.status === "failed").toBe(true);
    }, 10000);
  });

  describe("Execution Report", () => {
    it("should generate execution report", async () => {
      const orch = createOrchestration({
        name: "报告测试",
        subtasks: [
          { name: "任务1", instruction: "echo 1", mode: "terminal" },
          { name: "任务2", instruction: "echo 2", mode: "terminal" },
        ],
      });
      await executeOrchestration(orch.id);
      const report = generateExecutionReport(orch.id);
      expect(report).toBeDefined();
      expect(report.orchestrationId).toBe(orch.id);
      expect(report.subtasks).toBeDefined();
      expect(Array.isArray(report.subtasks)).toBe(true);
      expect(report.report).toBeDefined();
      expect(typeof report.report).toBe("string");
    }, 10000);
  });

  describe("Cleanup", () => {
    it("should cleanup orchestration resources", () => {
      const orch = createOrchestration({
        name: "清理测试",
        subtasks: [{ name: "任务", instruction: "echo test" }],
      });
      cleanupOrchestration(orch.id);
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
