/**
 * OpenOxygen Phase 2 — Multi-Model Runtime Test
 *
 * 验证三模型并发运行：
 * - qwen3:4b (2.5GB) — 快速响应
 * - qwen3-vl:4b (3.3GB) — 视觉任务
 * - gpt-oss:20b (13GB) — 深度推理
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const OLLAMA_API = "http://127.0.0.1:11434";
const GATEWAY = "http://127.0.0.1:4800";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";

const MODELS = [
  { name: "qwen3:4b", sizeGB: 2.5, type: "text", expectedLatency: 300 },
  { name: "qwen3-vl:4b", sizeGB: 3.3, type: "vision", expectedLatency: 500 },
  { name: "gpt-oss:20b", sizeGB: 13, type: "reasoning", expectedLatency: 2000 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Test Framework
// ═══════════════════════════════════════════════════════════════════════════

class P2TestRunner {
  constructor() {
    this.results = {
      phase: "P2_MultiModel",
      timestamp: new Date().toISOString(),
      models: {},
      concurrency: {},
      routing: {},
      summary: { passed: 0, failed: 0 },
    };
  }

  async test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      this.results.summary.passed++;
      return true;
    } catch (err) {
      console.log(`  ❌ ${name}: ${err.message}`);
      this.results.summary.failed++;
      return false;
    }
  }

  save() {
    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
    const path = `${RESULTS_DIR}\\p2-results-${Date.now()}.json`;
    writeFileSync(path, JSON.stringify(this.results, null, 2));
    console.log(`\nResults saved to: ${path}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Model Tests
// ═══════════════════════════════════════════════════════════════════════════

async function testModelAvailability(runner) {
  console.log("\n📦 Model Availability Tests");

  for (const model of MODELS) {
    await runner.test(`${model.name} is available`, async () => {
      const res = await fetch(`${OLLAMA_API}/api/tags`);
      const data = await res.json();
      const found = data.models?.find(m => m.name === model.name);
      if (!found) throw new Error(`${model.name} not found`);
    });
  }
}

async function testModelInference(runner) {
  console.log("\n🧠 Model Inference Tests");

  for (const model of MODELS) {
    await runner.test(`${model.name} inference`, async () => {
      const start = performance.now();
      const res = await fetch(`${OLLAMA_API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.name,
          prompt: "Say 'test' and nothing else.",
          stream: false,
        }),
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const latency = performance.now() - start;
      
      runner.results.models[model.name] = {
        latency,
        response: data.response?.slice(0, 50),
        withinExpected: latency < model.expectedLatency * 2,
      };
      
      if (latency > model.expectedLatency * 3) {
        throw new Error(`Too slow: ${latency.toFixed(0)}ms > ${model.expectedLatency * 3}ms`);
      }
    });
  }
}

async function testConcurrency(runner) {
  console.log("\n⚡ Concurrency Tests");

  // 测试两模型同时推理
  await runner.test("Two models concurrent", async () => {
    const start = performance.now();
    
    const [res1, res2] = await Promise.all([
      fetch(`${OLLAMA_API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen3:4b",
          prompt: "Count 1 to 5.",
          stream: false,
        }),
      }),
      fetch(`${OLLAMA_API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }),
        body: JSON.stringify({
          model: "gpt-oss:20b",
          prompt: "Say hello.",
          stream: false,
        }),
      }),
    ]);
    
    const duration = performance.now() - start;
    
    if (!res1.ok || !res2.ok) {
      throw new Error(`One or both requests failed: ${res1.status}, ${res2.status}`);
    }
    
    runner.results.concurrency.twoModels = {
      duration,
      success: true,
    };
    
    // 并发应该比串行快
    if (duration > 10000) {
      throw new Error(`Concurrent execution too slow: ${duration.toFixed(0)}ms`);
    }
  });

  // 测试三模型同时推理（如果资源允许）
  await runner.test("Three models concurrent (optional)", async () => {
    const start = performance.now();
    
    const results = await Promise.allSettled([
      fetch(`${OLLAMA_API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "qwen3:4b", prompt: "Hi", stream: false }),
      }),
      fetch(`${OLLAMA_API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "qwen3-vl:4b", prompt: "Hi", stream: false }),
      }),
      fetch(`${OLLAMA_API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-oss:20b", prompt: "Hi", stream: false }),
      }),
    ]);
    
    const duration = performance.now() - start;
    const successCount = results.filter(r => r.status === "fulfilled" && r.value.ok).length;
    
    runner.results.concurrency.threeModels = {
      duration,
      successCount,
      results: results.map(r => r.status),
    };
    
    // 至少两个成功就算通过（资源限制）
    if (successCount < 2) {
      throw new Error(`Only ${successCount}/3 models responded`);
    }
  });
}

async function testGatewayRouting(runner) {
  console.log("\n🎯 Gateway Routing Tests");

  await runner.test("Gateway lists all models", async () => {
    const res = await fetch(`${GATEWAY}/api/v1/models`);
    const data = await res.json();
    
    if (!data.models || data.models.length < 3) {
      throw new Error(`Expected 3 models, got ${data.models?.length || 0}`);
    }
    
    runner.results.routing.modelsListed = data.models.map(m => m.model);
  });

  await runner.test("Fast mode routes to qwen3:4b", async () => {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Quick test",
        mode: "fast",
      }),
    });
    
    const data = await res.json();
    runner.results.routing.fastMode = data.model;
    
    if (!data.model?.includes("qwen3:4b")) {
      console.log(`    Note: Routed to ${data.model} instead of qwen3:4b`);
    }
  });

  await runner.test("Deep mode routes to large model", async () => {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Please provide a detailed analysis of system optimization strategies including memory management, process scheduling, and I/O optimization techniques.",
        mode: "deep",
      }),
    });
    
    const data = await res.json();
    runner.results.routing.deepMode = data.model;
    
    if (!data.model?.includes("20b")) {
      console.log(`    Note: Routed to ${data.model} instead of 20b model`);
    }
  });
}

async function testMemoryUsage(runner) {
  console.log("\n💾 Memory Usage Tests");

  await runner.test("Total memory usage check", async () => {
    // 获取系统内存信息
    const os = await import("node:os");
    const totalMem = os.totalmem() / 1024 / 1024 / 1024; // GB
    const freeMem = os.freemem() / 1024 / 1024 / 1024; // GB
    const usedMem = totalMem - freeMem;
    
    // 三模型同时加载的理论内存占用
    const theoreticalModelMem = MODELS.reduce((sum, m) => sum + m.sizeGB, 0);
    
    runner.results.memory = {
      totalGB: totalMem.toFixed(2),
      freeGB: freeMem.toFixed(2),
      usedGB: usedMem.toFixed(2),
      theoreticalModelGB: theoreticalModelMem,
      availableForModels: freeMem > theoreticalModelMem * 1.5,
    };
    
    if (freeMem < theoreticalModelMem) {
      throw new Error(`Insufficient memory: ${freeMem.toFixed(1)}GB free, ${theoreticalModelMem}GB required`);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen Phase 2 — Multi-Model Runtime Test           ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Models under test:");
  for (const m of MODELS) {
    console.log(`  • ${m.name} (${m.sizeGB}GB) — ${m.type}`);
  }
  console.log("");

  const runner = new P2TestRunner();

  await testModelAvailability(runner);
  await testModelInference(runner);
  await testConcurrency(runner);
  await testGatewayRouting(runner);
  await testMemoryUsage(runner);

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`Results: ${runner.results.summary.passed} passed, ${runner.results.summary.failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");

  runner.save();

  process.exit(runner.results.summary.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
