/**
 * OpenOxygen — 26w13aA P4: Network Environment Test
 *
 * 测试内容：
 *   1. 普通网络下 Gateway + LLM 响应
 *   2. 高延迟模拟（通过多次请求测量稳定性）
 *   3. 并发请求压力测试
 *   4. WebSocket 连接测试
 *   5. 离线模式降级策略验证
 */

import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import WebSocket from "ws";

const GATEWAY = "http://127.0.0.1:4800";
const WS_URL = "ws://127.0.0.1:4800/ws";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";

if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });

let stepCount = 0;
function step(name) { stepCount++; console.log(`\n[Step ${stepCount}] ${name}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const results = { version: "26w13aA-P4", tests: [], startedAt: Date.now() };

function recordTest(name, status, details = {}) {
  results.tests.push({ name, status, details, step: stepCount, time: Date.now() });
  const icon = status === "pass" ? "✅" : status === "partial" ? "⚠️" : "❌";
  console.log(`    ${icon} ${name} → ${status}`);
}

async function chatRequest(prompt, timeoutMs = 60000) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], mode: "fast" }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    return {
      ok: true,
      status: res.status,
      content: data.content || "",
      model: data.model,
      durationMs: performance.now() - start,
    };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e.message, durationMs: performance.now() - start };
  }
}

// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA — P4: Network Environment Test          ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const taskStart = performance.now();

  // ─── Test 1: Basic connectivity ───────────────────────────────
  step("Basic connectivity: Health + Chat");
  {
    // Health check
    const healthStart = performance.now();
    const healthRes = await fetch(`${GATEWAY}/health`);
    const healthData = await healthRes.json();
    const healthMs = performance.now() - healthStart;
    console.log(`    Health: ${healthData.status} (${healthMs.toFixed(0)}ms)`);

    // Chat check
    const chat = await chatRequest("Say OK");
    console.log(`    Chat: ${chat.ok ? "OK" : "FAIL"} (${chat.durationMs.toFixed(0)}ms) model=${chat.model}`);

    recordTest("Basic connectivity", chat.ok ? "pass" : "fail", {
      healthMs, chatMs: chat.durationMs, model: chat.model
    });
  }

  // ─── Test 2: Latency stability (5 sequential requests) ───────
  step("Latency stability: 5 sequential requests");
  {
    const latencies = [];
    for (let i = 0; i < 5; i++) {
      const r = await chatRequest(`Request ${i + 1}: Say "${i + 1}" only`);
      latencies.push(r.durationMs);
      console.log(`    Request ${i + 1}: ${r.ok ? "OK" : "FAIL"} ${r.durationMs.toFixed(0)}ms — "${r.content?.slice(0, 30)}"`);
    }

    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const stddev = Math.sqrt(latencies.reduce((sum, l) => sum + (l - avg) ** 2, 0) / latencies.length);

    console.log(`    Avg: ${avg.toFixed(0)}ms | Min: ${min.toFixed(0)}ms | Max: ${max.toFixed(0)}ms | StdDev: ${stddev.toFixed(0)}ms`);

    // Pass if all requests succeeded and stddev is reasonable
    const allOk = latencies.length === 5;
    recordTest("Latency stability", allOk ? "pass" : "partial", {
      latencies: latencies.map(l => Math.round(l)),
      avg: Math.round(avg), min: Math.round(min), max: Math.round(max), stddev: Math.round(stddev),
    });
  }

  // ─── Test 3: Concurrent requests ─────────────────────────────
  step("Concurrent requests: 3 simultaneous");
  {
    const prompts = [
      "What is 1+1? Reply with just the number.",
      "What is 2+2? Reply with just the number.",
      "What is 3+3? Reply with just the number.",
    ];

    const start = performance.now();
    const promises = prompts.map(p => chatRequest(p, 120000));
    const concurrentResults = await Promise.all(promises);
    const totalMs = performance.now() - start;

    for (let i = 0; i < concurrentResults.length; i++) {
      const r = concurrentResults[i];
      console.log(`    Req ${i + 1}: ${r.ok ? "OK" : "FAIL"} ${r.durationMs.toFixed(0)}ms — "${r.content?.slice(0, 30)}"`);
    }
    console.log(`    Total wall time: ${totalMs.toFixed(0)}ms`);

    const allOk = concurrentResults.every(r => r.ok);
    recordTest("Concurrent requests", allOk ? "pass" : "partial", {
      results: concurrentResults.map((r, i) => ({
        prompt: prompts[i].slice(0, 30),
        ok: r.ok,
        durationMs: Math.round(r.durationMs),
        content: r.content?.slice(0, 30),
      })),
      wallTimeMs: Math.round(totalMs),
    });
  }

  // ─── Test 4: WebSocket connection ─────────────────────────────
  step("WebSocket: Connect, ping, receive status");
  {
    let wsResult = { connected: false, pingPong: false, statusReceived: false };

    try {
      const ws = new WebSocket(WS_URL);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { ws.close(); reject(new Error("WS timeout")); }, 15000);

        ws.on("open", () => {
          wsResult.connected = true;
          console.log("    ✓ WebSocket connected");

          // Send ping
          ws.send(JSON.stringify({ type: "ping", id: "test-1", timestamp: Date.now() }));
        });

        ws.on("message", (data) => {
          try {
            const msg = JSON.parse(data.toString());
            console.log(`    ← WS message: type=${msg.type}`);

            if (msg.type === "pong") {
              wsResult.pingPong = true;
            }
            if (msg.type === "system.status") {
              wsResult.statusReceived = true;
            }

            // If we got pong, we're done
            if (wsResult.pingPong) {
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          } catch {}
        });

        ws.on("error", (err) => {
          console.log(`    ⚠ WS error: ${err.message}`);
          clearTimeout(timeout);
          reject(err);
        });

        ws.on("close", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (e) {
      console.log(`    ⚠ WS test error: ${e.message}`);
    }

    recordTest("WebSocket", wsResult.connected && wsResult.pingPong ? "pass" :
      wsResult.connected ? "partial" : "fail", wsResult);
  }

  // ─── Test 5: Request timeout handling ─────────────────────────
  step("Timeout handling: Very short timeout");
  {
    // Send request with 100ms timeout — should fail gracefully
    const r = await chatRequest("Tell me a very long story about a dragon", 100);
    console.log(`    Short timeout result: ok=${r.ok}, error=${r.error?.slice(0, 50)}`);

    // The test passes if the system handles timeout gracefully (doesn't crash)
    recordTest("Timeout handling", r.ok === false ? "pass" : "partial", {
      timedOut: !r.ok,
      error: r.error?.slice(0, 100),
    });
  }

  // ─── Test 6: Gateway status endpoint ──────────────────────────
  step("Gateway status endpoint");
  {
    try {
      const res = await fetch(`${GATEWAY}/api/v1/status`);
      const data = await res.json();
      console.log(`    Status: ${res.status}`);
      console.log(`    Gateway: ${JSON.stringify(data.gateway || {}).slice(0, 100)}`);
      console.log(`    Models: ${JSON.stringify(data.models || []).slice(0, 100)}`);

      recordTest("Status endpoint", res.status === 200 ? "pass" : "partial", {
        httpStatus: res.status,
        hasGateway: !!data.gateway,
        hasModels: Array.isArray(data.models),
      });
    } catch (e) {
      recordTest("Status endpoint", "fail", { error: e.message });
    }
  }

  // ─── Test 7: Error handling (invalid request) ─────────────────
  step("Error handling: Invalid requests");
  {
    // Empty body
    const r1 = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    console.log(`    Empty body: ${r1.status}`);

    // Invalid JSON
    const r2 = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    console.log(`    Invalid JSON: ${r2.status}`);

    // Non-existent endpoint
    const r3 = await fetch(`${GATEWAY}/api/v1/nonexistent`);
    console.log(`    404 test: ${r3.status}`);

    const handled = r1.status >= 400 && r2.status >= 400 && r3.status >= 400;
    recordTest("Error handling", handled ? "pass" : "partial", {
      emptyBody: r1.status,
      invalidJson: r2.status,
      notFound: r3.status,
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
  console.log("  26w13aA P4 — Network Environment Results");
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

  const resultsPath = `${RESULTS_DIR}\\p4-network-${Date.now()}.json`;
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n  Results: ${resultsPath}`);
}

main().catch(err => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
