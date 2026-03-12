/**
 * OpenOxygen — LLM + Vision + Input Integration Test
 *
 * 验证完整的 Agent 循环：
 * 推理 → 视觉感知 → 输入执行 → 反馈验证
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const GATEWAY = "http://127.0.0.1:4800";
const NATIVE_PATH = "D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js";
let passed = 0, failed = 0;

function assert(label, condition, detail) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label} — ${detail ?? "FAILED"}`); failed++; }
}

async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${GATEWAY}${path}`, opts);
  return { status: res.status, data: await res.json() };
}

async function main() {
  const native = require(NATIVE_PATH);

  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   OpenOxygen LLM + Vision + Input Integration Test       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");

  // ─── 1. LLM Multi-turn Conversation ──────────────────────────
  console.log("1. LLM Multi-turn Conversation");
  {
    const r1 = await api("POST", "/api/v1/chat", { message: "你好" });
    assert("Chinese greeting works", r1.status === 200 && r1.data.content.length > 0);

    const r2 = await api("POST", "/api/v1/chat", {
      messages: [
        { role: "system", content: "You are a Windows automation expert." },
        { role: "user", content: "How do I take a screenshot?" },
        { role: "assistant", content: "You can use the screen capture tool." },
        { role: "user", content: "Please do it now." },
      ],
      mode: "balanced",
    });
    assert("Multi-turn with history", r2.status === 200);
    assert("Mode respected", r2.data.mode === "balanced");
    assert("Provider tracked", !!r2.data.provider);
    assert("Duration tracked", r2.data.durationMs > 0);
    assert("Token usage present", r2.data.usage?.totalTokens > 0);
  }
  console.log("");

  // ─── 2. Task Planning with Context ───────────────────────────
  console.log("2. Task Planning with Context");
  {
    const r = await api("POST", "/api/v1/plan", {
      goal: "Open Notepad, type 'Hello World', save as test.txt on Desktop",
      context: "Windows 11, user is Sails, Desktop path is C:\\Users\\Sails\\Desktop",
    });
    assert("Plan created", r.status === 200 && !!r.data.id);
    assert("Plan has goal", r.data.goal.includes("Notepad"));
    assert("Plan has status", r.data.status === "executing" || r.data.status === "planning");
  }
  console.log("");

  // ─── 3. Inference Mode Auto-detection ────────────────────────
  console.log("3. Inference Mode Auto-detection");
  {
    const fast = await api("POST", "/api/v1/chat", { message: "Hi" });
    assert("Short message → fast mode", fast.data.mode === "fast");

    const deep = await api("POST", "/api/v1/chat", {
      message: "请详细分析当前系统的所有运行进程，找出占用内存最多的前10个，并制定一个完整的系统优化规划方案，包括清理临时文件、优化启动项、调整虚拟内存设置",
    });
    assert("Long complex message → deep mode", deep.data.mode === "deep");
  }
  console.log("");

  // ─── 4. Native Vision: UI Automation ─────────────────────────
  console.log("4. Native Vision: UI Automation");
  {
    const elements = native.getUiElements(null);
    assert("UIA detects elements", elements.length > 0);
    assert("Elements have names", elements.some(e => e.name.length > 0));
    assert("Elements have bounds", elements.every(e => typeof e.x === "number"));
    assert("Elements have control types", elements.every(e => e.controlType.length > 0));

    const buttons = elements.filter(e => e.controlType === "Button");
    assert("Buttons detected", buttons.length > 0);
    console.log(`     Found ${elements.length} elements, ${buttons.length} buttons`);

    const focused = native.getFocusedElement();
    assert("Focused element available", focused !== null);
  }
  console.log("");

  // ─── 5. Native Vision: Image Processing ──────────────────────
  console.log("5. Native Vision: Image Processing Pipeline");
  {
    const capturePath = "D:\\Coding\\OpenOxygen\\test\\llm_test_capture.png";
    const edgePath = "D:\\Coding\\OpenOxygen\\test\\llm_test_edges.png";

    const cap = native.captureScreen(capturePath);
    assert("Screen capture", cap.success);
    assert(`Resolution: ${cap.width}×${cap.height}`, cap.width > 0);
    assert(`Capture time: ${cap.durationMs.toFixed(0)}ms`, cap.durationMs < 500);

    const edges = native.detectEdges(capturePath, edgePath);
    assert("Edge detection", edges === true);

    const regions = native.detectConnectedRegions(edgePath, 300, 50);
    assert("Connected regions detected", regions.length > 0);
    const types = [...new Set(regions.map(r => r.label))];
    console.log(`     ${regions.length} regions, types: ${types.join(", ")}`);

    // Cleanup
    const fsp = await import("node:fs/promises");
    await fsp.unlink(capturePath).catch(() => {});
    await fsp.unlink(edgePath).catch(() => {});
  }
  console.log("");

  // ─── 6. Input System v2 ──────────────────────────────────────
  console.log("6. Input System v2");
  {
    const priv = native.getPrivilegeInfo();
    assert("Privilege info available", typeof priv.isAdmin === "boolean");
    assert(`Integrity level: ${priv.integrityLevel}`, priv.integrityLevel.length > 0);
    assert("Can inject input", priv.canInjectInput === true);

    const metrics = native.getScreenMetrics();
    assert(`Screen: ${metrics.physicalWidth}×${metrics.physicalHeight}`, metrics.physicalWidth > 0);
    assert(`DPI: ${metrics.dpiX}×${metrics.dpiY}`, metrics.dpiX > 0);
    assert(`Scale: ${metrics.scaleFactor}`, metrics.scaleFactor > 0);

    const coordPhys = native.logicalToPhysical(100, 100);
    const coordLog = native.physicalToLogical(100, 100);
    assert("Coordinate conversion works", coordPhys.length === 2 && coordLog.length === 2);

    // Smooth mouse move (small movement to avoid disruption)
    const smooth = native.mouseMoveSmooth(
      Math.round(metrics.physicalWidth / 2),
      Math.round(metrics.physicalHeight / 2),
      150, "bezier"
    );
    assert("Smooth mouse move (bezier)", smooth.success);

    // Input sequence replay
    const replay = native.replayInputSequence([
      { actionType: "wait", delayMs: 50 },
      { actionType: "move", x: 500, y: 400, delayMs: 100 },
      { actionType: "wait", delayMs: 50 },
    ]);
    assert("Input sequence replay", replay.success);
  }
  console.log("");

  // ─── 7. SIMD Vector Search ───────────────────────────────────
  console.log("7. SIMD Vector Search Performance");
  {
    // Generate 1000 random 128-dim vectors
    const dim = 128;
    const count = 1000;
    const docs = [];
    for (let i = 0; i < count; i++) {
      const v = [];
      for (let j = 0; j < dim; j++) v.push(Math.random());
      docs.push(v);
    }
    const query = docs[42]; // known match

    const start = performance.now();
    const results = native.vectorSearch(query, docs, 5);
    const elapsed = performance.now() - start;

    assert(`1000×128 vector search in ${elapsed.toFixed(2)}ms`, elapsed < 100);
    assert("Top result is exact match (index 42)", results[0]?.index === 42);
    assert("Top result score ≈ 1.0", results[0]?.score > 0.99);
    assert("Returns 5 results", results.length === 5);
  }
  console.log("");

  // ─── 8. Process & Window Management ──────────────────────────
  console.log("8. Process & Window Management");
  {
    const procs = native.listProcesses();
    assert(`${procs.length} processes detected`, procs.length > 10);

    const topMem = procs.sort((a, b) => b.memoryBytes - a.memoryBytes).slice(0, 3);
    for (const p of topMem) {
      console.log(`     ${p.name}: ${Math.round(p.memoryBytes / 1024 / 1024)}MB`);
    }

    const windows = native.listWindows();
    assert(`${windows.length} visible windows`, windows.length > 0);

    const fg = native.getForegroundWindowInfo();
    assert("Foreground window detected", fg !== null);
    if (fg) console.log(`     Foreground: "${fg.title}"`);
  }
  console.log("");

  // ─── 9. Error Resilience ─────────────────────────────────────
  console.log("9. Error Resilience");
  {
    // Invalid requests should not crash
    const r1 = await api("POST", "/api/v1/chat", { message: "" });
    assert("Empty message handled", r1.status === 200 || r1.status === 400);

    const r2 = await api("POST", "/api/v1/chat", { message: "x".repeat(50000) });
    assert("Large message handled", r2.status === 200);

    const r3 = await api("POST", "/api/v1/plan", { goal: "" });
    assert("Empty goal handled", r3.status === 400);
  }
  console.log("");

  // ─── Summary ─────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error("Test error:", e); process.exit(1); });
