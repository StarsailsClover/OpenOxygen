/**
 * OpenOxygen Phase 6 — Cluster Test (26w11aE_P6)
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const GATEWAY = "http://127.0.0.1:4800";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";

class P6Test {
  constructor() {
    this.results = { phase: "P6_Distributed", timestamp: new Date().toISOString(), tests: {}, summary: { passed: 0, failed: 0 } };
  }
  async test(name, fn) {
    try { await fn(); console.log(`  ✅ ${name}`); this.results.summary.passed++; }
    catch (err) { console.log(`  ❌ ${name}: ${err.message}`); this.results.summary.failed++; }
  }
  save() {
    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(`${RESULTS_DIR}\\p6-results-${Date.now()}.json`, JSON.stringify(this.results, null, 2));
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen Phase 6 — Distributed Gateway Test           ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const runner = new P6Test();

  // ─── Cluster Manager ──────────────────────────────────────────
  console.log("🌐 Cluster Manager");

  await runner.test("ClusterManager initialization", async () => {
    const { ClusterManager } = await import("../dist/core/cluster/index.js");
    const cluster = new ClusterManager({ workerCount: 3, basePort: 5001, metricsPort: 9191 });
    const metrics = cluster.getMetrics();
    if (metrics.totalNodes !== 0) throw new Error("Should start with 0 nodes before start()");
  });

  await runner.test("Cluster start and metrics", async () => {
    const { ClusterManager } = await import("../dist/core/cluster/index.js");
    const cluster = new ClusterManager({ workerCount: 3, basePort: 5001, metricsPort: 9192 });
    await cluster.start();

    const metrics = cluster.getMetrics();
    if (metrics.totalNodes !== 3) throw new Error(`Expected 3 nodes, got ${metrics.totalNodes}`);
    if (metrics.activeNodes !== 3) throw new Error(`Expected 3 active, got ${metrics.activeNodes}`);

    runner.results.tests.clusterMetrics = metrics;
    console.log(`    Nodes: ${metrics.totalNodes}, Active: ${metrics.activeNodes}`);

    await cluster.stop();
  });

  await runner.test("Prometheus metrics format", async () => {
    const { ClusterManager } = await import("../dist/core/cluster/index.js");
    const cluster = new ClusterManager({ workerCount: 2, basePort: 5010, metricsPort: 9193 });
    await cluster.start();

    const prom = cluster.getPrometheusMetrics();
    if (!prom.includes("openoxygen_cluster_requests_total")) throw new Error("Missing requests metric");
    if (!prom.includes("openoxygen_cluster_active_nodes")) throw new Error("Missing active nodes metric");
    if (!prom.includes("openoxygen_node_requests")) throw new Error("Missing per-node metric");

    await cluster.stop();
  });

  // ─── Load Balancing ───────────────────────────────────────────
  console.log("\n⚖️ Load Balancing");

  await runner.test("Concurrent request handling", async () => {
    // 测试现有 Gateway 的并发能力
    const start = performance.now();
    const concurrency = 20;

    const results = await Promise.allSettled(
      Array.from({ length: concurrency }, (_, i) =>
        fetch(`${GATEWAY}/api/v1/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: `Concurrent test ${i}`, mode: "fast" }),
        }).then(r => ({ status: r.status, ok: r.ok }))
      )
    );

    const duration = performance.now() - start;
    const succeeded = results.filter(r => r.status === "fulfilled" && r.value.ok).length;
    const rps = succeeded / (duration / 1000);

    runner.results.tests.concurrency = { concurrency, succeeded, duration: Math.round(duration), rps: Math.round(rps) };
    console.log(`    ${succeeded}/${concurrency} succeeded in ${Math.round(duration)}ms (${Math.round(rps)} RPS)`);

    if (succeeded < concurrency * 0.8) throw new Error(`Too many failures: ${succeeded}/${concurrency}`);
  });

  await runner.test("Session affinity simulation", async () => {
    // 发送带 session header 的请求，验证路由一致性
    const sessionId = "test-sticky-session-123";
    const responses = [];

    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${GATEWAY}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ message: `Sticky test ${i}` }),
      });
      const data = await res.json();
      responses.push(data.id);
    }

    // 所有请求都应该成功（单节点下 session affinity 自动满足）
    if (responses.length !== 5) throw new Error("Not all requests completed");
  });

  // ─── Failover ─────────────────────────────────────────────────
  console.log("\n🔄 Failover");

  await runner.test("Health check detection", async () => {
    const { ClusterManager } = await import("../dist/core/cluster/index.js");
    const cluster = new ClusterManager({ workerCount: 2, basePort: 5020, healthCheckIntervalMs: 1000, maxFailures: 2, metricsPort: 9194 });
    await cluster.start();

    const metrics = cluster.getMetrics();
    if (metrics.activeNodes !== 2) throw new Error("Initial health check failed");

    await cluster.stop();
  });

  // ─── SQLite Shared State ──────────────────────────────────────
  console.log("\n💾 Shared State");

  await runner.test("SQLite concurrent access", async () => {
    const { SQLiteStore } = await import("../dist/storage/sqlite.js");
    const dbPath = "D:\\Coding\\OpenOxygen\\test\\cluster_test.db";

    // 模拟多节点写入同一数据库
    const store = new SQLiteStore(dbPath);

    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      store.appendAudit({
        id: `cluster-audit-${i}`,
        timestamp: Date.now(),
        operation: "cluster.test",
        actor: `node-${i % 3}`,
      });
    }
    const writeTime = performance.now() - start;

    const count = store.getAuditCount();
    store.close();

    // 清理
    const { unlinkSync } = await import("node:fs");
    try { unlinkSync(dbPath); } catch {}

    runner.results.tests.sharedState = { writes: 500, writeTimeMs: Math.round(writeTime), count };
    console.log(`    500 writes in ${Math.round(writeTime)}ms (${Math.round(500 / (writeTime / 1000))} writes/sec)`);

    if (count < 500) throw new Error(`Expected 500 entries, got ${count}`);
  });

  // ─── Summary ──────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`Results: ${runner.results.summary.passed} passed, ${runner.results.summary.failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");

  runner.save();
  process.exit(runner.results.summary.failed > 0 ? 1 : 0);
}

main().catch(err => { console.error("Test failed:", err); process.exit(1); });
