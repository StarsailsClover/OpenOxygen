/**
 * OpenOxygen 26w13aB Phase0 部署测试
 * 测试内容：
 *   1. 依赖检查 (Node.js, Rust, Ollama)
 *   2. 文件结构检查
 *   3. 配置文件验证
 *   4. 服务启动测试
 *   5. 模型连接测试
 *   6. 基础功能测试
 *   7. 文档完整性检查
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const GATEWAY = "http://127.0.0.1:4800";

const results = {
  version: "26w13aB-Phase0-Test",
  timestamp: new Date().toISOString(),
  tests: [],
  passed: 0,
  failed: 0,
  warnings: 0
};

function test(name, fn) {
  try {
    const result = fn();
    if (result.ok) {
      console.log(`✅ ${name}`);
      results.passed++;
      results.tests.push({ name, status: "pass", detail: result.detail });
    } else {
      console.log(`⚠️ ${name}: ${result.detail}`);
      results.warnings++;
      results.tests.push({ name, status: "warning", detail: result.detail });
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    results.failed++;
    results.tests.push({ name, status: "fail", detail: e.message });
  }
}

console.log("╔═══════════════════════════════════════════════════════════════╗");
console.log("║  OpenOxygen 26w13aB Phase0 部署测试                          ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");

// 1. 依赖检查
console.log("━━━ 1. 依赖检查 ━━━");

test("Node.js 版本", () => {
  try {
    const v = execSync("node --version", { encoding: "utf-8" }).trim();
    const major = parseInt(v.slice(1).split(".")[0]);
    return { ok: major >= 22, detail: v };
  } catch { return { ok: false, detail: "Node.js not found" }; }
});

test("npm 可用", () => {
  try {
    const v = execSync("npm --version", { encoding: "utf-8" }).trim();
    return { ok: true, detail: v };
  } catch { return { ok: false, detail: "npm not found" }; }
});

test("Rust/Cargo 版本", () => {
  try {
    const v = execSync("cargo --version", { encoding: "utf-8" }).trim();
    return { ok: true, detail: v };
  } catch { return { ok: false, detail: "Cargo not found (optional for end users)" }; }
});

test("Ollama 版本", () => {
  try {
    const v = execSync("ollama --version", { encoding: "utf-8" }).trim();
    return { ok: true, detail: v };
  } catch { return { ok: false, detail: "Ollama not found (optional)" }; }
});

// 2. 文件结构检查
console.log("\n━━━ 2. 文件结构检查 ━━━");

test("package.json 存在", () => ({
  ok: existsSync("package.json"),
  detail: existsSync("package.json") ? "Found" : "Missing"
}));

test("openoxygen.json 存在", () => ({
  ok: existsSync("openoxygen.json"),
  detail: existsSync("openoxygen.json") ? "Found" : "Missing"
}));

test("start.bat 存在", () => ({
  ok: existsSync("start.bat"),
  detail: existsSync("start.bat") ? "Found" : "Missing - critical for Windows users"
}));

test("INSTALL.md 存在", () => ({
  ok: existsSync("INSTALL.md"),
  detail: existsSync("INSTALL.md") ? "Found" : "Missing - critical for deployment"
}));

test("docs/QUICKSTART.md 存在", () => ({
  ok: existsSync("docs/QUICKSTART.md"),
  detail: existsSync("docs/QUICKSTART.md") ? "Found" : "Missing"
}));

test("node_modules 存在", () => ({
  ok: existsSync("node_modules"),
  detail: existsSync("node_modules") ? "Found" : "Missing - run npm install"
}));

test("dist/ 目录存在", () => ({
  ok: existsSync("dist"),
  detail: existsSync("dist") ? "Found" : "Missing - run npm run build"
}));

test("Native 模块存在", () => ({
  ok: existsSync("packages/core-native/index.js"),
  detail: existsSync("packages/core-native/index.js") ? "Found" : "Missing - run cargo build"
}));

// 3. 配置文件验证
console.log("\n━━━ 3. 配置文件验证 ━━━");

test("openoxygen.json 格式正确", () => {
  try {
    const c = JSON.parse(readFileSync("openoxygen.json", "utf-8"));
    return { ok: c.version && c.gateway && c.models, detail: `Version: ${c.version}` };
  } catch (e) { return { ok: false, detail: e.message }; }
});

test("版本号正确 (26w13aB)", () => {
  try {
    const c = JSON.parse(readFileSync("openoxygen.json", "utf-8"));
    return { ok: c.version === "26w13aB", detail: c.version };
  } catch (e) { return { ok: false, detail: e.message }; }
});

test("Gateway 配置正确", () => {
  try {
    const c = JSON.parse(readFileSync("openoxygen.json", "utf-8"));
    return { ok: c.gateway.host && c.gateway.port, detail: `${c.gateway.host}:${c.gateway.port}` };
  } catch (e) { return { ok: false, detail: e.message }; }
});

test("模型配置存在", () => {
  try {
    const c = JSON.parse(readFileSync("openoxygen.json", "utf-8"));
    return { ok: c.models && c.models.length > 0, detail: `${c.models.length} models` };
  } catch (e) { return { ok: false, detail: e.message }; }
});

// 4. 服务启动测试
console.log("\n━━━ 4. 服务启动测试 ━━━");

test("Gateway 健康检查", () => {
  try {
    const r = execSync("curl -s http://127.0.0.1:4800/health", { encoding: "utf-8" });
    const d = JSON.parse(r);
    return { ok: d.status === "ok", detail: `status=${d.status}` };
  } catch (e) { return { ok: false, detail: e.message }; }
});

// 5. 模型连接测试
console.log("\n━━━ 5. 模型连接测试 ━━━");

test("LLM 推理测试", () => {
  try {
    const body = JSON.stringify({ messages: [{ role: "user", content: "Say OK" }] });
    const r = execSync(`curl -s -X POST http://127.0.0.1:4800/api/v1/chat -H "Content-Type: application/json" -d '${body}'`, { encoding: "utf-8" });
    const d = JSON.parse(r);
    return { ok: d.content, detail: `${d.model || 'unknown'} in ${d.durationMs || '?'}ms` };
  } catch (e) { return { ok: false, detail: e.message }; }
});

// 6. 基础功能测试
console.log("\n━━━ 6. 基础功能测试 ━━━");

test("Native 模块加载", () => {
  try {
    const n = require("D:/Coding/OpenOxygen/packages/core-native/index.js");
    return { ok: typeof n.captureScreen === "function", detail: `${Object.keys(n).length} functions` };
  } catch (e) { return { ok: false, detail: e.message }; }
});

test("截图功能", () => {
  try {
    const n = require("D:/Coding/OpenOxygen/packages/core-native/index.js");
    const r = n.captureScreen("D:/Coding/OpenOxygen/.state/test-screenshot.png");
    return { ok: existsSync("D:/Coding/OpenOxygen/.state/test-screenshot.png"), detail: `${r.durationMs}ms` };
  } catch (e) { return { ok: false, detail: e.message }; }
});

test("UIA 元素检测", () => {
  try {
    const n = require("D:/Coding/OpenOxygen/packages/core-native/index.js");
    const els = n.getUiElements(null);
    return { ok: els.length > 0, detail: `${els.length} elements` };
  } catch (e) { return { ok: false, detail: e.message }; }
});

// 7. 文档完整性检查
console.log("\n━━━ 7. 文档完整性检查 ━━━");

test("README.md 存在", () => ({
  ok: existsSync("README.md"),
  detail: existsSync("README.md") ? "Found" : "Missing"
}));

test("CHANGELOG.md 存在", () => ({
  ok: existsSync("CHANGELOG.md"),
  detail: existsSync("CHANGELOG.md") ? "Found" : "Missing"
}));

test("RELEASE_26w13aB.md 存在", () => ({
  ok: existsSync("RELEASE_26w13aB.md"),
  detail: existsSync("RELEASE_26w13aB.md") ? "Found" : "Missing"
}));

// 等待异步测试完成
setTimeout(() => {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  测试完成");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ 通过: ${results.passed}`);
  console.log(`  ⚠️  警告: ${results.warnings}`);
  console.log(`  ❌ 失败: ${results.failed}`);
  console.log(`  总计: ${results.tests.length}`);
  console.log("═══════════════════════════════════════════════════════════════");

  if (results.failed > 0) {
    console.log("\n❌ 发现关键问题，需要修复:");
    for (const t of results.tests.filter(t => t.status === "fail")) {
      console.log(`  - ${t.name}: ${t.detail}`);
    }
  }

  if (results.warnings > 0) {
    console.log("\n⚠️  发现警告:");
    for (const t of results.tests.filter(t => t.status === "warning")) {
      console.log(`  - ${t.name}: ${t.detail}`);
    }
  }

  // 保存结果
  writeFileSync("test/results/phase0-test.json", JSON.stringify(results, null, 2));
  console.log(`\n结果已保存: test/results/phase0-test.json`);
}, 20000);
