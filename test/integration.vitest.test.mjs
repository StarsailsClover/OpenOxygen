/**
 * Integration Tests - End-to-End Workflow
 * 26w15aC Phase 5 验证
 */

import { describe, it, expect } from "vitest";
import { WorkflowEngine, predefinedWorkflows } from "../dist/tasks/workflow-engine.js";
import { DocumentGenerator } from "../dist/tasks/document-generator.js";
import { GlobalMemory } from "../dist/memory/global/index.js";

describe("Integration Tests", () => {
  describe("Full Task Chain", () => {
    it("should execute daily check workflow", async () => {
      const engine = new WorkflowEngine();
      engine.register("daily-check", predefinedWorkflows.dailyCheck);
      
      const result = await engine.execute("daily-check", {
        email: "test@gmail.com",
        username: "testuser",
        keyword: "OpenOxygen",
      });
      
      expect(result).toBeDefined();
      expect(result.status).toBe("completed");
    }, 60000);

    it("should generate report from workflow results", async () => {
      const engine = new WorkflowEngine();
      const docGen = new DocumentGenerator();
      
      // Execute workflow
      engine.register("test-workflow", {
        steps: [
          { name: "step1", type: "delay", params: { duration: 100 } },
        ],
      });
      
      const workflowResult = await engine.execute("test-workflow");
      
      // Generate report
      const report = await docGen.generateProjectReport({
        title: "Workflow Execution Report",
        summary: `Workflow ${workflowResult.id} completed`,
        details: workflowResult.results.map(r => r.step),
        conclusion: "All steps executed successfully",
      });
      
      expect(report.success).toBe(true);
    });
  });

  describe("Memory + Workflow Integration", () => {
    it("should store workflow results in memory", async () => {
      const memory = new GlobalMemory(".state", ".state/test-integration.db");
      const engine = new WorkflowEngine();
      
      engine.register("memory-test", {
        steps: [
          { name: "step1", type: "delay", params: { duration: 50 } },
        ],
      });
      
      const result = await engine.execute("memory-test");
      
      // Store in memory
      memory.recordTask({
        instruction: "Integration test workflow",
        mode: "workflow",
        success: result.status === "completed",
        durationMs: result.duration,
        output: JSON.stringify(result.results),
      });
      
      // Retrieve from memory
      const tasks = memory.queryTasks({ mode: "workflow" });
      expect(tasks.length).toBeGreaterThan(0);
      
      memory.close();
    });
  });

  describe("Document + Web Integration", () => {
    it("should extract webpage and generate summary", async () => {
      const docGen = new DocumentGenerator();
      
      const extraction = await docGen.extractFromWebpage("https://example.com", {
        summarize: true,
        maxLength: 500,
      });
      
      expect(extraction).toBeDefined();
      
      if (extraction.success) {
        const report = await docGen.generateProjectReport({
          title: `Analysis of ${extraction.title}`,
          summary: extraction.summary || extraction.content.substring(0, 200),
          details: [extraction.url],
          conclusion: "Webpage analysis completed",
        });
        
        expect(report.success).toBe(true);
      }
    }, 20000);
  });
});
