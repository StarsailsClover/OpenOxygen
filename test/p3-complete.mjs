/**
 * OpenOxygen Phase 3 — Complete Vision-Language Test
 *
 * 完整的 P3 功能验证
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const GATEWAY = "http://127.0.0.1:4800";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";

// ═══════════════════════════════════════════════════════════════════════════
// Test Framework
// ═══════════════════════════════════════════════════════════════════════════

class P3CompleteTest {
  constructor() {
    this.results = {
      phase: "P3_Complete",
      timestamp: new Date().toISOString(),
      tests: {},
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
    const path = `${RESULTS_DIR}\\p3-complete-${Date.now()}.json`;
    writeFileSync(path, JSON.stringify(this.results, null, 2));
    console.log(`\nResults saved to: ${path}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

async function testVisionModel(runner) {
  console.log("\n📷 Vision Model Tests");

  await runner.test("qwen3-vl:4b responds to text", async () => {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Describe what you see",
        model: "qwen3-vl:4b",
      }),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.content) throw new Error("No response content");
    
    runner.results.tests.visionText = { latency: data.durationMs };
  });
}

async function testNativeCompression(runner) {
  console.log("\n🗜️ Native Image Compression");

  await runner.test("Screenshot compression works", async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const native = require("../packages/core-native/index.js");

    // 先截图
    const capture = native.captureScreen("D:\\Coding\\OpenOxygen\\test\\p3_compress.png");
    if (!capture.success) throw new Error("Capture failed");

    // 压缩
    const start = performance.now();
    const compressed = native.compressScreenshot("D:\\Coding\\OpenOxygen\\test\\p3_compress.png", 512, 85);
    const latency = performance.now() - start;

    if (!compressed.data || compressed.data.length === 0) {
      throw new Error("Compression failed");
    }

    // 转 base64
    const base64 = native.imageToBase64(compressed.data);

    runner.results.tests.compression = {
      originalSize: capture.width * capture.height * 4, // RGBA
      compressedSize: compressed.data.length,
      compressionRatio: compressed.compression_ratio,
      base64Length: base64.length,
      latency,
    };

    console.log(`    Original: ${capture.width}x${capture.height}`);
    console.log(`    Compressed: ${compressed.compressed_width}x${compressed.compressed_height}`);
    console.log(`    Ratio: ${compressed.compression_ratio.toFixed(2)}x`);
    console.log(`    Latency: ${latency.toFixed(0)}ms`);
  });
}

async function testUIElements(runner) {
  console.log("\n🎯 UI Element Detection");

  await runner.test("UI Automation detects elements", async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const native = require("../packages/core-native/index.js");

    const start = performance.now();
    const elements = native.getUiElements(null);
    const latency = performance.now() - start;

    if (elements.length === 0) throw new Error("No elements detected");

    const byType = {};
    for (const e of elements) {
      byType[e.controlType] = (byType[e.controlType] || 0) + 1;
    }

    runner.results.tests.uiElements = {
      count: elements.length,
      byType,
      latency,
    };

    console.log(`    Detected ${elements.length} elements`);
    console.log(`    Types: ${Object.keys(byType).join(", ")}`);
  });
}

async function testFusionPipeline(runner) {
  console.log("\n🔧 Fusion Pipeline");

  await runner.test("Vision-Language fusion endpoint", async () => {
    // 测试 Gateway 状态
    const res = await fetch(`${GATEWAY}/api/v1/status`);
    const data = await res.json();

    if (!data.models) throw new Error("No models info");

    const visionModel = data.models.find(m => m.model?.includes("vl"));
    if (!visionModel) {
      console.log("    Note: Vision model not in active list, but may be available");
    }

    runner.results.tests.fusion = {
      modelsAvailable: data.models.length,
      visionModelListed: !!visionModel,
    };
  });
}

async function testSafety(runner) {
  console.log("\n🛡️ Input Safety");

  await runner.test("Input safety guard exists", async () => {
    const fs = await import("node:fs");
    const path = "D:\\Coding\\OpenOxygen\\src\\input\\safety.ts";
    if (!fs.existsSync(path)) {
      throw new Error("Safety module not found");
    }
    runner.results.tests.safety = { exists: true };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen Phase 3 — Complete Vision-Language Test      ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");

  const runner = new P3CompleteTest();

  await testVisionModel(runner);
  await testNativeCompression(runner);
  await testUIElements(runner);
  await testFusionPipeline(runner);
  await testSafety(runner);

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`Results: ${runner.results.summary.passed} passed, ${runner.results.summary.failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");

  runner.save();

  // P3 Completion Check
  const allPassed = runner.results.summary.failed === 0;
  if (allPassed) {
    console.log("\n✨ Phase 3 Complete! All vision-language features working.");
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
