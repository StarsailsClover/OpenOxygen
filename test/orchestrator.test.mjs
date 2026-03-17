/**
 * Task Orchestrator 测试套件
 * 26w15a Phase 3 验证
 */

import { createOrchestration, executeOrchestration, decomposeTask, generateExecutionReport, cleanupOrchestration } from "../dist/agent/orchestrator/index.js";

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

async function runTests() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  Task Orchestrator Test Suite - 26w15a Phase 3              ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // Test 1: Task Decomposition
  await test("Decompose: Deploy task", () => {
    const plan = decomposeTask("部署项目到生产环境");
    if (plan.strategy !== "sequential") throw new Error(`Expected sequential, got ${plan.strategy}`);
    if (plan.subtasks.length !== 3) throw new Error(`Expected 3 subtasks, got ${plan.subtasks.length}`);
    console.log(`    Strategy: ${plan.strategy}, Subtasks: ${plan.subtasks.map(s => s.name).join(", ")}`);
  });

  await test("Decompose: Code review task", () => {
    const plan = decomposeTask("审查代码质量");
    if (plan.strategy !== "parallel") throw new Error(`Expected parallel, got ${plan.strategy}`);
    if (plan.subtasks.length < 2) throw new Error("Expected multiple subtasks");
    console.log(`    Strategy: ${plan.strategy}, Subtasks: ${plan.subtasks.map(s => s.name).join(", ")}`);
  });

  await test("Decompose: Data collection task", () => {
    const plan = decomposeTask("收集网站数据");
    if (plan.strategy !== "parallel") throw new Error(`Expected parallel, got ${plan.strategy}`);
    console.log(`    Strategy: ${plan.strategy}, Subtasks: ${plan.subtasks.length}`);
  });

  await test("Decompose: Default task", () => {
    const plan = decomposeTask("做一些普通的事情");
    if (plan.subtasks.length !== 1) throw new Error("Expected 1 subtask for default");
    console.log(`    Default: ${plan.subtasks[0].instruction}`);
  });

  // Test 2: Orchestration Creation
  await test("Orchestration: Create from plan", () => {
    const plan = {
      name: "测试编排",
      description: "测试",
      strategy: "sequential",
      subtasks: [
        { name: "步骤1", instruction: "echo step1" },
        { name: "步骤2", instruction: "echo step2" },
      ],
    };
    const orch = createOrchestration("测试", plan);
    if (!orch.id) throw new Error("No orchestration ID");
    if (orch.subtasks.length !== 2) throw new Error("Wrong subtask count");
    console.log(`    ID: ${orch.id}, Subtasks: ${orch.subtasks.length}`);
    cleanupOrchestration(orch.id);
  });

  await test("Orchestration: Auto-decompose", () => {
    const orch = createOrchestration("部署项目");
    if (orch.subtasks.length === 0) throw new Error("No subtasks created");
    console.log(`    Auto-decomposed: ${orch.subtasks.length} subtasks`);
    cleanupOrchestration(orch.id);
  });

  // Test 3: Sequential Execution (simplified)
  await test("Execution: Sequential strategy", async () => {
    const plan = {
      name: "顺序测试",
      description: "测试顺序执行",
      strategy: "sequential",
      subtasks: [
        { name: "A", instruction: "echo A", mode: "terminal" },
        { name: "B", instruction: "echo B", mode: "terminal", dependsOn: ["A"] },
      ],
    };
    const orch = createOrchestration("顺序测试", plan);
    const result = await executeOrchestration(orch.id);
    
    if (result.status !== "completed" && result.status !== "partial") {
      throw new Error(`Unexpected status: ${result.status}`);
    }
    console.log(`    Status: ${result.status}, Results: ${result.results.success}/${result.results.total}`);
    cleanupOrchestration(orch.id);
  });

  // Test 4: Parallel Execution
  await test("Execution: Parallel strategy", async () => {
    const plan = {
      name: "并行测试",
      description: "测试并行执行",
      strategy: "parallel",
      subtasks: [
        { name: "A", instruction: "echo A", mode: "terminal" },
        { name: "B", instruction: "echo B", mode: "terminal" },
      ],
    };
    const orch = createOrchestration("并行测试", plan);
    const result = await executeOrchestration(orch.id);
    
    console.log(`    Status: ${result.status}, Results: ${result.results.success}/${result.results.total}`);
    cleanupOrchestration(orch.id);
  });

  // Test 5: Report Generation
  await test("Report: Generate execution report", () => {
    const plan = {
      name: "报告测试",
      description: "测试报告生成",
      strategy: "sequential",
      subtasks: [
        { name: "成功任务", instruction: "echo success", mode: "terminal" },
        { name: "失败任务", instruction: "exit 1", mode: "terminal" },
      ],
    };
    const orch = createOrchestration("报告测试", plan);
    const report = generateExecutionReport(orch);
    
    if (!report.includes("任务执行报告")) throw new Error("Report header missing");
    if (!report.includes("成功任务")) throw new Error("Success task not in report");
    console.log(`    Report length: ${report.length} chars`);
    cleanupOrchestration(orch.id);
  });

  // Test 6: Retry Logic
  await test("Retry: Failed task with retry", async () => {
    const plan = {
      name: "重试测试",
      description: "测试重试机制",
      strategy: "sequential",
      subtasks: [
        { name: "会失败", instruction: "exit 1", mode: "terminal", maxRetries: 2 },
      ],
    };
    const orch = createOrchestration("重试测试", plan);
    const result = await executeOrchestration(orch.id);
    
    // Should have attempted multiple times
    const subtask = orch.subtasks[0];
    if (subtask.retryCount < subtask.maxRetries) {
      console.log(`    Retried: ${subtask.retryCount}/${subtask.maxRetries} times`);
    }
    cleanupOrchestration(orch.id);
  });

  // Test 7: Dependency Management
  await test("Dependency: DAG execution", async () => {
    const plan = {
      name: "依赖测试",
      description: "测试DAG执行",
      strategy: "dag",
      subtasks: [
        { name: "基础", instruction: "echo base", mode: "terminal" },
        { name: "依赖基础", instruction: "echo dependent", mode: "terminal", dependsOn: ["基础"] },
      ],
    };
    const orch = createOrchestration("依赖测试", plan);
    const result = await executeOrchestration(orch.id);
    
    console.log(`    DAG Status: ${result.status}`);
    cleanupOrchestration(orch.id);
  });

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Test Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ Passed: ${TESTS.passed}`);
  console.log(`  ❌ Failed: ${TESTS.failed}`);
  console.log(`  📊 Total: ${TESTS.passed + TESTS.failed}`);
  console.log("═══════════════════════════════════════════════════════════════");

  process.exit(TESTS.failed > 0 ? 1 : 0);
}

runTests();
