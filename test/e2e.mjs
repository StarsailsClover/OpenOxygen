/**
 * OpenOxygen — End-to-End Integration Test
 *
 * 验证完整推理管道：Gateway → InferenceEngine → LLM → Response
 * 以及 Native 模块、内存系统、安全审计的协同工作。
 */

const GATEWAY = "http://127.0.0.1:4800";
const NATIVE_PATH = "D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js";

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label} — ${detail ?? "FAILED"}`);
    failed++;
  }
}

async function apiGet(path) {
  const res = await fetch(`${GATEWAY}${path}`);
  return { status: res.status, data: await res.json() };
}

async function apiPost(path, body) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  console.log("");
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║     OpenOxygen End-to-End Integration Test        ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log("");

  // ─── 1. Gateway Health ────────────────────────────────────────
  console.log("1. Gateway Health");
  const health = await apiGet("/health");
  assert("Health endpoint returns 200", health.status === 200);
  assert("Status is ok", health.data.status === "ok");
  assert("Version is 0.1.0", health.data.version === "0.1.0");
  console.log("");

  // ─── 2. System Status ────────────────────────────────────────
  console.log("2. System Status");
  const status = await apiGet("/api/v1/status");
  assert("Status endpoint returns 200", status.status === 200);
  assert("Gateway config present", !!status.data.gateway);
  assert("Agents list present", Array.isArray(status.data.agents));
  assert("Models configured", status.data.models?.length > 0);
  assert("Inference engine ready", status.data.inferenceReady === true);
  console.log("");

  // ─── 3. Chat — Simple Message ────────────────────────────────
  console.log("3. Chat — Simple Message");
  const chat1 = await apiPost("/api/v1/chat", { message: "Hello OpenOxygen" });
  assert("Chat returns 200", chat1.status === 200);
  assert("Response has content", !!chat1.data.content);
  assert("Response has model name", !!chat1.data.model);
  assert("Response has provider", !!chat1.data.provider);
  assert("Response has usage stats", !!chat1.data.usage);
  assert("Duration tracked", chat1.data.durationMs > 0);
  console.log(`     Response: "${chat1.data.content.slice(0, 80)}..."`);
  console.log("");

  // ─── 4. Chat — Multi-turn with System Prompt ─────────────────
  console.log("4. Chat — Multi-turn Conversation");
  const chat2 = await apiPost("/api/v1/chat", {
    messages: [
      { role: "system", content: "你是一个Windows系统管理专家" },
      { role: "user", content: "查看系统状态" },
    ],
    mode: "balanced",
  });
  assert("Multi-turn chat returns 200", chat2.status === 200);
  assert("Response content present", !!chat2.data.content);
  assert("Mode is balanced", chat2.data.mode === "balanced");
  console.log("");

  // ─── 5. Chat — Deep Mode ─────────────────────────────────────
  console.log("5. Chat — Deep Inference Mode");
  const chat3 = await apiPost("/api/v1/chat", {
    message: "请详细分析并规划一个完整的系统优化方案",
    mode: "deep",
  });
  assert("Deep mode returns 200", chat3.status === 200);
  assert("Deep mode content present", !!chat3.data.content);
  assert("Mode is deep", chat3.data.mode === "deep");
  console.log("");

  // ─── 6. Task Planning ────────────────────────────────────────
  console.log("6. Task Planning");
  const plan = await apiPost("/api/v1/plan", {
    goal: "清理系统临时文件并优化启动项",
    context: "Windows 11, 16GB RAM, SSD",
  });
  assert("Plan endpoint returns 200", plan.status === 200);
  assert("Plan has ID", !!plan.data.id);
  assert("Plan has goal", plan.data.goal === "清理系统临时文件并优化启动项");
  assert("Plan has status", !!plan.data.status);
  console.log("");

  // ─── 7. Error Handling ───────────────────────────────────────
  console.log("7. Error Handling");
  const err1 = await apiPost("/api/v1/chat", {});
  assert("Empty body returns 400", err1.status === 400);
  const err2 = await apiGet("/api/v1/nonexistent");
  assert("Unknown route returns 404", err2.status === 404);
  console.log("");

  // ─── 8. Native Module ────────────────────────────────────────
  console.log("8. Rust Native Module");
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const native = require(NATIVE_PATH);

    const ver = native.nativeVersion();
    assert("Native version loads", ver.includes("openoxygen-core-native"));

    const sysInfo = native.getSystemInfo();
    assert("System info: platform", sysInfo.platform === "windows");
    assert("System info: CPU count > 0", sysInfo.cpuCount > 0);
    assert("System info: memory > 0", sysInfo.totalMemoryMb > 0);

    const sim = native.cosineSimilarity([1, 0, 0], [0.7, 0.7, 0]);
    assert("Cosine similarity correct", Math.abs(sim - 0.7071) < 0.001);

    const results = native.vectorSearch([1, 0, 0], [[1, 0, 0], [0, 1, 0], [0.5, 0.5, 0]], 2);
    assert("Vector search returns top-k", results.length === 2);
    assert("Vector search top result is exact match", results[0].index === 0);

    const windows = native.listWindows();
    assert("Window enumeration works", windows.length > 0);

    const fg = native.getForegroundWindowInfo();
    assert("Foreground window detected", fg !== null && fg.title.length > 0);

    const procs = native.listProcesses();
    assert("Process enumeration works", procs.length > 10);

    const capture = native.captureScreen("D:\\Coding\\OpenOxygen\\test\\e2e_capture.png");
    assert("Screen capture succeeds", capture.success === true);
    assert("Screen capture has dimensions", capture.width > 0 && capture.height > 0);
    assert(`Screen capture: ${capture.width}x${capture.height} in ${capture.durationMs.toFixed(0)}ms`, true);
  } catch (e) {
    assert("Native module loads", false, e.message);
  }
  console.log("");

  // ─── 9. Models Endpoint ──────────────────────────────────────
  console.log("9. Models Endpoint");
  const models = await apiGet("/api/v1/models");
  assert("Models endpoint returns 200", models.status === 200);
  assert("At least one model configured", models.data.models?.length > 0);
  assert("Model has provider", !!models.data.models[0]?.provider);
  console.log("");

  // ─── Summary ─────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log("═══════════════════════════════════════════════════");
  console.log("");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
