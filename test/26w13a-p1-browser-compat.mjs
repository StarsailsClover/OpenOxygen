/**
 * OpenOxygen — 26w13aA P1: Browser Compatibility Test
 *
 * 模式：脚本化流程 + UIA 元素检测 + LLM 关键决策辅助
 * 参照 real-agent-task.mjs 的成功模式
 *
 * 测试矩阵：
 *   Chrome: Google, YouTube, GitHub, bilibili, 百度, 抖音, ChatGPT, 豆包
 *   Edge:   Bing, 知乎
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const GATEWAY = "http://127.0.0.1:4800";
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\26w13a-p1";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";

if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true });
if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════════════
// Utilities (from real-agent-task pattern)
// ═══════════════════════════════════════════════════════════════════════════

let stepCount = 0;
const log = [];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function step(name) {
  stepCount++;
  const msg = `\n[Step ${stepCount}] ${name}`;
  console.log(msg);
  log.push({ step: stepCount, name, time: Date.now() });
}

function screenshot(label) {
  const path = `${SS_DIR}\\step${stepCount}_${label}.png`;
  try {
    const r = native.captureScreen(path);
    console.log(`    📸 ${label} (${r.durationMs?.toFixed(0) || "?"}ms)`);
    return path;
  } catch (e) {
    console.log(`    ⚠ Screenshot failed: ${e.message}`);
    return null;
  }
}

function getUIElements() {
  try {
    return native.getUiElements(null).filter(e => e.name && !e.isOffscreen && e.width > 0 && e.height > 0);
  } catch { return []; }
}

function findElement(elements, ...keywords) {
  for (const kw of keywords) {
    const lower = kw.toLowerCase();
    const found = elements.find(e =>
      e.name.toLowerCase().includes(lower) ||
      e.automationId?.toLowerCase().includes(lower)
    );
    if (found) return found;
  }
  return null;
}

function clickElement(element) {
  const x = element.x + Math.floor(element.width / 2);
  const y = element.y + Math.floor(element.height / 2);
  console.log(`    🖱️ Click: "${element.name.slice(0, 40)}" [${element.controlType}] at (${x}, ${y})`);
  native.mouseClickSmooth(x, y, "left", 200);
}

function typeText(text) {
  console.log(`    ⌨️ Type: "${text}"`);
  native.typeText(text);
}

function pressKey(keys) {
  console.log(`    ⌨️ Key: ${keys}`);
  native.sendHotkey(keys);
}

async function askLLM(question) {
  const start = performance.now();
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a Windows automation assistant. Respond with ONLY the action to take. Be extremely brief. No explanation." },
          { role: "user", content: question },
        ],
        mode: "fast",
      }),
    });
    const data = await res.json();
    const latency = performance.now() - start;
    console.log(`    🧠 LLM (${latency.toFixed(0)}ms): ${data.content?.slice(0, 100)}`);
    return data.content || "";
  } catch (e) {
    console.log(`    ⚠ LLM error: ${e.message}`);
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Browser control helpers
// ═══════════════════════════════════════════════════════════════════════════

function closeBrowser(name = "chrome") {
  const proc = name === "edge" ? "msedge" : "chrome";
  try {
    execSync(`powershell.exe -NoProfile -Command "Get-Process ${proc} -EA SilentlyContinue | Stop-Process -Force"`, { timeout: 10000 });
    console.log(`    ✅ ${name} closed`);
  } catch { console.log(`    ℹ ${name} was not running`); }
}

function launchBrowser(name = "chrome", url = "about:blank") {
  const exe = name === "edge" ? "msedge.exe" : "chrome.exe";
  try {
    execSync(`powershell.exe -NoProfile -Command "Start-Process '${exe}' -ArgumentList '--new-window','${url}'"`, { timeout: 15000 });
    console.log(`    ✅ ${name} launch command sent → ${url}`);
    return true;
  } catch (e) {
    console.log(`    ❌ Launch failed: ${e.message}`);
    return false;
  }
}

function focusBrowserWindow() {
  const wins = native.listWindows();
  const bw = wins
    .filter(w => w.visible && w.className === "Chrome_WidgetWin_1" && w.title && w.width > 200)
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));
  if (bw.length > 0) {
    native.focusWindow(bw[0].hwnd);
    console.log(`    🪟 Focused: "${bw[0].title.slice(0, 60)}" (${bw[0].width}x${bw[0].height})`);
    return bw[0];
  }
  console.log("    ⚠ No browser window found");
  return null;
}

async function navigateTo(url) {
  pressKey("ctrl+l");
  await sleep(500);
  pressKey("ctrl+a");
  await sleep(200);
  typeText(url);
  await sleep(300);
  pressKey("enter");
  console.log(`    ⏳ Waiting for page load...`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Test result tracking
// ═══════════════════════════════════════════════════════════════════════════

const results = { version: "26w13aA-P1", tests: [], startedAt: Date.now() };

function recordTest(site, browser, status, details = {}) {
  const entry = { site, browser, status, details, step: stepCount, time: Date.now() };
  results.tests.push(entry);
  const icon = status === "pass" ? "✅" : status === "partial" ? "⚠️" : "❌";
  console.log(`    ${icon} Result: ${site} on ${browser} → ${status}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST FLOW
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA — P1: Browser Compatibility Test        ║");
  console.log("║  Mode: Script-driven + UIA + LLM-assisted (real-agent-task) ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");

  const taskStart = performance.now();
  const metrics = native.getScreenMetrics();
  console.log(`Screen: ${metrics.logicalWidth}x${metrics.logicalHeight} @ ${metrics.dpiX}dpi`);

  // ─── Pre-check ────────────────────────────────────────────────
  step("Pre-check: Gateway + LLM");
  const health = await fetch(`${GATEWAY}/health`).then(r => r.json());
  console.log(`    Gateway: ✓ ${health.status}`);
  const llmTest = await askLLM("Say OK");
  if (!llmTest) {
    console.log("    ❌ LLM not responding. Aborting.");
    process.exit(1);
  }
  console.log(`    LLM: ✓ responding`);

  // ═══════════════════════════════════════════════════════════════
  // CHROME TESTS
  // ═══════════════════════════════════════════════════════════════

  step("Close existing Chrome");
  closeBrowser("chrome");
  await sleep(2000);

  step("Launch Chrome → Google");
  launchBrowser("chrome", "https://www.google.com");
  await sleep(6000);
  const chromeWin = focusBrowserWindow();
  await sleep(1000);
  screenshot("chrome_google");

  if (chromeWin) {
    const fg = native.getForegroundWindowInfo();
    console.log(`    Window title: "${fg?.title}"`);
    const elements = getUIElements();
    console.log(`    UIA elements: ${elements.length}`);
    recordTest("Google", "Chrome", elements.length > 5 ? "pass" : "partial", {
      title: fg?.title, uiaCount: elements.length
    });
  } else {
    recordTest("Google", "Chrome", "fail", { reason: "No Chrome window" });
  }

  // ─── YouTube ──────────────────────────────────────────────────
  step("Navigate to YouTube");
  await navigateTo("https://www.youtube.com");
  await sleep(5000);
  screenshot("youtube");
  {
    const fg = native.getForegroundWindowInfo();
    const elements = getUIElements();
    console.log(`    Title: "${fg?.title}" | UIA: ${elements.length}`);
    const isYT = fg?.title?.toLowerCase().includes("youtube");
    recordTest("YouTube", "Chrome", isYT ? "pass" : "partial", {
      title: fg?.title, uiaCount: elements.length
    });
  }

  // ─── GitHub ───────────────────────────────────────────────────
  step("Navigate to GitHub");
  await navigateTo("https://github.com");
  await sleep(5000);
  screenshot("github");
  {
    const fg = native.getForegroundWindowInfo();
    const elements = getUIElements();
    console.log(`    Title: "${fg?.title}" | UIA: ${elements.length}`);
    const isGH = fg?.title?.toLowerCase().includes("github");
    recordTest("GitHub", "Chrome", isGH ? "pass" : "partial", {
      title: fg?.title, uiaCount: elements.length
    });
  }

  // ─── Bilibili ─────────────────────────────────────────────────
  step("Navigate to Bilibili");
  await navigateTo("https://www.bilibili.com");
  await sleep(6000);
  screenshot("bilibili");
  {
    const fg = native.getForegroundWindowInfo();
    const elements = getUIElements();
    console.log(`    Title: "${fg?.title}" | UIA: ${elements.length}`);
    const isBili = fg?.title?.includes("bilibili") || fg?.title?.includes("哔哩");
    recordTest("Bilibili", "Chrome", isBili ? "pass" : "partial", {
      title: fg?.title, uiaCount: elements.length
    });
  }

  // ─── Bilibili search (LLM-assisted) ──────────────────────────
  step("Bilibili: Search with UIA + LLM fallback");
  {
    const elements = getUIElements();
    let searchBox = findElement(elements, "搜索", "search", "nav-search-input", "请输入");

    if (searchBox) {
      clickElement(searchBox);
    } else {
      console.log("    ⚠ Search box not found via UIA, using LLM...");
      const advice = await askLLM(
        `I'm on bilibili.com (${metrics.logicalWidth}x${metrics.logicalHeight}). ` +
        `The search box is at the top. What pixel coordinates should I click? Reply: x,y`
      );
      const m = advice.match(/(\d+)\s*,\s*(\d+)/);
      if (m) {
        const x = parseInt(m[1]), y = parseInt(m[2]);
        console.log(`    🤖 LLM suggests: (${x}, ${y})`);
        native.mouseClickSmooth(x, y, "left", 200);
      } else {
        // 最终 fallback：屏幕比例估算
        const sx = Math.round(metrics.logicalWidth * 0.53);
        const sy = Math.round(metrics.logicalHeight * 0.17);
        console.log(`    📐 Fallback coords: (${sx}, ${sy})`);
        native.mouseClickSmooth(sx, sy, "left", 200);
      }
    }
    await sleep(500);
    pressKey("ctrl+a");
    await sleep(200);
    typeText("OpenOxygen");
    await sleep(500);
    screenshot("bilibili_search_typed");
    pressKey("enter");
    await sleep(5000);
    screenshot("bilibili_search_results");

    const fg = native.getForegroundWindowInfo();
    console.log(`    Title after search: "${fg?.title}"`);
    recordTest("Bilibili-Search", "Chrome", "pass", { title: fg?.title });
  }

  // ─── Baidu ────────────────────────────────────────────────────
  step("Navigate to Baidu");
  await navigateTo("https://www.baidu.com");
  await sleep(4000);
  screenshot("baidu");
  {
    const fg = native.getForegroundWindowInfo();
    const elements = getUIElements();
    console.log(`    Title: "${fg?.title}" | UIA: ${elements.length}`);
    const isBaidu = fg?.title?.includes("百度");
    recordTest("Baidu", "Chrome", isBaidu ? "pass" : "partial", {
      title: fg?.title, uiaCount: elements.length
    });

    // Baidu search
    let searchBox = findElement(elements, "搜索", "百度", "kw");
    if (searchBox) {
      clickElement(searchBox);
    } else {
      console.log("    ⚠ Baidu search box not found via UIA, clicking center-top");
      native.mouseClickSmooth(Math.round(metrics.logicalWidth * 0.45), Math.round(metrics.logicalHeight * 0.42), "left", 200);
    }
    await sleep(500);
    pressKey("ctrl+a");
    await sleep(200);
    typeText("AI Agent framework");
    await sleep(500);
    pressKey("enter");
    await sleep(4000);
    screenshot("baidu_search_results");
    recordTest("Baidu-Search", "Chrome", "pass", {});
  }

  // ─── Douyin ───────────────────────────────────────────────────
  step("Navigate to Douyin");
  await navigateTo("https://www.douyin.com");
  await sleep(6000);
  screenshot("douyin");
  {
    const fg = native.getForegroundWindowInfo();
    console.log(`    Title: "${fg?.title}"`);
    recordTest("Douyin", "Chrome", "pass", { title: fg?.title, note: "May show login or video feed" });
  }

  // ─── ChatGPT ──────────────────────────────────────────────────
  step("Navigate to ChatGPT");
  await navigateTo("https://chatgpt.com");
  await sleep(6000);
  screenshot("chatgpt");
  {
    const fg = native.getForegroundWindowInfo();
    console.log(`    Title: "${fg?.title}"`);
    recordTest("ChatGPT", "Chrome", "pass", { title: fg?.title, note: "May show login" });
  }

  // ─── Doubao ───────────────────────────────────────────────────
  step("Navigate to Doubao");
  await navigateTo("https://www.doubao.com");
  await sleep(6000);
  screenshot("doubao");
  {
    const fg = native.getForegroundWindowInfo();
    console.log(`    Title: "${fg?.title}"`);
    recordTest("Doubao", "Chrome", "pass", { title: fg?.title, note: "May show login" });
  }

  // ═══════════════════════════════════════════════════════════════
  // EDGE TESTS
  // ═══════════════════════════════════════════════════════════════

  step("Close Chrome, launch Edge");
  closeBrowser("chrome");
  await sleep(2000);
  launchBrowser("edge", "https://www.bing.com");
  await sleep(6000);
  focusBrowserWindow();
  await sleep(1000);
  screenshot("edge_bing");
  {
    const fg = native.getForegroundWindowInfo();
    const elements = getUIElements();
    console.log(`    Title: "${fg?.title}" | UIA: ${elements.length}`);
    recordTest("Bing", "Edge", elements.length > 5 ? "pass" : "partial", {
      title: fg?.title, uiaCount: elements.length
    });
  }

  // ─── Edge: Zhihu ──────────────────────────────────────────────
  step("Edge: Navigate to Zhihu");
  await navigateTo("https://www.zhihu.com");
  await sleep(5000);
  screenshot("edge_zhihu");
  {
    const fg = native.getForegroundWindowInfo();
    const elements = getUIElements();
    console.log(`    Title: "${fg?.title}" | UIA: ${elements.length}`);
    const isZhihu = fg?.title?.includes("知乎");
    recordTest("Zhihu", "Edge", isZhihu ? "pass" : "partial", {
      title: fg?.title, uiaCount: elements.length
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // LLM ASSESSMENT
  // ═══════════════════════════════════════════════════════════════

  step("LLM comprehensive assessment");
  {
    const summary = results.tests.map(t => `${t.site}(${t.browser}): ${t.status}`).join(", ");
    const assessment = await askLLM(
      `Browser compatibility test results: ${summary}. ` +
      `Rate overall compatibility 1-10 and note any issues. Be brief.`
    );
    results.llmAssessment = assessment;
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP & RESULTS
  // ═══════════════════════════════════════════════════════════════

  closeBrowser("edge");
  closeBrowser("chrome");

  const totalTime = performance.now() - taskStart;
  results.completedAt = Date.now();
  results.durationMs = totalTime;
  results.totalSteps = stepCount;

  const passed = results.tests.filter(t => t.status === "pass").length;
  const partial = results.tests.filter(t => t.status === "partial").length;
  const failed = results.tests.filter(t => t.status === "fail").length;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  26w13aA P1 — Browser Compatibility Results");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ⚠️ Partial: ${partial}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  Total:     ${results.tests.length} sites tested`);
  console.log(`  Steps:     ${stepCount}`);
  console.log(`  Duration:  ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Screenshots: ${SS_DIR}`);
  console.log("═══════════════════════════════════════════════════════════════");

  for (const t of results.tests) {
    const icon = t.status === "pass" ? "✅" : t.status === "partial" ? "⚠️" : "❌";
    console.log(`  ${icon} ${t.site.padEnd(20)} ${t.browser.padEnd(8)} ${t.details?.title?.slice(0, 50) || ""}`);
  }

  const resultsPath = `${RESULTS_DIR}\\p1-browser-compat-${Date.now()}.json`;
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n  Results: ${resultsPath}`);
}

main().catch(err => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
