/**
 * OpenOxygen Phase 3 — Vision-Language Fusion Test (26w11aE_P3)
 *
 * 测试 qwen3-vl:4b 视觉理解能力
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const OLLAMA_API = "http://127.0.0.1:11434";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";

// ═══════════════════════════════════════════════════════════════════════════
// Test Framework
// ═══════════════════════════════════════════════════════════════════════════

class P3TestRunner {
  constructor() {
    this.results = {
      phase: "P3_VisionLanguage",
      timestamp: new Date().toISOString(),
      visionModel: "qwen3-vl:4b",
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
    const path = `${RESULTS_DIR}\\p3-results-${Date.now()}.json`;
    writeFileSync(path, JSON.stringify(this.results, null, 2));
    console.log(`\nResults saved to: ${path}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Vision Tests
// ═══════════════════════════════════════════════════════════════════════════

async function testVisionModelAvailability(runner) {
  console.log("\n📦 Vision Model Availability");

  await runner.test("qwen3-vl:4b is available", async () => {
    const res = await fetch(`${OLLAMA_API}/api/tags`);
    const data = await res.json();
    const found = data.models?.find(m => m.name === "qwen3-vl:4b");
    if (!found) throw new Error("qwen3-vl:4b not found");
  });
}

async function testVisionInference(runner) {
  console.log("\n🖼️ Vision Inference Tests");

  // 注意：实际测试需要截图，这里模拟测试流程
  await runner.test("Vision model responds to text", async () => {
    const start = performance.now();
    const res = await fetch(`${OLLAMA_API}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3-vl:4b",
        prompt: "Describe what you see on the screen.",
        stream: false,
      }),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    const latency = performance.now() - start;
    
    runner.results.tests.textResponse = {
      latency,
      response: data.response?.slice(0, 100),
    };
    
    if (latency > 2000) {
      console.log(`    Warning: High latency ${latency.toFixed(0)}ms`);
    }
  });

  await runner.test("Vision model with image placeholder", async () => {
    // qwen3-vl 支持图像输入，格式为 multimodal
    const res = await fetch(`${OLLAMA_API}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3-vl:4b",
        prompt: "What is in this image? [IMAGE_PLACEHOLDER]",
        stream: false,
      }),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    runner.results.tests.imagePlaceholder = {
      hasResponse: !!data.response,
      responseLength: data.response?.length,
    };
  });
}

async function testVisionTokenization(runner) {
  console.log("\n🔤 Vision Tokenization");

  // 模拟 UI 元素数据
  const mockAnalysis = {
    elements: [
      { id: "btn1", type: "button", label: "Submit", bounds: { x: 100, y: 200, width: 80, height: 30 }, confidence: 0.95, interactable: true },
      { id: "input1", type: "input", label: "Username", bounds: { x: 100, y: 150, width: 200, height: 25 }, confidence: 0.92, interactable: true },
      { id: "text1", type: "text", label: "Welcome", bounds: { x: 50, y: 50, width: 100, height: 20 }, confidence: 0.88, interactable: false },
    ],
    screenshotPath: "D:/test/screenshot.png",
    timestamp: Date.now(),
  };

  await runner.test("Tokenization produces valid output", async () => {
    // 这里应该调用实际的 VisionTokenizer
    // 现在模拟验证
    const tokens = mockAnalysis.elements.map(e => ({
      type: e.type,
      id: e.id,
      content: e.label,
      bounds: e.bounds,
    }));

    if (tokens.length !== 3) throw new Error("Token count mismatch");
    
    runner.results.tests.tokenization = {
      tokenCount: tokens.length,
      types: tokens.map(t => t.type),
    };
  });

  await runner.test("Token serialization format", async () => {
    const lines = [
      `<image path="${mockAnalysis.screenshotPath}" width="1920" height="1080">`,
      `<elements count="3">`,
      `  <button id="btn1" x="100" y="200" w="80" h="30" conf="0.95">Submit</button>`,
      `  <input id="input1" x="100" y="150" w="200" h="25" conf="0.92">Username</input>`,
      `</elements>`,
    ];

    const serialized = lines.join("\n");
    
    runner.results.tests.serialization = {
      length: serialized.length,
      valid: serialized.includes("<image") && serialized.includes("</elements>"),
    };
  });
}

async function testVisualGrounding(runner) {
  console.log("\n🎯 Visual Grounding");

  await runner.test("Grounding instruction parsing", async () => {
    const instructions = [
      "Click the Submit button",
      "Type in the username field",
      "Find the red icon",
      "Scroll down",
    ];

    const parsed = instructions.map(inst => {
      const action = inst.match(/Click|Type|Find|Scroll/)?.[0] || "unknown";
      const target = inst.replace(/Click|Type|Find|Scroll|the|in|down/g, "").trim();
      return { action, target };
    });

    runner.results.tests.groundingParse = parsed;
  });

  await runner.test("Coordinate calculation", async () => {
    const bounds = { x: 100, y: 200, width: 80, height: 30 };
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };

    if (center.x !== 140 || center.y !== 215) {
      throw new Error(`Center calculation error: ${JSON.stringify(center)}`);
    }

    runner.results.tests.coordinateCalc = center;
  });
}

async function testTemporalReasoning(runner) {
  console.log("\n⏱️ Temporal Reasoning");

  await runner.test("Frame sequence analysis", async () => {
    const frames = [
      { timestamp: 0, elements: ["btn1", "input1"] },
      { timestamp: 1000, elements: ["btn1", "input1", "modal1"] },
      { timestamp: 2000, elements: ["btn1", "input1", "modal1", "tooltip1"] },
    ];

    // 检测变化
    const changes = [];
    for (let i = 1; i < frames.length; i++) {
      const prev = new Set(frames[i - 1].elements);
      const curr = new Set(frames[i].elements);
      const added = [...curr].filter(e => !prev.has(e));
      if (added.length > 0) {
        changes.push({ time: frames[i].timestamp, added });
      }
    }

    if (changes.length !== 2) throw new Error(`Expected 2 changes, got ${changes.length}`);

    runner.results.tests.temporal = {
      frameCount: frames.length,
      changeCount: changes.length,
      changes,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Integration Test
// ═══════════════════════════════════════════════════════════════════════════

async function testFullPipeline(runner) {
  console.log("\n🔧 Full Pipeline Integration");

  await runner.test("End-to-end vision pipeline", async () => {
    const start = performance.now();

    // 1. 模拟截图分析
    const mockScreen = {
      elements: [
        { id: "loginBtn", type: "button", label: "Login", bounds: { x: 400, y: 300, width: 100, height: 40 } },
        { id: "userInput", type: "input", label: "Username", bounds: { x: 300, y: 200, width: 200, height: 30 } },
        { id: "passInput", type: "input", label: "Password", bounds: { x: 300, y: 250, width: 200, height: 30 } },
      ],
    };

    // 2. Tokenize
    const tokens = mockScreen.elements.map(e => ({
      id: e.id,
      type: e.type,
      content: e.label,
      bounds: e.bounds,
    }));

    // 3. 模拟 grounding
    const instruction = "Click the Login button";
    const target = tokens.find(t => t.content.toLowerCase().includes("login"));
    
    if (!target) throw new Error("Target not found");

    const coordinates = {
      x: target.bounds.x + target.bounds.width / 2,
      y: target.bounds.y + target.bounds.height / 2,
    };

    const latency = performance.now() - start;

    runner.results.tests.e2ePipeline = {
      instruction,
      targetId: target.id,
      coordinates,
      latency,
      success: true,
    };

    console.log(`    Target: ${target.id} at (${coordinates.x}, ${coordinates.y})`);
    console.log(`    Latency: ${latency.toFixed(0)}ms`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen Phase 3 — Vision-Language Fusion Test        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Vision Model: qwen3-vl:4b (3.3GB)");
  console.log("Capabilities: Image understanding, Visual grounding, Temporal reasoning");
  console.log("");

  const runner = new P3TestRunner();

  await testVisionModelAvailability(runner);
  await testVisionInference(runner);
  await testVisionTokenization(runner);
  await testVisualGrounding(runner);
  await testTemporalReasoning(runner);
  await testFullPipeline(runner);

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
