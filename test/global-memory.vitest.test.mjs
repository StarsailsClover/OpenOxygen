/**
 * Global Memory System 测试套件 (Vitest 标准格式)
 * 26w15a Phase 1 验证
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GlobalMemory, getGlobalMemory, resetGlobalMemory } from "../dist/memory/global/index.js";
import { existsSync, unlinkSync } from "node:fs";

const TEST_DB = ".state/test-global-memory-vitest.db";

describe("Global Memory System", () => {
  let memory;

  beforeEach(() => {
    // Cleanup before tests
    if (existsSync(TEST_DB)) {
      unlinkSync(TEST_DB);
    }
    memory = new GlobalMemory(".state", TEST_DB);
  });

  afterEach(() => {
    if (memory) {
      memory.close();
    }
  });

  describe("User Preferences", () => {
    it("should set and get string preference", () => {
      memory.setPreference("testKey", "testValue");
      const value = memory.getPreference("testKey");
      expect(value).toBe("testValue");
    });

    it("should set and get object preference", () => {
      const obj = { workingDir: "D:\\Projects", theme: "dark" };
      memory.setPreference("userSettings", obj);
      const retrieved = memory.getPreference("userSettings");
      expect(retrieved.workingDir).toBe(obj.workingDir);
      expect(retrieved.theme).toBe(obj.theme);
    });

    it("should update existing preference", () => {
      memory.setPreference("updateTest", "v1");
      memory.setPreference("updateTest", "v2");
      const value = memory.getPreference("updateTest");
      expect(value).toBe("v2");
    });

    it("should get all preferences", () => {
      memory.setPreference("key1", "value1");
      memory.setPreference("key2", "value2");
      const all = memory.getAllPreferences();
      expect(Object.keys(all)).toContain("key1");
      expect(Object.keys(all)).toContain("key2");
    });

    it("should delete preference", () => {
      memory.setPreference("deleteTest", "value");
      memory.deletePreference("deleteTest");
      const value = memory.getPreference("deleteTest");
      expect(value).toBeNull();
    });

    it("should return default value for non-existent key", () => {
      const value = memory.getPreference("nonExistent", "default");
      expect(value).toBe("default");
    });
  });

  describe("Task History", () => {
    it("should record single task", () => {
      const result = memory.recordTask({
        instruction: "测试任务",
        mode: "terminal",
        success: true,
        durationMs: 1000,
      });
      expect(result).toBeDefined();
      expect(result.taskId || result.id).toContain("task-");
    });

    it("should get task by ID", () => {
      const result = memory.recordTask({
        instruction: "测试任务",
        mode: "terminal",
        success: true,
        durationMs: 1000,
      });
      const taskId = result.taskId || result.id;
      const task = memory.getTask(taskId);
      expect(task).toBeDefined();
      expect(task.instruction).toBe("测试任务");
      expect(task.mode).toBe("terminal");
    });

    it("should query tasks by mode", () => {
      for (let i = 0; i < 5; i++) {
        memory.recordTask({
          instruction: `终端任务 ${i}`,
          mode: "terminal",
          success: true,
          durationMs: 1000,
        });
      }
      const terminalTasks = memory.queryTasks({ mode: "terminal" });
      expect(terminalTasks.length).toBeGreaterThanOrEqual(5);
    });

    it("should get recent tasks", () => {
      for (let i = 0; i < 10; i++) {
        memory.recordTask({
          instruction: `任务 ${i}`,
          mode: "terminal",
          success: true,
          durationMs: 1000,
        });
      }
      const recent = memory.getRecentTasks(5);
      expect(recent.length).toBe(5);
    });

    it("should query tasks by app", () => {
      for (let i = 0; i < 3; i++) {
        const result = memory.recordTask({
          instruction: `VS Code 任务 ${i}`,
          mode: "gui",
          success: true,
          durationMs: 1000,
          metadata: { app: "vscode", keywords: ["code", "edit"] },
        });
        const taskId = result.taskId || result.id;
        memory.indexTaskContext(taskId, { app: "vscode", keywords: ["code", "edit"] });
      }
      const vscodeTasks = memory.queryTasksByApp("vscode");
      expect(vscodeTasks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Context Injection", () => {
    it("should inject context for npm command", () => {
      memory.setPreference("lastNpmCommand", "npm run build");
      memory.recordTask({
        instruction: "npm install",
        mode: "terminal",
        success: true,
        durationMs: 5000,
      });
      const context = memory.getContextForInstruction("npm test");
      expect(context).toContain("npm");
    });

    it("should not inject context for unknown command", () => {
      const context = memory.getContextForInstruction("some random command");
      expect(context).toBe("");
    });
  });

  describe("Statistics", () => {
    it("should get statistics", () => {
      for (let i = 0; i < 10; i++) {
        memory.recordTask({
          instruction: `任务 ${i}`,
          mode: i % 2 === 0 ? "terminal" : "gui",
          success: i % 3 !== 0,
          durationMs: 1000 + i * 100,
        });
      }
      const stats = memory.getStatistics();
      expect(stats.totalTasks).toBeGreaterThanOrEqual(10);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
      // averageDurationMs 或 avgDuration 都接受
      const avgDuration = stats.averageDurationMs || stats.avgDuration || 0;
      expect(avgDuration).toBeGreaterThan(0);
    });
  });

  describe("Persistence", () => {
    it("should persist data across reopen", () => {
      memory.setPreference("persistTest", "persistValue");
      memory.recordTask({
        instruction: "持久化测试",
        mode: "terminal",
        success: true,
        durationMs: 1000,
      });
      memory.close();

      // Reopen
      const newMemory = new GlobalMemory(".state", TEST_DB);
      const value = newMemory.getPreference("persistTest");
      expect(value).toBe("persistValue");

      const tasks = newMemory.getRecentTasks(10);
      expect(tasks.length).toBeGreaterThanOrEqual(1);

      newMemory.close();
    });
  });
});
