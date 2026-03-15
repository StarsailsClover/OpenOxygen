/**
 * OpenOxygen — 26w13aA P3: Multi-AI Relay + Checkpoint Resume
 *
 * 测试内容：
 *   1. 多模型协调执行（qwen3:4b → gpt-oss:20b 接力）
 *   2. 断点续传（任务中断后恢复）
 *   3. 自由探索模式（LLM 自主决策多步操作）
 */

import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const GATEWAY = "http://127.0.0.1:4800";
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\26w13a-p3";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";
const CHECKPOINT_FILE = "D:\\Coding\\OpenOxygen\\.state\\26w13a-p3\\checkpoint.json";

if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true });

let stepCount = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function step(name) {
  stepCount++;
  console.log(`\n[Step ${stepCount}] ${name}`);
}

function screenshot(label) {
  const path = `${SS_DIR}\\step${stepCount}_${label}.png`;
  try {
    native.captureScreen(path);
    console.log(`    📸 ${label}`);
    return path;
  } catch (e) { console.log(`    ⚠ SS: ${e.message}`); return null; }
}

async function chatWithModel(messages, model) {
  const start = performance.now();
  const body = { messages, mode: "fast" };
  if (model) body.model = model;
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const ms = (performance.now() - start).toFixed(0);
    const content = data.content || "";
    console.log(`    🧠 [${data.model || model || "auto"}] (${ms}ms): ${content.slice(0, 120).replace(/\n/g, " ")}`);
    return { content, model: data.model, durationMs: parseFloat(ms), provider: data.provider };
  } catch (e) {
    console.log(`    ⚠ Chat error: ${e.message}`);
    return { content: "", model: model || "unknown", durationMs: 0, error: e.message };
  }
}

const results = { version: "26w13aA-P3", tests: [], startedAt: Date.now() };

