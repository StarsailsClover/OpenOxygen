/**
 * Unified Task Executor 测试套件
 * 26w14a Phase 3 验证
 */

import { analyzeTask, executeWithStrategy, handleExecutionRequest } from "../dist/execution/unified/index.js";

const TESTS = {
  passed: 0,
  failed: 0,
  results: [],
};

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

async function runTests() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  Unified Task Executor Test Suite - 26w14a Phase 3          ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // Test 1: Analyze terminal task
  await test("Analyze: npm install command", () => {
    const strategy = analyzeTask("npm install && npm run build");
    if (strategy.mode !== "terminal") throw new Error(`Expected terminal, got ${strategy.mode}`);
    if (strategy.confidence < 0.5) throw new Error(`Low confidence: ${strategy.confidence}`);
    console.log(`  → ${strategy.mode} (${Math.round(strategy.confidence * 100)}%): ${strategy.reason}`);
  });

  // Test 2: Analyze browser task
  await test("Analyze: open bilibili", () => {
    const strategy = analyzeTask("打开 bilibili.com 搜索视频");
    if (strategy.mode !== "browser") throw new Error(`Expected browser, got ${strategy.mode}`);
    console.log(`  → ${strategy.mode} (${Math.round(strategy.confidence * 100)}%): ${strategy.reason}`);
  });

  // Test 3: Analyze GUI task
  await test("Analyze: click button", () => {
    const strategy = analyzeTask("点击微信的搜索按钮");
    if (strategy.mode !== "gui") throw new Error(`Expected gui, got ${strategy.mode}`);
    console.log(`  → ${strategy.mode} (${Math.round(strategy.confidence * 100)}%): ${strategy.reason}`);
  });

  // Test 4: Execute terminal task
  await test("Execute: echo command (terminal)", async () => {
    const result = await executeWithStrategy("echo HelloUnified", {
      mode: "terminal",
      confidence: 1,
      reason: "Test",
    });
    if (!result.success) throw new Error(`Failed: ${result.error}`);
    if (result.mode !== "terminal") throw new Error(`Wrong mode: ${result.mode}`);
    if (!result.output?.includes("HelloUnified")) throw new Error("Output mismatch");
    console.log(`  → Success in ${result.durationMs}ms`);
  });

  // Test 5: Execute GUI task (screenshot)
  await test("Execute: screenshot (gui)", async () => {
    const result = await executeWithStrategy("take a screenshot", {
      mode: "gui",
      confidence: 1,
      reason: "Test",
    });
    if (!result.success) throw new Error(`Failed: ${result.error}`);
    if (result.mode !== "gui") throw new Error(`Wrong mode: ${result.mode}`);
    if (!result.output?.includes("screenshot")) throw new Error("No screenshot mentioned");
    console.log(`  → Success in ${result.durationMs}ms`);
  });

  // Test 6: Hybrid fallback
  await test("Execute: hybrid with fallback", async () => {
    const result = await executeWithStrategy("some invalid command that fails", {
      mode: "terminal",
      confidence: 0.5,
      reason: "Test",
      fallback: "gui",
    });
    // Should try terminal then fallback to gui
    console.log(`  → Final mode: ${result.mode}, Success: ${result.success}`);
  });

  // Test 7: Handle execution request
  await test("API: handleExecutionRequest", async () => {
    const result = await handleExecutionRequest("echo API test", { mode: "terminal" });
    if (!result.success) throw new Error(`API failed: ${result.error}`);
    console.log(`  → API Success in ${result.durationMs}ms`);
  });

  // Test 8: Logs collection
  await test("Logs: execution logs collected", async () => {
    const result = await executeWithStrategy("echo test", { mode: "terminal", confidence: 1, reason: "Test" });
    if (!result.logs || result.logs.length === 0) throw new Error("No logs collected");
    console.log(`  → ${result.logs.length} log entries`);
  });

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Test Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ Passed: ${TESTS.passed}`);
  console.log(`  ❌ Failed: ${TESTS.failed}`);
  console.log(`  📊 Total: ${TESTS.passed + TESTS.failed}`);
  console.log("═══════════════════════════════════════════════════════════════");

  if (TESTS.failed > 0) {
    console.log("\nFailed tests:");
    for (const r of TESTS.results.filter(r => r.status === "FAIL")) {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    }
  }

  process.exit(TESTS.failed > 0 ? 1 : 0);
}

runTests();
