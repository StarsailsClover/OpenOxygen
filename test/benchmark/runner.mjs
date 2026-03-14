/**
 * OpenOxygen — Comprehensive Benchmark Suite (26w11aD)
 *
 * 针对机器配置、模型大小、输入长度、截图分辨率、并发数、
 * 端到端vs单模块耗时、P50/P95/P99 的系统化测试
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import os from "node:os";
import process from "node:process";

// ═══════════════════════════════════════════════════════════════════════════
// System Info Collection
// ═══════════════════════════════════════════════════════════════════════════

async function getSystemInfo() {
  const info = {
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? "unknown",
    totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
    freeMemoryGB: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
    nodeVersion: process.version,
    versions: process.versions,
  };

  // Try to get GPU info
  try {
    const { execSync } = await import("node:child_process");
    const gpuInfo = execSync("wmic path win32_VideoController get name /value", { encoding: "utf-8" });
    info.gpu = gpuInfo.split("\n").find(l => l.includes("Name"))?.replace("Name=", "").trim() ?? "unknown";
  } catch {
    info.gpu = "unknown";
  }

  return info;
}

// ═══════════════════════════════════════════════════════════════════════════
// Statistical Utilities
// ═══════════════════════════════════════════════════════════════════════════

function calculatePercentiles(sorted) {
  const len = sorted.length;
  return {
    p50: sorted[Math.floor(len * 0.50)] ?? 0,
    p95: sorted[Math.floor(len * 0.95)] ?? 0,
    p99: sorted[Math.floor(len * 0.99)] ?? sorted[len - 1] ?? 0,
    mean: sorted.reduce((a, b) => a + b, 0) / len,
    min: sorted[0] ?? 0,
    max: sorted[len - 1] ?? 0,
    std: Math.sqrt(sorted.map(x => Math.pow(x - (sorted.reduce((a, b) => a + b, 0) / len), 2)).reduce((a, b) => a + b, 0) / len),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Benchmark Tests
// ═══════════════════════════════════════════════════════════════════════════

const GATEWAY = "http://127.0.0.1:4800";
const NATIVE_PATH = "D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js";

async function testNativeModule() {
  const results = { native: {} };
  
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const native = require(NATIVE_PATH);

    // Screen capture test
    const captureTimes = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      const result = native.captureScreen("D:\\Coding\\OpenOxygen\\test\\benchmark\\capture.png");
      captureTimes.push(performance.now() - start);
      if (!result.success) throw new Error("Capture failed");
    }
    results.native.screenCapture = calculatePercentiles([...captureTimes].sort((a, b) => a - b));

    // Vector search test (1000 docs, 128 dim)
    const dim = 128;
    const count = 1000;
    const docs = Array.from({ length: count }, () => 
      Array.from({ length: dim }, () => Math.random())
    );
    const query = docs[42];
    
    const searchTimes = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      const results = native.vectorSearch(query, docs, 10);
      searchTimes.push(performance.now() - start);
    }
    results.native.vectorSearch1000 = calculatePercentiles([...searchTimes].sort((a, b) => a - b));

    // UI Automation test
    const uiaStart = performance.now();
    const elements = native.getUiElements(null);
    results.native.uiAutomation = {
      durationMs: performance.now() - uiaStart,
      elementCount: elements.length,
    };

    // Smooth mouse move test
    const moveTimes = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const result = native.mouseMoveSmooth(960, 540, 300, "bezier");
      moveTimes.push(performance.now() - start);
    }
    results.native.smoothMouseMove = calculatePercentiles([...moveTimes].sort((a, b) => a - b));

  } catch (e) {
    console.error("Native module test failed:", e.message);
    results.native.error = e.message;
  }

  return results;
}

async function testInferenceEngine() {
  const results = { inference: {} };

  // Test different input lengths
  const inputLengths = [
    { name: "short", text: "Hello", tokens: 1 },
    { name: "medium", text: "请帮我分析当前系统的运行状态并制定优化方案", tokens: 20 },
    { name: "long", text: "请详细分析当前系统的所有运行进程，找出占用内存最多的前10个，并制定一个完整的系统优化规划方案，包括清理临时文件、优化启动项、调整虚拟内存设置、分析启动耗时、检查磁盘碎片、评估安全策略，并给出每一步的具体操作命令和预期效果", tokens: 150 },
  ];

  for (const { name, text, tokens } of inputLengths) {
    const times = [];
    for (let i = 0; i < 15; i++) {
      const start = performance.now();
      try {
        const resp = await fetch(`${GATEWAY}/api/v1/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, mode: "fast" }),
        });
        await resp.json();
        times.push(performance.now() - start);
      } catch {
        times.push(-1);
      }
    }
    results.inference[name] = {
      inputTokens: tokens,
      ...calculatePercentiles([...times.filter(t => t > 0)].sort((a, b) => a - b)),
    };
  }

  return results;
}

async function testConcurrency() {
  const results = { concurrency: {} };

  for (const concurrency of [1, 2, 4, 8]) {
    const times = [];
    const start = performance.now();
    
    const batches = Array.from({ length: concurrency }, (_, i) => 
      fetch(`${GATEWAY}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Test ${i}`, mode: "fast" }),
      }).then(r => r.json().then(() => performance.now() - start))
        .catch(() => -1)
    );

    const batchResults = await Promise.all(batches);
    const valid = batchResults.filter(t => t > 0);
    
    results.concurrency[`c${concurrency}`] = {
      totalRequests: concurrency,
      successCount: valid.length,
      totalTimeMs: Math.max(...valid),
      throughputRPS: valid.length / (Math.max(...valid) / 1000),
    };
  }

  return results;
}

async function testEndToEnd() {
  const results = { e2e: {} };

  // Full pipeline: Vision → Inference → Input
  const pipelineTimes = [];
  
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    
    try {
      // 1. Vision analysis
      const visionStart = performance.now();
      const { createRequire } = await import("node:module");
      const require = createRequire(import.meta.url);
      const native = require(NATIVE_PATH);
      const elements = native.getUiElements(null);
      const capture = native.captureScreen("D:\\Coding\\OpenOxygen\\test\\benchmark\\e2e.png");
      const visionTime = performance.now() - visionStart;

      // 2. Inference
      const inferenceStart = performance.now();
      const resp = await fetch(`${GATEWAY}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: `Found ${elements.length} elements. Suggest next action.`,
          mode: "fast"
        }),
      });
      await resp.json();
      const inferenceTime = performance.now() - inferenceStart;

      // 3. Input execution
      const inputStart = performance.now();
      native.mouseMoveSmooth(500, 500, 200, "bezier");
      const inputTime = performance.now() - inputStart;

      pipelineTimes.push({
        total: performance.now() - start,
        vision: visionTime,
        inference: inferenceTime,
        input: inputTime,
      });

    } catch (e) {
      pipelineTimes.push({ error: e.message });
    }
  }

  const valid = pipelineTimes.filter(t => !t.error);
  results.e2e.pipeline = {
    samples: valid.length,
    breakdown: {
      vision: calculatePercentiles([...valid.map(v => v.vision)].sort((a, b) => a - b)),
      inference: calculatePercentiles([...valid.map(v => v.inference)].sort((a, b) => a - b)),
      input: calculatePercentiles([...valid.map(v => v.input)].sort((a, b) => a - b)),
      total: calculatePercentiles([...valid.map(v => v.total)].sort((a, b) => a - b)),
    },
  };

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Runner
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen 26w11aD — Comprehensive Benchmark Suite      ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");

  const systemInfo = await getSystemInfo();
  console.log("System Info:");
  console.log(JSON.stringify(systemInfo, null, 2));
  console.log("");

  const results = {
    metadata: {
      version: "26w11aD",
      timestamp: new Date().toISOString(),
      system: systemInfo,
    },
  };

  // Run benchmarks
  console.log("Running Native Module Tests...");
  Object.assign(results, await testNativeModule());

  console.log("Running Inference Engine Tests...");
  Object.assign(results, await testInferenceEngine());

  console.log("Running Concurrency Tests...");
  Object.assign(results, await testConcurrency());

  console.log("Running End-to-End Tests...");
  Object.assign(results, await testEndToEnd());

  // Save results
  const outputDir = "D:\\Coding\\OpenOxygen\\test\\benchmark";
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  
  const outputPath = `${outputDir}\\results_${Date.now()}.json`;
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  // Generate summary
  const summary = generateSummary(results);
  console.log("\n" + summary);
  
  appendFileSync(`${outputDir}\\summary.md`, `\n\n## ${new Date().toISOString()}\n\n${summary}`);

  console.log(`\nFull results saved to: ${outputPath}`);
}

function generateSummary(results) {
  const lines = [];
  lines.push("## Benchmark Summary (26w11aD)");
  lines.push("");
  
  if (results.native?.screenCapture) {
    const c = results.native.screenCapture;
    lines.push(`### Screen Capture (Win32 BitBlt)`);
    lines.push(`- P50: ${c.p50.toFixed(1)}ms, P95: ${c.p95.toFixed(1)}ms, P99: ${c.p99.toFixed(1)}ms`);
    lines.push(`- Mean: ${c.mean.toFixed(1)}ms, Std: ${c.std.toFixed(1)}ms`);
    lines.push("");
  }

  if (results.native?.vectorSearch1000) {
    const v = results.native.vectorSearch1000;
    lines.push(`### Vector Search (1000 docs, 128-dim, SIMD)`);
    lines.push(`- P50: ${v.p50.toFixed(3)}ms, P95: ${v.p95.toFixed(3)}ms`);
    lines.push("");
  }

  if (results.native?.uiAutomation) {
    const u = results.native.uiAutomation;
    lines.push(`### UI Automation`);
    lines.push(`- Duration: ${u.durationMs.toFixed(1)}ms`);
    lines.push(`- Elements detected: ${u.elementCount}`);
    lines.push("");
  }

  if (results.inference) {
    lines.push(`### Inference Engine`);
    for (const [name, data] of Object.entries(results.inference)) {
      if (data.p50) {
        lines.push(`- ${name} (${data.inputTokens} tokens): P50=${data.p50.toFixed(0)}ms, P95=${data.p95.toFixed(0)}ms`);
      }
    }
    lines.push("");
  }

  if (results.concurrency) {
    lines.push(`### Concurrency`);
    for (const [name, data] of Object.entries(results.concurrency)) {
      lines.push(`- ${name}: ${data.successCount}/${data.totalRequests} success, ${data.throughputRPS?.toFixed(1) ?? 0} RPS`);
    }
    lines.push("");
  }

  if (results.e2e?.pipeline) {
    const p = results.e2e.pipeline.breakdown;
    lines.push(`### End-to-End Pipeline`);
    lines.push(`- Vision: P50=${p.vision.p50.toFixed(0)}ms`);
    lines.push(`- Inference: P50=${p.inference.p50.toFixed(0)}ms`);
    lines.push(`- Input: P50=${p.input.p50.toFixed(0)}ms`);
    lines.push(`- Total: P50=${p.total.p50.toFixed(0)}ms, P95=${p.total.p95.toFixed(0)}ms`);
    lines.push("");
  }

  return lines.join("\n");
}

main().catch(console.error);
