import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GlobalMemory } from "../../src/memory/global/index.js";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";

const TEST_DIR = ".state/test-vitest";

describe("GlobalMemory", () => {
  let memory: GlobalMemory;

  beforeEach(() => {
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
    const dbPath = `${TEST_DIR}/test-${Date.now()}.db`;
    memory = new GlobalMemory(TEST_DIR);
  });

  afterEach(() => {
    memory.close();
  });

  it("sets and gets preference", () => {
    memory.setPreference("key1", "value1");
    expect(memory.getPreference("key1")).toBe("value1");
  });

  it("returns default for missing preference", () => {
    expect(memory.getPreference("missing", "default")).toBe("default");
  });

  it("updates existing preference", () => {
    memory.setPreference("k", "v1");
    memory.setPreference("k", "v2");
    expect(memory.getPreference("k")).toBe("v2");
  });

  it("records and retrieves task", () => {
    const task = memory.recordTask({
      instruction: "test task",
      mode: "terminal",
      success: true,
      durationMs: 100,
    });
    expect(task.id).toBeTruthy();
    const retrieved = memory.getTask(task.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.instruction).toBe("test task");
  });

  it("queries tasks by mode", () => {
    memory.recordTask({ instruction: "t1", mode: "terminal", success: true, durationMs: 100 });
    memory.recordTask({ instruction: "t2", mode: "gui", success: true, durationMs: 100 });
    const results = memory.queryTasks({ mode: "terminal" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every(r => r.mode === "terminal")).toBe(true);
  });

  it("gets recent tasks", () => {
    memory.recordTask({ instruction: "r1", mode: "terminal", success: true, durationMs: 100 });
    memory.recordTask({ instruction: "r2", mode: "gui", success: false, durationMs: 200 });
    const recent = memory.getRecentTasks(5);
    expect(recent.length).toBeGreaterThanOrEqual(2);
  });

  it("calculates stats", () => {
    memory.recordTask({ instruction: "s1", mode: "terminal", success: true, durationMs: 100 });
    memory.recordTask({ instruction: "s2", mode: "terminal", success: false, durationMs: 200 });
    const stats = memory.getStats();
    expect(stats.totalTasks).toBeGreaterThanOrEqual(2);
    expect(stats.successRate).toBeGreaterThan(0);
    expect(stats.successRate).toBeLessThanOrEqual(1);
  });

  it("injects context for known keywords", () => {
    memory.recordTask({
      instruction: "npm install",
      mode: "terminal",
      success: true,
      durationMs: 5000,
      metadata: { keywords: ["npm"] },
    });
    const enhanced = memory.injectContext("npm run build");
    expect(enhanced).toContain("上下文参�?);
  });
});
