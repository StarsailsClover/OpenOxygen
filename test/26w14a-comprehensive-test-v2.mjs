/**
 * OpenOxygen 26w14a 全面深度测试套件 v2
 * 修复：使用正确的模块导入，模拟耗时操作
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { createBrowserSession, destroyBrowserSession, navigate, getPageInfo, querySelector, findSystemBrowserCookies } from "../dist/execution/browser/index.js";
import { createSession, executeCommand, quickExec } from "../dist/execution/terminal/index.js";
import { analyzeTask, executeWithStrategy } from "../dist/execution/unified/index.js";

const TESTS = { passed: 0, failed: 0, skipped: 0, results: [] };

async function test(name, fn, opts = {}) {
  if (opts.skip) { TESTS.skipped++; console.log(`⏭️  SKIP: ${name}`); return; }
  process.stdout.write(`Testing: ${name}... `);
  try {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    TESTS.passed++;
    TESTS.results.push({ name, status: "PASS", duration, result });
    console.log(`✅ (${duration}ms)`);
    return result;
  } catch (e) {
    TESTS.failed++;
    TESTS.results.push({ name, status: "FAIL", error: e.message });
    console.log(`❌ ${e.message}`);
    if (opts.critical) throw new Error(`Critical test failed: ${name}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: OxygenBrowser 测试
// ═══════════════════════════════════════════════════════════════════════════

async function section1_browserTests() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 1: OxygenBrowser 深度测试");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await test("Browser: Find system browser cookies", () => {
    const cookies = findSystemBrowserCookies();
    console.log(`    Found: Edge=${!!cookies.edge}, Chrome=${!!cookies.chrome}`);
    return cookies;
  });

  await test("Browser: Cookie paths are valid", () => {
    const cookies = findSystemBrowserCookies();
    const fs = require("node:fs");
    if (cookies.edge && !fs.existsSync(cookies.edge)) {
      throw new Error("Edge cookie path does not exist");
    }
    if (cookies.chrome && !fs.existsSync(cookies.chrome)) {
      throw new Error("Chrome cookie path does not exist");
    }
    console.log(`    Paths validated`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Terminal 测试
// ═══════════════════════════════════════════════════════════════════════════

async function section2_terminalTests() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 2: Terminal Executor 测试");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await test("Terminal: Create session", () => {
    const session = createSession("powershell");
    if (!session.id) throw new Error("No session ID");
    if (!session.alive) throw new Error("Session not alive");
    console.log(`    Session: ${session.id}`);
    // Cleanup
    const { destroySession } = require("../dist/execution/terminal/index.js");
    destroySession(session.id);
  });

  await test("Terminal: Execute echo command", async () => {
    const { executeCommand } = require("../dist/execution/terminal/index.js");
    const session = createSession("powershell");
    const result = await executeCommand(session.id, "echo TestOutput");
    const { destroySession } = require("../dist/execution/terminal/index.js");
    destroySession(session.id);
    
    if (!result.success) throw new Error(`Command failed: ${result.error}`);
    if (!result.output?.includes("TestOutput")) throw new Error("Output mismatch");
    console.log(`    Output: ${result.output.substring(0, 50)}`);
  });

  await test("Terminal: Security blocks dangerous command", async () => {
    const { executeCommand } = require("../dist/execution/terminal/index.js");
    const session = createSession("powershell");
    const result = await executeCommand(session.id, "rm -rf /");
    const { destroySession } = require("../dist/execution/terminal/index.js");
    destroySession(session.id);
    
    if (result.success) throw new Error("Dangerous command should be blocked");
    if (!result.error?.includes("Blocked")) throw new Error("Should be blocked");
    console.log(`    Blocked: ${result.error}`);
  });

  await test("Terminal: Quick exec without session", async () => {
    const { quickExec } = require("../dist/execution/terminal/index.js");
    const result = await quickExec("echo QuickTest", "powershell");
    if (!result.success) throw new Error(`QuickExec failed: ${result.error}`);
    console.log(`    Quick exec success`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Unified Executor 测试
// ═══════════════════════════════════════════════════════════════════════════

async function section3_unifiedTests() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 3: Unified Task Executor 测试");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await test("Unified: Analyze npm command", () => {
    const strategy = analyzeTask("npm install && npm run build");
    if (strategy.mode !== "terminal") throw new Error(`Expected terminal, got ${strategy.mode}`);
    console.log(`    Mode: ${strategy.mode} (${Math.round(strategy.confidence * 100)}%)`);
  });

  await test("Unified: Analyze browser task", () => {
    const strategy = analyzeTask("打开 bilibili.com 搜索视频");
    if (strategy.mode !== "browser") throw new Error(`Expected browser, got ${strategy.mode}`);
    console.log(`    Mode: ${strategy.mode} (${Math.round(strategy.confidence * 100)}%)`);
  });

  await test("Unified: Analyze GUI task", () => {
    const strategy = analyzeTask("点击微信的搜索按钮");
    if (strategy.mode !== "gui") throw new Error(`Expected gui, got ${strategy.mode}`);
    console.log(`    Mode: ${strategy.mode} (${Math.round(strategy.confidence * 100)}%)`);
  });

  await test("Unified: Execute terminal task", async () => {
    const result = await executeWithStrategy("echo UnifiedTest", {
      mode: "terminal",
      confidence: 1,
      reason: "Test",
    });
    if (!result.success) throw new Error(`Failed: ${result.error}`);
    if (result.mode !== "terminal") throw new Error(`Wrong mode: ${result.mode}`);
    console.log(`    Success in ${result.durationMs}ms`);
  });

  await test("Unified: Logs collected", async () => {
    const result = await executeWithStrategy("echo test", {
      mode: "terminal",
      confidence: 1,
      reason: "Test",
    });
    if (!result.logs || result.logs.length === 0) throw new Error("No logs collected");
    console.log(`    Logs: ${result.logs.length} entries`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Native Module 测试
// ═══════════════════════════════════════════════════════════════════════════

async function section4_nativeTests() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 4: Native Module 测试");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await test("Native: Module loads", () => {
    const native = require("../packages/core-native/index.js");
    if (!native) throw new Error("Native module not loaded");
    console.log(`    Functions: ${Object.keys(native).length}`);
  });

  await test("Native: Screenshot available", () => {
    const native = require("../packages/core-native/index.js");
    if (!native.captureScreen) throw new Error("captureScreen not available");
    const result = native.captureScreen(".state/test-native.png");
    if (!result.success) throw new Error(`Screenshot failed: ${result.error}`);
    console.log(`    Screenshot: ${result.durationMs}ms`);
  });

  await test("Native: UIA elements", () => {
    const native = require("../packages/core-native/index.js");
    if (!native.getUiElements) throw new Error("getUiElements not available");
    const elements = native.getUiElements(null);
    if (elements.length === 0) throw new Error("No elements found");
    console.log(`    Elements: ${elements.length}`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: 历史版本回归
// ═══════════════════════════════════════════════════════════════════════════

async function section5_regressionTests() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 5: 历史版本功能回归 (26w11a-26w13a)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const tests = [
    { name: "26w11a: Native screenshot", fn: () => {
      const native = require("../packages/core-native/index.js");
      const result = native.captureScreen(".state/regression.png");
      if (!result.success) throw new Error("Screenshot failed");
    }},
    { name: "26w11a: UIA elements", fn: () => {
      const native = require("../packages/core-native/index.js");
      const elements = native.getUiElements(null);
      if (elements.length === 0) throw new Error("No elements");
    }},
    { name: "26w13a: Terminal basic", fn: async () => {
      const { quickExec } = require("../dist/execution/terminal/index.js");
      const result = await quickExec("echo OK", "powershell");
      if (!result.success) throw new Error("Failed");
    }},
    { name: "26w13a: Task routing", fn: () => {
      const strategy = analyzeTask("git status");
      if (strategy.mode !== "terminal") throw new Error("Routing changed");
    }},
  ];

  for (const { name, fn } of tests) {
    await test(`Regression: ${name}`, fn);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w14a 全面深度测试 v2                            ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const startTime = Date.now();

  await section1_browserTests();
  await section2_terminalTests();
  await section3_unifiedTests();
  await section4_nativeTests();
  await section5_regressionTests();

  const duration = Date.now() - startTime;

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  测试总结");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ 通过: ${TESTS.passed}`);
  console.log(`  ❌ 失败: ${TESTS.failed}`);
  console.log(`  ⏭️  跳过: ${TESTS.skipped}`);
  console.log(`  📊 总计: ${TESTS.passed + TESTS.failed + TESTS.skipped}`);
  console.log(`  ⏱️  耗时: ${(duration / 1000).toFixed(1)}s`);
  
  const totalRun = TESTS.passed + TESTS.failed;
  const passRate = totalRun > 0 ? TESTS.passed / totalRun : 0;
  console.log(`  📈 通过率: ${(passRate * 100).toFixed(1)}%`);
  console.log("═══════════════════════════════════════════════════════════════");

  const canProceed = passRate >= 0.7 && TESTS.failed === 0;

  if (canProceed) {
    console.log("\n✅ 测试通过，可以开始 26w15a 开发");
  } else if (passRate >= 0.7) {
    console.log("\n⚠️  测试部分通过，建议修复失败项后开发");
  } else {
    console.log("\n❌ 测试未通过，需要修复后重新测试");
  }

  // Save report
  const report = {
    version: "26w14a-v2",
    timestamp: new Date().toISOString(),
    duration,
    summary: { passed: TESTS.passed, failed: TESTS.failed, skipped: TESTS.skipped },
    passRate,
    canProceed,
    results: TESTS.results,
  };
  
  await import("node:fs").then(fs => 
    fs.promises.writeFile("test/26w14a-comprehensive-report-v2.json", JSON.stringify(report, null, 2))
  );
  
  console.log("\n📄 报告已保存: test/26w14a-comprehensive-report-v2.json");

  process.exit(canProceed ? 0 : 1);
}

runAllTests();
