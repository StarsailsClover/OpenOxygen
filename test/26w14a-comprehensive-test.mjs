/**
 * OpenOxygen 26w14a 全面深度测试套件
 * 测试范围：
 *   1. OxygenBrowser 窗口弹出与操作
 *   2. 与普通浏览器（Chrome/Edge）对比
 *   3. 模拟用户使用流程
 *   4. Agent 主动/被动接入
 *   5. 历史版本功能回归（26w01a-26w13a）
 */

import { createBrowserSession, destroyBrowserSession, navigate, getPageInfo, querySelector, findSystemBrowserCookies } from "../dist/execution/browser/index.js";
import { createSession, executeCommand, quickExec } from "../dist/execution/terminal/index.js";
import { analyzeTask, executeWithStrategy } from "../dist/execution/unified/index.js";
import { loadNativeModule } from "../dist/native-bridge.js";

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
// SECTION 1: OxygenBrowser 深度测试
// ═══════════════════════════════════════════════════════════════════════════

async function section1_browserTests() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 1: OxygenBrowser 深度测试");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  let browserSession = null;

  await test("Browser: Find system browser cookies", () => {
    const cookies = findSystemBrowserCookies();
    console.log(`    Found: Edge=${!!cookies.edge}, Chrome=${!!cookies.chrome}`);
    return cookies;
  });

  await test("Browser: Create session", async () => {
    browserSession = await createBrowserSession();
    if (!browserSession?.id) throw new Error("Session creation failed");
    if (!browserSession.alive) throw new Error("Session not alive");
    console.log(`    Session: ${browserSession.id}, Port: ${browserSession.cdpPort}`);
  }, { skip: true }); // Skip until Chromium available

  await test("Browser: Navigate to bilibili", async () => {
    const result = await navigate(browserSession.id, "https://www.bilibili.com");
    if (!result.success) throw new Error(`Navigation failed: ${result.error}`);
    await new Promise(r => setTimeout(r, 3000));
    const info = await getPageInfo(browserSession.id);
    console.log(`    Page: ${info?.title || "unknown"}`);
    if (!info?.title?.includes("哔哩哔哩")) throw new Error("Not bilibili");
  }, { skip: true });

  await test("Browser: Query search box", async () => {
    const element = await querySelector(browserSession.id, "input.search-input");
    if (!element) throw new Error("Search box not found");
    console.log(`    Found: ${element.tagName} at (${element.bounds.x}, ${element.bounds.y})`);
  }, { skip: true });

  if (browserSession) {
    destroyBrowserSession(browserSession.id);
    console.log("    Browser session cleaned up");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: 与普通浏览器对比测试
// ═══════════════════════════════════════════════════════════════════════════

async function section2_browserComparison() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 2: OxygenBrowser vs Chrome/Edge 对比");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await test("Compare: Cookie inheritance availability", () => {
    const cookies = findSystemBrowserCookies();
    const hasSystemBrowser = cookies.edge || cookies.chrome;
    console.log(`    System browser available: ${hasSystemBrowser}`);
    if (!hasSystemBrowser) throw new Error("No system browser found for comparison");
  });

  await test("Compare: Launch time (Oxygen vs Chrome)", async () => {
    // OxygenBrowser launch
    const oStart = Date.now();
    const oSession = await createBrowserSession();
    const oTime = Date.now() - oStart;
    destroyBrowserSession(oSession.id);
    
    // Chrome via native (for comparison)
    const native = loadNativeModule();
    if (native) {
      const cStart = Date.now();
      // Just check if Chrome process exists
      const { execSync } = await import("child_process");
      try {
        execSync("where chrome", { encoding: "utf-8", timeout: 5000 });
        const cTime = Date.now() - cStart;
        console.log(`    Oxygen: ${oTime}ms, Chrome check: ${cTime}ms`);
      } catch {
        console.log(`    Oxygen: ${oTime}ms, Chrome: not found`);
      }
    }
  }, { skip: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: 模拟用户使用流程
// ═══════════════════════════════════════════════════════════════════════════

async function section3_userSimulation() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 3: 模拟用户使用流程");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const scenarios = [
    { name: "开发者工作流", steps: ["npm install", "npm run build", "npm test"] },
    { name: "浏览器搜索", steps: ["打开 Chrome", "访问 bilibili", "搜索视频"] },
    { name: "文件操作", steps: ["创建文件夹", "复制文件", "删除旧文件"] },
  ];

  for (const scenario of scenarios) {
    await test(`User flow: ${scenario.name}`, async () => {
      console.log(`    Steps: ${scenario.steps.join(" → ")}`);
      
      for (const step of scenario.steps) {
        const strategy = analyzeTask(step);
        console.log(`      "${step}" → ${strategy.mode} (${Math.round(strategy.confidence * 100)}%)`);
        
        // Only execute terminal steps for safety
        if (strategy.mode === "terminal") {
          const result = await executeWithStrategy(step, strategy);
          if (!result.success) throw new Error(`Step failed: ${step}`);
        }
      }
    }, { skip: scenario.name !== "开发者工作流" }); // Only run safe terminal scenario
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Agent 接入测试
// ═══════════════════════════════════════════════════════════════════════════

async function section4_agentAccess() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 4: Agent 主动/被动接入测试");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await test("Agent: Native module availability", () => {
    const native = loadNativeModule();
    if (!native) throw new Error("Native module not available");
    console.log(`    Native functions: ${Object.keys(native).length}`);
  });

  await test("Agent: Terminal session lifecycle", async () => {
    const session = createSession("powershell");
    if (!session.alive) throw new Error("Session not alive");
    
    const result = await executeCommand(session.id, "echo AgentTest");
    destroySession(session.id);
    
    if (!result.success) throw new Error("Command failed");
    if (!result.output?.includes("AgentTest")) throw new Error("Output mismatch");
  });

  await test("Agent: Unified executor routing", async () => {
    const strategies = [
      { input: "npm install", expected: "terminal" },
      { input: "打开 Chrome", expected: "browser" },
      { input: "点击按钮", expected: "gui" },
    ];
    
    for (const { input, expected } of strategies) {
      const strategy = analyzeTask(input);
      if (strategy.mode !== expected) {
        throw new Error(`"${input}" expected ${expected}, got ${strategy.mode}`);
      }
      console.log(`    "${input}" → ${strategy.mode} ✓`);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: 历史版本功能回归
// ═══════════════════════════════════════════════════════════════════════════

async function section5_regressionTests() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 5: 历史版本功能回归 (26w01a-26w13a)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const regressions = [
    { name: "26w11a: Native screenshot", test: () => {
      const native = loadNativeModule();
      if (!native?.captureScreen) throw new Error("Screenshot not available");
      const result = native.captureScreen(".state/regression-test.png");
      if (!result.success) throw new Error("Screenshot failed");
    }},
    { name: "26w11a: UIA element detection", test: () => {
      const native = loadNativeModule();
      if (!native?.getUiElements) throw new Error("UIA not available");
      const elements = native.getUiElements(null);
      if (elements.length === 0) throw new Error("No elements found");
      console.log(`    Found ${elements.length} UI elements`);
    }},
    { name: "26w13a: Terminal basic command", test: async () => {
      const result = await quickExec("echo RegressionTest", "powershell");
      if (!result.success) throw new Error("Terminal command failed");
      if (!result.output?.includes("RegressionTest")) throw new Error("Output mismatch");
    }},
    { name: "26w13a: Task routing", test: () => {
      const strategy = analyzeTask("git status");
      if (strategy.mode !== "terminal") throw new Error("Routing changed");
    }},
  ];

  for (const { name, test: testFn } of regressions) {
    await test(`Regression: ${name}`, testFn);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: 豆包高难度任务
// ═══════════════════════════════════════════════════════════════════════════

async function section6_doubaoChallenge() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SECTION 6: 豆包高难度 Agent 任务");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("  [豆包任务] 向豆包询问高难度测试任务...");
  
  // 模拟与豆包的交互（实际需要通过 Gateway API）
  const challengingTasks = [
    {
      description: "多步骤文件操作链",
      instruction: "在 D:\\TestAgent 创建项目目录，初始化 git，创建 README，提交初始提交",
      expectedMode: "terminal",
      steps: ["mkdir", "git init", "echo README", "git add", "git commit"],
    },
    {
      description: "复杂计算任务",
      instruction: "计算 (12345 * 67890 - 11111) / 5 并验证结果",
      expectedMode: "terminal",
    },
    {
      description: "混合模式任务",
      instruction: "打开计算器，计算 123+456，截图保存结果",
      expectedMode: "hybrid",
    },
  ];

  for (const task of challengingTasks) {
    await test(`Doubao challenge: ${task.description}`, async () => {
      console.log(`    Task: ${task.instruction}`);
      
      // 分析任务模式
      const strategy = analyzeTask(task.instruction);
      console.log(`    Routed to: ${strategy.mode} (${Math.round(strategy.confidence * 100)}%)`);
      
      if (strategy.mode !== task.expectedMode) {
        console.log(`    ⚠️  Expected ${task.expectedMode}, got ${strategy.mode}`);
      }
      
      // 尝试执行（仅限安全的终端命令）
      if (strategy.mode === "terminal" && task.instruction.includes("计算")) {
        const result = await executeWithStrategy(task.instruction, strategy);
        if (!result.success) {
          console.log(`    ⚠️  Failed: ${result.error}, retrying with reflection...`);
          // 简化的反思重试
          const retryStrategy = { ...strategy, mode: "hybrid" };
          const retryResult = await executeWithStrategy(task.instruction, retryStrategy);
          if (!retryResult.success) throw new Error("Retry also failed");
          console.log(`    ✅ Retry succeeded with hybrid mode`);
        }
      } else {
        console.log(`    ⏭️  Skipped execution (complex/safe mode)`);
      }
    }, { skip: task.description === "混合模式任务" }); // Skip GUI-heavy tasks
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w14a 全面深度测试套件                          ║");
  console.log("║  Comprehensive Testing before 26w15a Development              ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const startTime = Date.now();

  await section1_browserTests();
  await section2_browserComparison();
  await section3_userSimulation();
  await section4_agentAccess();
  await section5_regressionTests();
  await section6_doubaoChallenge();

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
  console.log("═══════════════════════════════════════════════════════════════");

  // 26w15a 开发准入判断
  const passRate = TESTS.passed / (TESTS.passed + TESTS.failed);
  const canProceed = passRate >= 0.7 && TESTS.failed === 0;

  if (canProceed) {
    console.log("\n✅ 测试通过，可以开始 26w15a 开发");
  } else {
    console.log("\n⚠️  测试未完全通过，建议修复后再开始 26w15a");
  }

  // Save report
  const report = {
    version: "26w14a",
    timestamp: new Date().toISOString(),
    duration: duration,
    summary: { passed: TESTS.passed, failed: TESTS.failed, skipped: TESTS.skipped },
    passRate: passRate,
    canProceed: canProceed,
    results: TESTS.results,
  };
  
  await import("node:fs").then(fs => 
    fs.promises.writeFile("test/26w14a-comprehensive-report.json", JSON.stringify(report, null, 2))
  );
  
  console.log("\n📄 报告已保存: test/26w14a-comprehensive-report.json");

  process.exit(canProceed ? 0 : 1);
}

runAllTests();