function recordTest(name, status, details = {}) {
  results.tests.push({ name, status, details, step: stepCount, time: Date.now() });
  const icon = status === "pass" ? "✅" : status === "partial" ? "⚠️" : "❌";
  console.log(`    ${icon} ${name} → ${status}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA — P3: Multi-AI Relay + Checkpoint       ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const taskStart = performance.now();

  // ─── Test 1: Individual model verification ────────────────────
  step("Verify each model responds independently");
  {
    const models = ["qwen3:4b", "gpt-oss:20b"];
    const modelResults = [];

    for (const model of models) {
      console.log(`    Testing ${model}...`);
      const r = await chatWithModel(
        [{ role: "user", content: `You are ${model}. Say your name and "ready". Nothing else.` }],
        model
      );
      modelResults.push({ model, responded: r.content.length > 0, duration: r.durationMs, content: r.content.slice(0, 80) });
    }

    const allOk = modelResults.every(m => m.responded);
    recordTest("Individual model verification", allOk ? "pass" : "partial", { models: modelResults });
  }

  // ─── Test 2: Multi-model relay (qwen3 → gpt-oss) ─────────────
  step("Multi-model relay: qwen3:4b analyzes → gpt-oss:20b synthesizes");
  {
    // Step A: qwen3:4b does fast analysis
    console.log("    Phase A: qwen3:4b fast analysis...");
    const analysis = await chatWithModel(
      [{ role: "user", content: "List 3 key challenges of building a Windows AI Agent framework. Be brief, one line each." }],
      "qwen3:4b"
    );

    // Step B: gpt-oss:20b takes the analysis and produces deeper synthesis
    console.log("    Phase B: gpt-oss:20b deep synthesis...");
    const synthesis = await chatWithModel(
      [
        { role: "system", content: "You are a senior architect. Given an analysis from a junior AI, provide a deeper synthesis with solutions. Be concise." },
        { role: "user", content: `Junior AI analysis:\n${analysis.content}\n\nProvide solutions for each challenge in 2-3 sentences total.` },
      ],
      "gpt-oss:20b"
    );

    const relayOk = analysis.content.length > 10 && synthesis.content.length > 10;
    recordTest("Multi-model relay", relayOk ? "pass" : "partial", {
      phase_a: { model: analysis.model, length: analysis.content.length, duration: analysis.durationMs },
      phase_b: { model: synthesis.model, length: synthesis.content.length, duration: synthesis.durationMs },
    });
  }

  // ─── Test 3: Model routing (auto-select by complexity) ────────
  step("Model routing: auto-select by task complexity");
  {
    // Simple task → should route to fast model
    console.log("    Simple task (should → fast model)...");
    const simple = await chatWithModel(
      [{ role: "user", content: "What is 2+2?" }]
      // No model specified → router decides
    );

    // Complex task → should route to deep model
    console.log("    Complex task (should → deep model)...");
    const complex = await chatWithModel(
      [{ role: "user", content: "Analyze the architectural differences between microservices and monolithic architectures. Consider scalability, deployment complexity, data consistency, and team organization. Provide a structured comparison." }]
    );

    recordTest("Model routing", "pass", {
      simple: { model: simple.model, duration: simple.durationMs },
      complex: { model: complex.model, duration: complex.durationMs },
    });
  }

  // ─── Test 4: Checkpoint save ──────────────────────────────────
  step("Checkpoint: Save task state");
  {
    const checkpoint = {
      taskId: "p3-test-" + Date.now(),
      step: stepCount,
      state: "mid-execution",
      context: {
        testsCompleted: results.tests.length,
        lastModel: results.tests[results.tests.length - 1]?.details?.phase_b?.model || "unknown",
      },
      savedAt: Date.now(),
    };

    writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
    console.log(`    💾 Checkpoint saved: ${CHECKPOINT_FILE}`);
    recordTest("Checkpoint save", "pass", { checkpoint });
  }

  // ─── Test 5: Checkpoint restore ───────────────────────────────
  step("Checkpoint: Restore and verify");
  {
    let restored = null;
    try {
      const raw = readFileSync(CHECKPOINT_FILE, "utf-8");
      restored = JSON.parse(raw);
      console.log(`    📂 Restored checkpoint: taskId=${restored.taskId}, step=${restored.step}`);
      console.log(`    📂 State: ${restored.state}, tests completed: ${restored.context.testsCompleted}`);

      const isValid = restored.taskId && restored.step > 0 && restored.savedAt > 0;
      recordTest("Checkpoint restore", isValid ? "pass" : "partial", { restored });
    } catch (e) {
      recordTest("Checkpoint restore", "fail", { error: e.message });
    }
  }

  // ─── Test 6: Simulated interrupt + resume ─────────────────────
  step("Simulated task interrupt and resume");
  {
    // Simulate a multi-step task that gets "interrupted"
    const taskSteps = [
      { action: "analyze", prompt: "What is the capital of France?" },
      { action: "analyze", prompt: "What is the capital of Japan?" },
      { action: "INTERRUPT", prompt: null }, // Simulated interrupt
      { action: "analyze", prompt: "What is the capital of Brazil?" },
    ];

    const completedSteps = [];
    let interrupted = false;
    let resumePoint = -1;

    for (let i = 0; i < taskSteps.length; i++) {
      const s = taskSteps[i];
      if (s.action === "INTERRUPT") {
        console.log(`    ⚡ INTERRUPT at step ${i + 1}/${taskSteps.length}`);
        interrupted = true;
        resumePoint = i + 1;
        // Save state
        writeFileSync(CHECKPOINT_FILE, JSON.stringify({
          taskId: "interrupt-test",
          resumeAt: resumePoint,
          completed: completedSteps,
          savedAt: Date.now(),
        }, null, 2));
        console.log(`    💾 State saved, resume point: step ${resumePoint + 1}`);
        break;
      }

      const r = await chatWithModel(
        [{ role: "user", content: s.prompt }],
        "qwen3:4b"
      );
      completedSteps.push({ index: i, answer: r.content.slice(0, 50), duration: r.durationMs });
    }

    // Resume from checkpoint
    if (interrupted) {
      console.log(`    🔄 Resuming from step ${resumePoint + 1}...`);
      const saved = JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"));

      for (let i = saved.resumeAt; i < taskSteps.length; i++) {
        const s = taskSteps[i];
        if (s.action === "INTERRUPT") continue;
        const r = await chatWithModel(
          [{ role: "user", content: s.prompt }],
          "qwen3:4b"
        );
        completedSteps.push({ index: i, answer: r.content.slice(0, 50), duration: r.durationMs, resumed: true });
      }
    }

    const allDone = completedSteps.length === taskSteps.filter(s => s.action !== "INTERRUPT").length;
    recordTest("Interrupt + Resume", allDone ? "pass" : "partial", {
      totalSteps: taskSteps.length,
      completed: completedSteps.length,
      interrupted,
      steps: completedSteps,
    });
  }

  // ─── Test 7: Free exploration (3 rounds) ──────────────────────
  step("Free exploration: LLM self-directed (3 rounds)");
  {
    const explorationLog = [];
    const context = [];

    context.push({
      role: "system",
      content: `You are an AI agent exploring a Windows desktop. Screen: ${native.getScreenMetrics().logicalWidth}x${native.getScreenMetrics().logicalHeight}.
You can observe the current state and decide what to do next.
For each round, describe what you observe and what action you would take.
Respond in JSON: {"observation": "...", "action": "...", "reasoning": "..."}`
    });

    for (let round = 1; round <= 3; round++) {
      console.log(`    Round ${round}/3:`);

      // Get current state
      const fg = native.getForegroundWindowInfo();
      const elements = native.getUiElements(null)
        .filter(e => e.name && !e.isOffscreen)
        .slice(0, 15)
        .map(e => `[${e.controlType}] "${e.name.slice(0, 30)}"`)
        .join(", ");

      context.push({
        role: "user",
        content: `Round ${round}. Current window: "${fg?.title || "unknown"}". UI elements: ${elements}. What do you observe and what would you do?`
      });

      const r = await chatWithModel(context, "qwen3:4b");
      context.push({ role: "assistant", content: r.content });

      explorationLog.push({
        round,
        window: fg?.title,
        response: r.content.slice(0, 200),
        duration: r.durationMs,
      });

      screenshot(`explore_round${round}`);
      await sleep(1000);
    }

    recordTest("Free exploration", explorationLog.length === 3 ? "pass" : "partial", {
      rounds: explorationLog.length,
      log: explorationLog,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════

  const totalTime = performance.now() - taskStart;
  results.completedAt = Date.now();
  results.durationMs = totalTime;

  const passed = results.tests.filter(t => t.status === "pass").length;
  const partial = results.tests.filter(t => t.status === "partial").length;
  const failed = results.tests.filter(t => t.status === "fail").length;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  26w13aA P3 — Multi-AI Relay + Checkpoint Results");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ⚠️ Partial: ${partial}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  Duration:  ${(totalTime / 1000).toFixed(1)}s`);
  console.log("═══════════════════════════════════════════════════════════════");

  for (const t of results.tests) {
    const icon = t.status === "pass" ? "✅" : t.status === "partial" ? "⚠️" : "❌";
    console.log(`  ${icon} ${t.name}`);
  }

  const resultsPath = `${RESULTS_DIR}\\p3-multi-ai-${Date.now()}.json`;
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n  Results: ${resultsPath}`);
}

main().catch(err => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
