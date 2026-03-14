/**
 * OpenOxygen Phase 5 — Persistence Layer Test (26w11aE_P5)
 */

import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { performance } from "node:perf_hooks";

const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";
const TEST_DB = "D:\\Coding\\OpenOxygen\\test\\test_p5.db";

class P5Test {
  constructor() {
    this.results = { phase: "P5_Persistence", timestamp: new Date().toISOString(), tests: {}, summary: { passed: 0, failed: 0 } };
  }
  async test(name, fn) {
    try { await fn(); console.log(`  ✅ ${name}`); this.results.summary.passed++; }
    catch (err) { console.log(`  ❌ ${name}: ${err.message}`); this.results.summary.failed++; }
  }
  save() {
    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(`${RESULTS_DIR}\\p5-results-${Date.now()}.json`, JSON.stringify(this.results, null, 2));
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen Phase 5 — Persistence Layer Test             ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // 清理旧测试数据库
  try { unlinkSync(TEST_DB); } catch {}

  const runner = new P5Test();

  // ─── SQLite Store ──────────────────────────────────────────────
  console.log("💾 SQLite Store");

  let store;
  await runner.test("Create database", async () => {
    const { SQLiteStore } = await import("../dist/storage/sqlite.js");
    store = new SQLiteStore(TEST_DB);
    if (!store) throw new Error("Store creation failed");
  });

  await runner.test("Session CRUD", async () => {
    store.saveSession({ key: "test-session-1", agentId: "default", createdAt: Date.now(), lastActiveAt: Date.now() });
    store.saveSession({ key: "test-session-2", agentId: "default", channelId: "web", createdAt: Date.now(), lastActiveAt: Date.now() });
    
    const s = store.getSession("test-session-1");
    if (!s) throw new Error("Session not found");
    
    const all = store.listSessions();
    if (all.length !== 2) throw new Error(`Expected 2 sessions, got ${all.length}`);
    
    store.touchSession("test-session-1");
    store.deleteSession("test-session-2");
    
    const remaining = store.listSessions();
    if (remaining.length !== 1) throw new Error(`Expected 1 session, got ${remaining.length}`);
  });

  await runner.test("Audit log", async () => {
    for (let i = 0; i < 100; i++) {
      store.appendAudit({
        id: `audit-${i}`,
        timestamp: Date.now() - (100 - i) * 1000,
        operation: i % 3 === 0 ? "file.read" : i % 3 === 1 ? "process.list" : "screen.capture",
        actor: "test",
        severity: i % 10 === 0 ? "critical" : "info",
      });
    }
    
    const count = store.getAuditCount();
    if (count !== 100) throw new Error(`Expected 100 entries, got ${count}`);
    
    const critical = store.queryAudit({ severity: "critical", limit: 5 });
    if (critical.length === 0) throw new Error("No critical entries found");
    
    const recent = store.queryAudit({ limit: 10 });
    if (recent.length !== 10) throw new Error(`Expected 10 recent, got ${recent.length}`);
    
    runner.results.tests.auditLog = { count, criticalCount: critical.length };
  });

  await runner.test("Vector chunk metadata", async () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      store.saveChunk({
        id: `chunk-${i}`,
        source: "workspace",
        filePath: `/test/file_${i % 50}.ts`,
        startLine: i * 10,
        endLine: i * 10 + 9,
        contentHash: `hash_${i}`,
        chunkSize: 512,
        createdAt: Date.now(),
        expiresAt: i % 5 === 0 ? Date.now() - 1000 : null,
        embeddingDim: 128,
      });
    }
    
    const insertTime = performance.now() - start;
    
    const count = store.getChunkCount();
    if (count !== 1000) throw new Error(`Expected 1000 chunks, got ${count}`);
    
    const byPath = store.getChunksByPath("/test/file_0.ts");
    if (byPath.length === 0) throw new Error("No chunks found by path");
    
    const expired = store.deleteExpiredChunks();
    
    runner.results.tests.vectorChunks = {
      inserted: 1000,
      insertTimeMs: insertTime.toFixed(0),
      expiredRemoved: expired,
      remaining: store.getChunkCount(),
    };
    
    console.log(`    1000 chunks inserted in ${insertTime.toFixed(0)}ms`);
    console.log(`    ${expired} expired chunks removed`);
  });

  await runner.test("Model stats", async () => {
    for (let i = 0; i < 50; i++) {
      store.recordModelUsage({
        model: i % 3 === 0 ? "qwen3:4b" : i % 3 === 1 ? "qwen3-vl:4b" : "gpt-oss:20b",
        provider: "ollama",
        promptTokens: 100 + Math.floor(Math.random() * 500),
        completionTokens: 50 + Math.floor(Math.random() * 200),
        durationMs: 20 + Math.random() * 2000,
        mode: i % 2 === 0 ? "fast" : "deep",
        success: Math.random() > 0.1,
      });
    }
    
    const stats = store.getModelStats();
    if (stats.length !== 3) throw new Error(`Expected 3 model stats, got ${stats.length}`);
    
    runner.results.tests.modelStats = stats;
    for (const s of stats) {
      console.log(`    ${s.model}: ${s.requests} requests, avg ${Math.round(s.avg_duration)}ms`);
    }
  });

  await runner.test("KV store", async () => {
    store.kvSet("test-key", { hello: "world" });
    store.kvSet("expiring-key", "temp", 1); // 1ms TTL
    
    const val = store.kvGet("test-key");
    if (!val || val.hello !== "world") throw new Error("KV get failed");
    
    // 等待过期
    await new Promise(r => setTimeout(r, 50));
    const expired = store.kvGet("expiring-key");
    if (expired !== null) throw new Error("KV expiry failed");
    
    store.kvDelete("test-key");
    const deleted = store.kvGet("test-key");
    if (deleted !== null) throw new Error("KV delete failed");
  });

  await runner.test("Database stats", async () => {
    const stats = store.getStats();
    runner.results.tests.dbStats = stats;
    console.log(`    Sessions: ${stats.sessions}`);
    console.log(`    Audit: ${stats.auditEntries}`);
    console.log(`    Chunks: ${stats.vectorChunks}`);
    console.log(`    KV: ${stats.kvEntries}`);
    console.log(`    Model requests: ${stats.modelRequests}`);
    console.log(`    DB size: ${(stats.dbSizeBytes / 1024).toFixed(0)} KB`);
  });

  await runner.test("Vacuum", async () => {
    store.vacuum();
  });

  // ─── Quantization ─────────────────────────────────────────────
  console.log("\n📐 Vector Quantization");

  await runner.test("Int8 quantization round-trip", async () => {
    const { quantizeFloat64ToInt8, dequantizeInt8ToFloat64 } = await import("../dist/storage/vectors.js");
    
    const original = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    const { quantized, scale, offset } = quantizeFloat64ToInt8(original);
    const restored = dequantizeInt8ToFloat64(quantized, scale, offset);
    
    // 检查误差
    let maxError = 0;
    for (let i = 0; i < original.length; i++) {
      maxError = Math.max(maxError, Math.abs(original[i] - restored[i]));
    }
    
    if (maxError > 0.02) throw new Error(`Quantization error too high: ${maxError.toFixed(4)}`);
    
    // 检查压缩比
    const originalBytes = original.length * 8; // float64
    const quantizedBytes = quantized.length * 1 + 16; // int8 + metadata
    const ratio = originalBytes / quantizedBytes;
    
    runner.results.tests.quantization = { maxError, ratio: ratio.toFixed(1) };
    console.log(`    Max error: ${maxError.toFixed(4)}`);
    console.log(`    Compression: ${ratio.toFixed(1)}x (${originalBytes}B → ${quantizedBytes}B)`);
  });

  // ─── Cleanup ──────────────────────────────────────────────────
  if (store) store.close();
  try { unlinkSync(TEST_DB); } catch {}

  // ─── Summary ──────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`Results: ${runner.results.summary.passed} passed, ${runner.results.summary.failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");

  runner.save();
  process.exit(runner.results.summary.failed > 0 ? 1 : 0);
}

main().catch(err => { console.error("Test failed:", err); process.exit(1); });
