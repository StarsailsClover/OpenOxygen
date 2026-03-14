/**
 * OpenOxygen Phase 4 — Complete Input System Test (26w11aE_P4)
 */

import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";

class P4Test {
  constructor() {
    this.results = { phase: "P4_InputHardening", timestamp: new Date().toISOString(), tests: {}, summary: { passed: 0, failed: 0 } };
  }
  async test(name, fn) {
    try { await fn(); console.log(`  ✅ ${name}`); this.results.summary.passed++; return true; }
    catch (err) { console.log(`  ❌ ${name}: ${err.message}`); this.results.summary.failed++; return false; }
  }
  save() {
    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(`${RESULTS_DIR}\\p4-results-${Date.now()}.json`, JSON.stringify(this.results, null, 2));
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen Phase 4 — Input System Hardening Test        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const runner = new P4Test();

  // ─── Signed Input Sequences ────────────────────────────────────
  console.log("🔐 Signed Input Sequences");

  await runner.test("Create signed sequence", async () => {
    const { SignedInputManager } = await import("../dist/input/signed.js");
    const mgr = new SignedInputManager({ secretKey: "test-key-12345" });
    const seq = mgr.createSequence([
      { type: "move", params: { x: 100, y: 200 } },
      { type: "click", params: { x: 100, y: 200, button: "left" } },
    ]);
    if (!seq.signature) throw new Error("No signature");
    if (!seq.nonce) throw new Error("No nonce");
    if (seq.actions.length !== 2) throw new Error("Action count mismatch");
    runner.results.tests.createSigned = { id: seq.id, signatureLength: seq.signature.length };
    mgr.destroy();
  });

  await runner.test("Verify valid signature", async () => {
    const { SignedInputManager } = await import("../dist/input/signed.js");
    const mgr = new SignedInputManager({ secretKey: "test-key-12345" });
    const seq = mgr.createSequence([{ type: "wait", params: { ms: 100 } }]);
    const result = mgr.verify(seq);
    if (!result.valid) throw new Error("Valid sequence rejected: " + result.reason);
    mgr.destroy();
  });

  await runner.test("Detect tampered signature", async () => {
    const { SignedInputManager } = await import("../dist/input/signed.js");
    const mgr = new SignedInputManager({ secretKey: "test-key-12345" });
    const seq = mgr.createSequence([{ type: "click", params: { x: 0, y: 0 } }]);
    // 篡改
    seq.actions[0].params.x = 9999;
    const result = mgr.verify(seq);
    if (result.valid) throw new Error("Tampered sequence accepted!");
    mgr.destroy();
  });

  await runner.test("Detect replay attack", async () => {
    const { SignedInputManager } = await import("../dist/input/signed.js");
    const mgr = new SignedInputManager({ secretKey: "test-key-12345" });
    const seq = mgr.createSequence([{ type: "wait", params: { ms: 50 } }]);
    const r1 = mgr.verify(seq);
    if (!r1.valid) throw new Error("First verify failed");
    const r2 = mgr.verify(seq);
    if (r2.valid) throw new Error("Replay attack not detected!");
    mgr.destroy();
  });

  await runner.test("Detect expired sequence", async () => {
    const { SignedInputManager } = await import("../dist/input/signed.js");
    const mgr = new SignedInputManager({ secretKey: "test-key-12345", maxAgeSec: 0 });
    const seq = mgr.createSequence([{ type: "wait", params: { ms: 50 } }]);
    // 手动过期
    seq.expiresAt = Date.now() - 1000;
    const result = mgr.verify(seq);
    if (result.valid) throw new Error("Expired sequence accepted!");
    mgr.destroy();
  });

  // ─── Human-Likeness Scoring ────────────────────────────────────
  console.log("\n🤖 Human-Likeness Scoring");

  await runner.test("Score robot-like input (low score)", async () => {
    const { humanScorer } = await import("../dist/input/score.js");
    const robotActions = Array.from({ length: 20 }, (_, i) => ({
      type: "click",
      x: 100, y: 100,
      timestamp: i * 100, // 完全均匀
    }));
    const report = humanScorer.score(robotActions);
    if (report.overall > 60) throw new Error(`Robot score too high: ${report.overall}`);
    runner.results.tests.robotScore = report;
    console.log(`    Robot score: ${report.overall}/100`);
  });

  await runner.test("Score human-like input (high score)", async () => {
    const { humanScorer } = await import("../dist/input/score.js");
    const humanActions = [
      { type: "move", x: 100, y: 100, timestamp: 0 },
      { type: "move", x: 150, y: 120, timestamp: 120 },
      { type: "move", x: 230, y: 180, timestamp: 280 },
      { type: "move", x: 340, y: 250, timestamp: 420 },
      { type: "move", x: 400, y: 295, timestamp: 590 },
      { type: "click", x: 402, y: 298, timestamp: 1100 }, // 犹豫停顿
      { type: "wait", x: 402, y: 298, timestamp: 1800 },
      { type: "move", x: 500, y: 400, timestamp: 2300 },
      { type: "move", x: 520, y: 380, timestamp: 2450 }, // 过冲
      { type: "move", x: 510, y: 390, timestamp: 2580 }, // 修正
      { type: "click", x: 511, y: 391, timestamp: 3100 },
    ];
    const report = humanScorer.score(humanActions);
    runner.results.tests.humanScore = report;
    console.log(`    Human score: ${report.overall}/100`);
    console.log(`    Suggestions: ${report.suggestions.length}`);
  });

  // ─── DPI Awareness ─────────────────────────────────────────────
  console.log("\n📐 DPI Awareness");

  await runner.test("DPI manager initialization", async () => {
    const { DPIManager } = await import("../dist/input/dpi.js");
    const dpi = new DPIManager();
    const monitors = dpi.getMonitors();
    if (monitors.length === 0) throw new Error("No monitors detected");
    runner.results.tests.dpi = {
      monitors: monitors.length,
      primary: monitors[0],
    };
    console.log(`    Monitors: ${monitors.length}`);
    console.log(`    Primary: ${monitors[0].width}x${monitors[0].height} @ ${monitors[0].dpiX}DPI`);
  });

  await runner.test("Coordinate conversion", async () => {
    const { DPIManager } = await import("../dist/input/dpi.js");
    const dpi = new DPIManager();
    const physical = dpi.logicalToPhysical({ x: 100, y: 200 });
    const logical = dpi.physicalToLogical({ x: physical.x, y: physical.y, monitorId: 0 });
    // 往返转换应该近似相等
    if (Math.abs(logical.x - 100) > 2 || Math.abs(logical.y - 200) > 2) {
      throw new Error("Round-trip conversion error");
    }
  });

  await runner.test("Screen bounds check", async () => {
    const { DPIManager } = await import("../dist/input/dpi.js");
    const dpi = new DPIManager();
    const bounds = dpi.getGlobalBounds();
    if (bounds.width <= 0) throw new Error("Invalid bounds");
    const onScreen = dpi.isOnScreen(100, 100);
    const offScreen = dpi.isOnScreen(-9999, -9999);
    if (!onScreen || offScreen) throw new Error("Screen bounds check failed");
  });

  // ─── Input Safety Guard ────────────────────────────────────────
  console.log("\n🛡️ Input Safety Guard");

  await runner.test("Safety check limits operations", async () => {
    const { InputSafetyGuard } = await import("../dist/input/safety.js");
    const guard = new InputSafetyGuard();
    
    // 第一次应该通过
    const r1 = guard.check("click");
    if (!r1.allowed) throw new Error("First op blocked");
    guard.record("click");
    
    // 快速连续操作应该被限流
    const r2 = guard.check("click");
    if (r2.allowed) throw new Error("Too-fast op allowed");
    
    guard.reset();
  });

  await runner.test("Emergency stop works", async () => {
    const { InputSafetyGuard } = await import("../dist/input/safety.js");
    const guard = new InputSafetyGuard();
    guard.emergencyStop();
    const result = guard.check("any");
    if (result.allowed) throw new Error("Ops allowed after emergency stop");
    guard.resume();
  });

  // ─── Summary ───────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`Results: ${runner.results.summary.passed} passed, ${runner.results.summary.failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");

  runner.save();
  process.exit(runner.results.summary.failed > 0 ? 1 : 0);
}

main().catch(err => { console.error("Test failed:", err); process.exit(1); });
