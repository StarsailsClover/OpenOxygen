/**
 * Global Memory System 测试套件
 * 26w15a Phase 1 验证
 */

import { GlobalMemory, getGlobalMemory, resetGlobalMemory } from "../dist/memory/global/index.js";
import { existsSync, unlinkSync } from "node:fs";

const TEST_DB = ".state/test-global-memory.db";

const TESTS = { passed: 0, failed: 0, results: [] };

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    TESTS.passed++;
    TESTS.results.push({ name, status: "PASS", duration });
    console.log(`✅ (${duration}ms)`);
  } catch (e) {
    TESTS.failed++;
    TESTS.results.push({ name, status: "FAIL", error: e.message });
    console.log(`❌ ${e.message}`);
  }
}

// Cleanup before tests
if (existsSync(TEST_DB)) {
  unlinkSync(TEST_DB);
}

async function runTests() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  Global Memory System Test Suite - 26w15a Phase 1           ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  let memory = new GlobalMemory(".state");

  // Test 1: User Preferences
  await test("Preference: Set and get string", () => {
    memory.setPreference("testKey", "testValue");
    const value = memory.getPreference("testKey");
    if (value !== "testValue") throw new Error(`Expected "testValue", got ${value}`);
  });

  await test("Preference: Set and get object", () => {
    const obj = { workingDir: "D:\\Projects", theme: "dark" };
    memory.setPreference("userSettings", obj);
    const retrieved = memory.getPreference("userSettings");
    if (retrieved.workingDir !== obj.workingDir) throw new Error("Object mismatch");
  });

  await test("Preference: Update existing", () => {
    memory.setPreference("updateTest", "v1");
    memory.setPreference("updateTest", "v2");
    const value = memory.getPreference("updateTest");
    if (value !== "v2") throw new Error("Update failed");
  });

  await test("Preference: Get all preferences", () => {
    const prefs = memory.getAllPreferences();
    if (!prefs.testKey) throw new Error("Preferences not found");
    console.log(`    Found ${Object.keys(prefs).length} preferences`);
  });

  await test("Preference: Delete", () => {
    memory.setPreference("toDelete", "value");
    memory.deletePreference("toDelete");
    const value = memory.getPreference("toDelete");
    if (value !== undefined) throw new Error("Delete failed");
  });

  await test("Preference: Default value", () => {
    const value = memory.getPreference("nonExistent", "default");
    if (value !== "default") throw new Error("Default not returned");
  });

  // Test 2: Task History
  await test("Task: Record single task", () => {
    const task = memory.recordTask({
      instruction: "npm install",
      mode: "terminal",
      success: true,
      durationMs: 5000,
      metadata: { app: "vscode", keywords: ["npm", "install"] },
    });
    if (!task.id) throw new Error("No task ID");
    if (task.instruction !== "npm install") throw new Error("Instruction mismatch");
    console.log(`    Task ID: ${task.id}`);
  });

  await test("Task: Get task by ID", () => {
    const task = memory.recordTask({
      instruction: "git status",
      mode: "terminal",
      success: true,
      durationMs: 100,
    });
    const retrieved = memory.getTask(task.id);
    if (!retrieved) throw new Error("Task not found");
    if (retrieved.instruction !== "git status") throw new Error("Wrong task");
  });

  await test("Task: Query by mode", () => {
    memory.recordTask({ instruction: "task1", mode: "terminal", success: true, durationMs: 100 });
    memory.recordTask({ instruction: "task2", mode: "gui", success: true, durationMs: 100 });
    memory.recordTask({ instruction: "task3", mode: "terminal", success: false, durationMs: 100 });
    
    const terminalTasks = memory.queryTasks({ mode: "terminal", limit: 10 });
    if (terminalTasks.length < 2) throw new Error("Expected at least 2 terminal tasks");
    console.log(`    Found ${terminalTasks.length} terminal tasks`);
  });

  await test("Task: Get recent tasks", () => {
    const tasks = memory.getRecentTasks(5);
    if (tasks.length === 0) throw new Error("No recent tasks");
    if (tasks.length > 5) throw new Error("Too many tasks");
    console.log(`    Recent tasks: ${tasks.length}`);
  });

  await test("Task: Query by app", () => {
    memory.recordTask({
      instruction: "open vscode",
      mode: "gui",
      success: true,
      durationMs: 2000,
      metadata: { app: "vscode" },
    });
    
    const vscodeTasks = memory.getTasksByApp("vscode", 10);
    if (vscodeTasks.length === 0) throw new Error("No VS Code tasks found");
    console.log(`    VS Code tasks: ${vscodeTasks.length}`);
  });

  // Test 3: Context Injection
  await test("Context: Inject for npm command", () => {
    // First record some history
    memory.recordTask({
      instruction: "npm install",
      mode: "terminal",
      success: true,
      durationMs: 5000,
      metadata: { keywords: ["npm"] },
    });
    
    const enhanced = memory.injectContext("npm run build");
    if (!enhanced.includes("[上下文参考]")) throw new Error("Context not injected");
    if (!enhanced.includes("npm install")) throw new Error("History not included");
    console.log(`    Enhanced length: ${enhanced.length} chars`);
  });

  await test("Context: No context for unknown command", () => {
    const enhanced = memory.injectContext("unknown command xyz");
    if (enhanced !== "unknown command xyz") throw new Error("Should not inject for unknown");
  });

  // Test 4: Statistics
  await test("Stats: Get statistics", () => {
    const stats = memory.getStats();
    if (stats.totalTasks === 0) throw new Error("No tasks counted");
    if (stats.successRate < 0 || stats.successRate > 1) throw new Error("Invalid success rate");
    console.log(`    Total: ${stats.totalTasks}, Success: ${(stats.successRate * 100).toFixed(1)}%, Avg: ${stats.avgDuration.toFixed(0)}ms`);
  });

  // Test 5: Persistence
  await test("Persistence: Data survives reopen", () => {
    memory.setPreference("persistTest", "survived");
    memory.close();
    
    // Reopen
    memory = new GlobalMemory(".state");
    const value = memory.getPreference("persistTest");
    if (value !== "survived") throw new Error("Data not persisted");
  });

  // Cleanup
  memory.close();

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Test Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ Passed: ${TESTS.passed}`);
  console.log(`  ❌ Failed: ${TESTS.failed}`);
  console.log(`  📊 Total: ${TESTS.passed + TESTS.failed}`);
  console.log("═══════════════════════════════════════════════════════════════");

  // Cleanup test DB
  if (existsSync(TEST_DB)) {
    unlinkSync(TEST_DB);
  }

  process.exit(TESTS.failed > 0 ? 1 : 0);
}

runTests();
