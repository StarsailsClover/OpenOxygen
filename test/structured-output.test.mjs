/**
 * Structured LLM Output 测试
 */

import { structuredLLMCall, extractJSON, regexFallback, getAgentDecision } from "../dist/inference/structured/index.js";

const TESTS = { passed: 0, failed: 0 };

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    TESTS.passed++;
    console.log("✅");
  } catch (e) {
    TESTS.failed++;
    console.log(`❌ ${e.message}`);
  }
}

async function run() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  Structured LLM Output Test Suite                           ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  // extractJSON tests
  await test("extractJSON: direct parse", () => {
    const r = extractJSON('{"action":"click","x":100}');
    if (!r || r.action !== "click") throw new Error("Failed");
  });

  await test("extractJSON: embedded in text", () => {
    const r = extractJSON('Some text {"action":"click","x":100} more text');
    if (!r || r.action !== "click") throw new Error("Failed");
  });

  await test("extractJSON: nested objects", () => {
    const r = extractJSON('{"action":"click","params":{"x":100,"y":200}}');
    if (!r || r.params?.x !== 100) throw new Error("Failed");
  });

  await test("extractJSON: from thinking text", () => {
    const r = extractJSON('The user wants to click. Here is the JSON: {"action":"gui_click","target":"button","params":{"x":500,"y":300}} That should work.');
    if (!r || r.action !== "gui_click") throw new Error("Failed");
  });

  await test("extractJSON: code block", () => {
    const r = extractJSON('```json\n{"action":"terminal","target":"echo hi"}\n```');
    if (!r || r.action !== "terminal") throw new Error("Failed");
  });

  await test("extractJSON: null for empty", () => {
    const r = extractJSON("");
    if (r !== null) throw new Error("Should be null");
  });

  // regexFallback tests
  await test("regexFallback: extract fields", () => {
    const r = regexFallback('The action is "click" and target is "button"', ["action", "target"]);
    if (!r || r.action !== "click") throw new Error("Failed");
  });

  // Real LLM test
  await test("structuredLLMCall: qwen3:4b with format:json", async () => {
    const result = await structuredLLMCall(
      'Reply with JSON: {"action":"click","x":100,"y":200}',
      { model: "qwen3:4b", forceJsonFormat: true, useGenerateApi: true }
    );
    console.log(`  source=${result.source}, time=${result.durationMs}ms`);
    if (!result.success) throw new Error(`Failed: source=${result.source}`);
    if (!result.data || !result.data.action) throw new Error("No action in data");
    console.log(`  data=${JSON.stringify(result.data)}`);
  });

  await test("getAgentDecision: real decision", async () => {
    const result = await getAgentDecision(
      `You are an AI Agent on Windows. Task: Open Chrome browser.
Current window: "Desktop"
UI elements: [Button] "搜索" (624,398)
Choose ONE action. Reply with JSON: {"action":"gui_hotkey","target":"win+r","params":{"keys":"win+r"},"prediction":"Run dialog opens","reasoning":"Launch Chrome"}`
    );
    console.log(`  source=${result.source}, time=${result.durationMs}ms`);
    if (!result.success) throw new Error(`Failed: source=${result.source}`);
    console.log(`  action=${result.data?.action}, target=${result.data?.target}`);
  });

  // Summary
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  ✅ Passed: ${TESTS.passed}  ❌ Failed: ${TESTS.failed}`);
  console.log(`═══════════════════════════════════════════════════════════════`);

  process.exit(TESTS.failed > 0 ? 1 : 0);
}

run();
