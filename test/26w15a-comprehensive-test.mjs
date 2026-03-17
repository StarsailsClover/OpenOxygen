/**
 * OpenOxygen 26w15a 全功能综合测试
 * 
 * 测试范围：
 *   - 26w11a-26w13a: 基础功能回归
 *   - 26w14a: Terminal + Browser + Unified Executor
 *   - 26w15a: Global Memory + Multi-Agent + Task Orchestrator
 * 
 * 测试方式：Agent 主动执行真实任务，新旧功能混合验证
 * 输出：实时终端日志
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { getGlobalMemory, resetGlobalMemory } from "../dist/memory/global/index.js";
import { registerAgent, unregisterAgent, delegateTask, listAgents, executeDelegatedTask } from "../dist/agent/communication/index.js";
import { createOrchestration, executeOrchestration, decomposeTask, generateExecutionReport } from "../dist/agent/orchestrator/index.js";
import { createSession, executeCommand, quickExec } from "../dist/execution/terminal/index.js";
import { analyzeTask, executeWithStrategy } from "../dist/execution/unified/index.js";

const TESTS = { passed: 0, failed: 0, skipped: 0, results: [] };
const LOGS = [];

function log(level, msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${msg}`;
  LOGS.push(line);
  console.log(line);
}

async function test(name, fn, opts = {}) {
  if (opts.skip) { 
    TESTS.skipped++; 
    log("SKIP", name); 
    return; 
  }
  
  log("TEST", `Starting: ${name}`);
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    TESTS.passed++;
    TESTS.results.push({ name, status: "PASS", duration, result });
    log("PASS", `${name} (${duration}ms)`);
    return result;
  } catch (e) {
    TESTS.failed++;
    TESTS.results.push({ name, status: "FAIL", error: e.message });
    log("FAIL", `${name}: ${e.message}`);
    if (opts.critical) throw new Error(`Critical test failed: ${name}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: 26w11a-26w13a 基础功能回归
// ═══════════════════════════════════════════════════════════════════════════

async function section1_regressionTests() {
  log("SECTION", "═══════════════════════════════════════════════════════════════");
  log("SECTION", "  SECTION 1: 26w11a-26w13a 基础功能回归");
  log("SECTION", "═══════════════════════════════════════════════════════════════\n");

  await test("Regression: Native module loads", () => {
    const native = require("../packages/core-native/index.js");
    if (!native) throw new Error("Native module not loaded");
    log("INFO", `Native functions: ${Object.keys(native).length}`);
  });

  await test("Regression: Screenshot capture", () => {
    const native = require("../packages/core-native/index.js");
    const result = native.captureScreen(".state/test-regression.png");
    if (!result.success) throw new Error("Screenshot failed");
    log("INFO", `Screenshot: ${result.durationMs}ms`);
  });

  await test("Regression: UIA elements detection", () => {
    const native = require("../packages/core-native/index.js");
    const elements = native.getUiElements(null);
    if (elements.length === 0) throw new Error("No elements found");
    log("INFO", `UI elements: ${elements.length}`);
  });

  await test("Regression: Gateway health check", async () => {
    const res = await fetch("http://127.0.0.1:4800/health");
    const data = await res.json();
    if (data.status !== "ok") throw new Error("Gateway not healthy");
    log("INFO", `Gateway: ${data.status}`);
  });

  await test("Regression: LLM inference", async () => {
    const res = await fetch("http://127.0.0.1:4800/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Say OK" }] }),
    });
    const data = await res.json();
    if (!data.content) throw new Error("No response");
    log("INFO", `LLM: ${data.model}, ${data.durationMs}ms`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: 26w14a Terminal + Unified Executor
// ═══════════════════════════════════════════════════════════════════════════

async function section2_terminalTests() {
  log("SECTION", "\n═══════════════════════════════════════════════════════════════");
  log("SECTION", "  SECTION 2: 26w14a Terminal + Unified Executor");
  log("SECTION", "═══════════════════════════════════════════════════════════════\n");

  await test("Terminal: Execute echo command", async () => {
    const session = createSession("powershell");
    const result = await executeCommand(session.id, "echo TerminalTest");
    const { destroySession } = require("../dist/execution/terminal/index.js");
    destroySession(session.id);
    
    if (!result.success) throw new Error(`Failed: ${result.error}`);
    if (!result.output?.includes("TerminalTest")) throw new Error("Output mismatch");
    log("INFO", `Output: ${result.output.trim()}`);
  });

  await test("Terminal: Quick exec", async () => {
    const result = await quickExec("echo QuickTest", "powershell");
    if (!result.success) throw new Error("Quick exec failed");
    log("INFO", `Quick exec: ${result.durationMs}ms`);
  });

  await test("Unified: Analyze npm command", () => {
    const strategy = analyzeTask("npm install && npm run build");
    if (strategy.mode !== "terminal") throw new Error(`Expected terminal, got ${strategy.mode}`);
    log("INFO", `Strategy: ${strategy.mode} (${Math.round(strategy.confidence * 100)}%)`);
  });

  await test("Unified: Execute with strategy", async () => {
    const result = await executeWithStrategy("echo UnifiedTest", {
      mode: "terminal",
      confidence: 1,
      reason: "Test",
    });
    if (!result.success) throw new Error(`Failed: ${result.error}`);
    log("INFO", `Unified: ${result.mode}, ${result.durationMs}ms`);
  });

  await test("Unified: Logs collected", async () => {
    const result = await executeWithStrategy("echo test", {
      mode: "terminal",
      confidence: 1,
      reason: "Test",
    });
    if (!result.logs || result.logs.length === 0) throw new Error("No logs");
    log("INFO", `Logs: ${result.logs.length} entries`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: 26w15a Global Memory
// ═══════════════════════════════════════════════════════════════════════════

async function section3_globalMemoryTests() {
  log("SECTION", "\n═══════════════════════════════════════════════════════════════");
  log("SECTION", "  SECTION 3: 26w15a Global Memory System");
  log("SECTION", "═══════════════════════════════════════════════════════════════\n");

  const memory = getGlobalMemory(".state");

  await test("Memory: Set and get preference", () => {
    memory.setPreference("testKey", "testValue");
    const value = memory.getPreference("testKey");
    if (value !== "testValue") throw new Error("Preference mismatch");
    log("INFO", `Preference: ${value}`);
  });

  await test("Memory: Record task", () => {
    const task = memory.recordTask({
      instruction: "npm install",
      mode: "terminal",
      success: true,
      durationMs: 5000,
      metadata: { app: "vscode", keywords: ["npm"] },
    });
    if (!task.id) throw new Error("No task ID");
    log("INFO", `Task recorded: ${task.id}`);
  });

  await test("Memory: Query by mode", () => {
    const tasks = memory.queryTasks({ mode: "terminal", limit: 10 });
    log("INFO", `Terminal tasks: ${tasks.length}`);
  });

  await test("Memory: Context injection", () => {
    const enhanced = memory.injectContext("npm run build");
    if (!enhanced.includes("[上下文参考]")) throw new Error("Context not injected");
    log("INFO", `Enhanced length: ${enhanced.length} chars`);
  });

  await test("Memory: Statistics", () => {
    const stats = memory.getStats();
    log("INFO", `Stats: ${stats.totalTasks} tasks, ${(stats.successRate * 100).toFixed(1)}% success`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: 26w15a Multi-Agent Communication
// ═══════════════════════════════════════════════════════════════════════════

async function section4_multiAgentTests() {
  log("SECTION", "\n═══════════════════════════════════════════════════════════════");
  log("SECTION", "  SECTION 4: 26w15a Multi-Agent Communication");
  log("SECTION", "═══════════════════════════════════════════════════════════════\n");

  await test("Agent: Register and list", () => {
    registerAgent("agent-test-1", "Test Agent 1", "worker", ["terminal", "gui"]);
    registerAgent("agent-test-2", "Test Agent 2", "worker", ["browser"]);
    
    const agents = listAgents();
    if (agents.length < 2) throw new Error("Agents not registered");
    log("INFO", `Registered agents: ${agents.length}`);
    
    unregisterAgent("agent-test-1");
    unregisterAgent("agent-test-2");
  });

  await test("Agent: Delegate task", () => {
    registerAgent("coordinator", "Coordinator", "coordinator");
    registerAgent("worker", "Worker", "worker");
    
    const task = delegateTask("echo delegated", "coordinator", "worker");
    if (!task.id) throw new Error("Task not created");
    log("INFO", `Delegated: ${task.id} from ${task.fromAgent} to ${task.toAgent}`);
    
    unregisterAgent("coordinator");
    unregisterAgent("worker");
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: 26w15a Task Orchestrator
// ═══════════════════════════════════════════════════════════════════════════

async function section5_orchestratorTests() {
  log("SECTION", "\n═══════════════════════════════════════════════════════════════");
  log("SECTION", "  SECTION 5: 26w15a Task Orchestrator");
  log("SECTION", "═══════════════════════════════════════════════════════════════\n");

  await test("Orchestrator: Decompose deploy task", () => {
    const plan = decomposeTask("部署项目到生产环境");
    if (plan.strategy !== "sequential") throw new Error("Wrong strategy");
    log("INFO", `Decomposed: ${plan.subtasks.length} subtasks (${plan.strategy})`);
  });

  await test("Orchestrator: Create and execute", async () => {
    const plan = {
      name: "测试编排",
      description: "测试",
      strategy: "sequential",
      subtasks: [
        { name: "步骤1", instruction: "echo step1", mode: "terminal" },
        { name: "步骤2", instruction: "echo step2", mode: "terminal" },
      ],
    };
    const orch = createOrchestration("测试", plan);
    
    const result = await executeOrchestration(orch.id, {
      onProgress: (o, st) => log("PROGRESS", `${st.name}: ${st.status}`),
    });
    
    log("INFO", `Result: ${result.status}, ${result.results.success}/${result.results.total}`);
  });

  await test("Orchestrator: Generate report", async () => {
    const plan = {
      name: "报告测试",
      description: "测试报告",
      strategy: "sequential",
      subtasks: [
        { name: "成功", instruction: "echo success", mode: "terminal" },
      ],
    };
    const orch = createOrchestration("报告", plan);
    await executeOrchestration(orch.id);
    
    const report = generateExecutionReport(orch);
    if (!report.includes("任务执行报告")) throw new Error("Report invalid");
    log("INFO", `Report: ${report.split('\n')[0]}`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Agent 主动执行任务（新旧功能混合）
// ═══════════════════════════════════════════════════════════════════════════

async function section6_agentExecutionTests() {
  log("SECTION", "\n═══════════════════════════════════════════════════════════════");
  log("SECTION", "  SECTION 6: Agent 主动执行任务（新旧功能混合）");
  log("SECTION", "═══════════════════════════════════════════════════════════════\n");

  // Agent 1: 使用 Terminal + Global Memory
  await test("Agent: Terminal + Memory workflow", async () => {
    const memory = getGlobalMemory(".state");
    
    // 记录偏好
    memory.setPreference("workingDir", "D:\\Projects");
    
    // 执行任务
    const result = await executeWithStrategy("echo Working in $(workingDir)", {
      mode: "terminal",
      confidence: 1,
      reason: "Agent workflow",
    });
    
    // 记录任务
    memory.recordTask({
      instruction: "Agent workflow test",
      mode: "terminal",
      success: result.success,
      durationMs: result.durationMs,
    });
    
    log("INFO", `Agent workflow: ${result.success ? "success" : "failed"}`);
  });

  // Agent 2: 使用 Unified + Orchestrator
  await test("Agent: Unified + Orchestrator workflow", async () => {
    const plan = {
      name: "Agent编排",
      description: "Agent使用编排器",
      strategy: "sequential",
      subtasks: [
        { name: "分析", instruction: "echo Analyzing...", mode: "terminal" },
        { name: "执行", instruction: "echo Executing...", mode: "terminal" },
        { name: "报告", instruction: "echo Reporting...", mode: "terminal" },
      ],
    };
    
    const orch = createOrchestration("Agent编排", plan);
    const result = await executeOrchestration(orch.id);
    
    log("INFO", `Agent orchestration: ${result.status}, ${result.results.success}/${result.results.total}`);
  });

  // Agent 3: 多 Agent 协作
  await test("Agent: Multi-agent collaboration", async () => {
    registerAgent("agent-coordinator", "Coordinator", "coordinator");
    registerAgent("agent-worker-1", "Worker 1", "worker", ["terminal"]);
    registerAgent("agent-worker-2", "Worker 2", "worker", ["terminal"]);
    
    // Coordinator 分配任务给 Workers
    const task1 = delegateTask("echo Worker 1 task", "agent-coordinator", "agent-worker-1");
    const task2 = delegateTask("echo Worker 2 task", "agent-coordinator", "agent-worker-2");
    
    log("INFO", `Multi-agent: ${task1.id}, ${task2.id}`);
    
    unregisterAgent("agent-coordinator");
    unregisterAgent("agent-worker-1");
    unregisterAgent("agent-worker-2");
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w15a 全功能综合测试                              ║");
  console.log("║  Agent 主动执行 + 新旧功能混合验证                            ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const startTime = Date.now();

  try {
    await section1_regressionTests();
    await section2_terminalTests();
    await section3_globalMemoryTests();
    await section4_multiAgentTests();
    await section5_orchestratorTests();
    await section6_agentExecutionTests();
  } catch (e) {
    log("ERROR", `Test suite error: ${e.message}`);
  }

  const duration = Date.now() - startTime;

  // Summary
  log("SECTION", "\n═══════════════════════════════════════════════════════════════");
  log("SECTION", "  测试总结");
  log("SECTION", "═══════════════════════════════════════════════════════════════");
  log("INFO", `  ✅ 通过: ${TESTS.passed}`);
  log("INFO", `  ❌ 失败: ${TESTS.failed}`);
  log("INFO", `  ⏭️  跳过: ${TESTS.skipped}`);
  log("INFO", `  📊 总计: ${TESTS.passed + TESTS.failed + TESTS.skipped}`);
  log("INFO", `  ⏱️  耗时: ${(duration / 1000).toFixed(1)}s`);
  
  const totalRun = TESTS.passed + TESTS.failed;
  const passRate = totalRun > 0 ? TESTS.passed / totalRun : 0;
  log("INFO", `  📈 通过率: ${(passRate * 100).toFixed(1)}%`);
  log("SECTION", "═══════════════════════════════════════════════════════════════");

  // Save report
  const report = {
    version: "26w15a",
    timestamp: new Date().toISOString(),
    duration,
    summary: { passed: TESTS.passed, failed: TESTS.failed, skipped: TESTS.skipped },
    passRate,
    canProceed: passRate >= 0.7,
    logs: LOGS,
    results: TESTS.results,
  };
  
  await import("node:fs").then(fs => 
    fs.promises.writeFile("test/26w15a-comprehensive-report.json", JSON.stringify(report, null, 2))
  );
  
  log("INFO", "📄 报告已保存: test/26w15a-comprehensive-report.json");

  process.exit(TESTS.failed > 0 ? 1 : 0);
}

runAllTests();
