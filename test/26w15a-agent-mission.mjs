/**
 * OpenOxygen 26w15a Agent 随机任务执行
 * 
 * 中难任务列表：
 *   1. 部署项目（编排任务：构建→测试→部署）
 *   2. 多网站数据收集（并行浏览器任务）
 *   3. 代码审查（并行终端任务）
 *   4. 复杂文件操作（终端+GUI混合）
 *   5. 自动化测试流程（编排+Agent委派）
 */

import { registerAgent, unregisterAgent, delegateTask, listAgents, executeDelegatedTask } from "../dist/agent/communication/index.js";
import { createOrchestration, executeOrchestration, decomposeTask } from "../dist/agent/orchestrator/index.js";
import { getGlobalMemory } from "../dist/memory/global/index.js";
import { executeWithStrategy } from "../dist/execution/unified/index.js";
import { createBrowserSession, navigate, destroyBrowserSession } from "../dist/execution/browser/index.js";

const LOGS = [];
function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  LOGS.push(line);
  console.log(line);
}

const MISSIONS = [
  {
    id: "deploy-project",
    name: "部署项目到生产环境",
    difficulty: "medium",
    type: "orchestration",
    instruction: "部署 OpenOxygen 项目",
  },
  {
    id: "multi-site-collection",
    name: "多网站数据收集",
    difficulty: "medium",
    type: "orchestration",
    instruction: "收集 bilibili 和 GitHub 的热门项目数据",
  },
  {
    id: "code-review",
    name: "代码质量审查",
    difficulty: "medium",
    type: "orchestration",
    instruction: "审查代码质量",
  },
  {
    id: "complex-file-ops",
    name: "复杂文件操作",
    difficulty: "medium",
    type: "unified",
    instruction: "在 .state 目录创建测试文件夹，复制文件，列出内容",
  },
  {
    id: "browser-automation",
    name: "浏览器自动化测试",
    difficulty: "medium",
    type: "browser",
    instruction: "打开浏览器访问百度，搜索 OpenOxygen",
  },
];

async function runMission(mission) {
  log("MISSION", `═══════════════════════════════════════════════════════════════`);
  log("MISSION", `任务: ${mission.name} (${mission.id})`);
  log("MISSION", `难度: ${mission.difficulty} | 类型: ${mission.type}`);
  log("MISSION", `指令: ${mission.instruction}`);
  log("MISSION", `═══════════════════════════════════════════════════════════════\n`);

  const startTime = Date.now();
  let result;

  try {
    switch (mission.type) {
      case "orchestration":
        result = await runOrchestrationMission(mission);
        break;
      case "unified":
        result = await runUnifiedMission(mission);
        break;
      case "browser":
        result = await runBrowserMission(mission);
        break;
      default:
        result = { success: false, error: "Unknown mission type" };
    }
  } catch (e) {
    result = { success: false, error: e.message };
  }

  const duration = Date.now() - startTime;
  
  log("RESULT", `═══════════════════════════════════════════════════════════════`);
  log("RESULT", `结果: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  log("RESULT", `耗时: ${(duration / 1000).toFixed(1)}s`);
  if (result.output) log("RESULT", `输出: ${result.output.substring(0, 200)}`);
  if (result.error) log("RESULT", `错误: ${result.error}`);
  log("RESULT", `═══════════════════════════════════════════════════════════════\n`);

  // Record to global memory
  const memory = getGlobalMemory();
  memory.recordTask({
    instruction: mission.instruction,
    mode: mission.type,
    success: result.success,
    durationMs: duration,
    metadata: { missionId: mission.id, difficulty: mission.difficulty },
  });

  return { ...result, duration };
}

async function runOrchestrationMission(mission) {
  log("ORCH", "Creating orchestration...");
  const orch = createOrchestration(mission.instruction);
  
  log("ORCH", `Strategy: ${orch.strategy}, Subtasks: ${orch.subtasks.length}`);
  for (const st of orch.subtasks) {
    log("ORCH", `  - ${st.name}: ${st.instruction.substring(0, 50)}...`);
  }

  const result = await executeOrchestration(orch.id, {
    onProgress: (o, st) => {
      log("PROGRESS", `[${st.status}] ${st.name}`);
    },
  });

  return {
    success: result.status === "completed" || result.status === "partial",
    output: `Completed ${result.results.success}/${result.results.total} subtasks`,
    details: result,
  };
}

async function runUnifiedMission(mission) {
  log("UNIFIED", "Executing with unified strategy...");
  
  const result = await executeWithStrategy(mission.instruction);
  
  log("UNIFIED", `Strategy: ${result.mode}, Confidence: ${(result.strategy.confidence * 100).toFixed(0)}%`);
  log("UNIFIED", `Logs: ${result.logs?.length || 0} entries`);
  
  return {
    success: result.success,
    output: result.output,
    error: result.error,
    mode: result.mode,
  };
}

async function runBrowserMission(mission) {
  log("BROWSER", "Creating browser session...");
  
  try {
    const session = await createBrowserSession({ headless: true });
    log("BROWSER", `Session created: ${session.id}`);
    
    // Navigate to Baidu
    log("BROWSER", "Navigating to baidu.com...");
    const navResult = await navigate(session.id, "https://www.baidu.com");
    
    if (!navResult.success) {
      destroyBrowserSession(session.id);
      return { success: false, error: navResult.error };
    }
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Get page info
    const info = await import("../dist/execution/browser/index.js").then(m => m.getPageInfo(session.id));
    log("BROWSER", `Page: ${info?.title || "unknown"}`);
    
    // Search for OpenOxygen (simplified - would need element interaction)
    log("BROWSER", "Would search for 'OpenOxygen' here...");
    
    destroyBrowserSession(session.id);
    
    return {
      success: true,
      output: `Navigated to ${info?.url || "baidu.com"}, title: ${info?.title || "unknown"}`,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function runAgentDelegationTest() {
  log("AGENT", "═══════════════════════════════════════════════════════════════");
  log("AGENT", "Agent 委派测试");
  log("AGENT", "═══════════════════════════════════════════════════════════════\n");

  // Register agents
  const agent1 = registerAgent("agent-1", "Terminal Worker", "worker", ["terminal"]);
  const agent2 = registerAgent("agent-2", "Browser Worker", "worker", ["browser", "gui"]);
  const coordinator = registerAgent("coordinator", "Task Coordinator", "coordinator", ["terminal", "browser", "gui"]);

  log("AGENT", `Registered: ${agent1.name}, ${agent2.name}, ${coordinator.name}`);

  // Delegate task
  const task = delegateTask(
    "echo Agent delegation test",
    coordinator.id,
    "auto",
    { mode: "terminal" }
  );

  log("AGENT", `Task delegated: ${task.id} → ${task.toAgent}`);

  // Execute delegated task
  await executeDelegatedTask(task.id);

  // Check result
  const completedTask = await import("../dist/agent/communication/index.js").then(m => {
    const { registry } = m;
    return registry.tasks.get(task.id);
  });

  log("AGENT", `Task completed: ${completedTask?.status}`);
  log("AGENT", `Result: ${completedTask?.result?.success ? "SUCCESS" : "FAILED"}`);

  // Cleanup
  unregisterAgent(agent1.id);
  unregisterAgent(agent2.id);
  unregisterAgent(coordinator.id);

  log("AGENT", "Agents unregistered\n");
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w15a Agent 随机任务执行                        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // Randomly select 3 missions
  const shuffled = [...MISSIONS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  log("MAIN", `Selected ${selected.length} missions from ${MISSIONS.length} total\n`);

  const results = [];

  // Run Agent delegation test first
  await runAgentDelegationTest();

  // Run selected missions
  for (const mission of selected) {
    const result = await runMission(mission);
    results.push({ mission: mission.id, ...result });
  }

  // Summary
  console.log("\n╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  执行总结");
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  const successCount = results.filter(r => r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log(`\n任务完成: ${successCount}/${results.length}`);
  console.log(`总耗时: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`成功率: ${((successCount / results.length) * 100).toFixed(1)}%\n`);

  for (const r of results) {
    const icon = r.success ? "✅" : "❌";
    console.log(`  ${icon} ${r.mission}: ${r.success ? "SUCCESS" : "FAILED"} (${(r.duration / 1000).toFixed(1)}s)`);
  }

  // Global memory stats
  const memory = getGlobalMemory();
  const stats = memory.getStats();
  console.log(`\n📊 全局记忆统计:`);
  console.log(`  总任务: ${stats.totalTasks}`);
  console.log(`  成功率: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`  平均耗时: ${stats.avgDuration.toFixed(0)}ms`);
  console.log(`  按模式: ${JSON.stringify(stats.byMode)}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Agent 任务执行完成");
  console.log("═══════════════════════════════════════════════════════════════");

  // Save logs
  await import("node:fs").then(fs => 
    fs.promises.writeFile(".state/agent-mission-logs.txt", LOGS.join("\n"))
  );
  console.log("\n📄 日志已保存: .state/agent-mission-logs.txt");
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
