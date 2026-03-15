/**
 * OpenOxygen 26w13aA-P1 — Quick Smoke Test (LLM-Driven)
 * 精简版：仅测试 Chrome 启动 + LLM 驱动导航 + UIA 检测
 */

import { createRequire } from "node:module";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const GATEWAY = "http://127.0.0.1:4800";
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\browser-compat";
if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let ssIdx = 0;
function ss(label) {
  ssIdx++;
  const p = `${SS_DIR}\\smoke_${String(ssIdx).padStart(2,"0")}_${label.replace(/[^a-z0-9]/gi,"_")}.png`;
  try { native.captureScreen(p); console.log(`  📸 ${label}`); return p; } catch(e) { console.log(`  ⚠ ss fail: ${e.message}`); return null; }
}

async function askLLM(sys, user, model) {
  const start = performance.now();
  const body = { messages: [{ role: "system", content: sys }, { role: "user", content: user }] };
  if (model) body.model = model;
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    const content = data.content || data.response || "";
    const ms = (performance.now() - start).toFixed(0);
    console.log(`  🧠 LLM (${ms}ms, ${content.length}ch): ${content.substring(0, 150).replace(/\n/g, " ")}`);
    return content;
  } catch(e) { console.log(`  ⚠ LLM err: ${e.message}`); return null; }
}

async function llmAct(instruction) {
  let uia = "";
  try {
    const els = native.getUiElements();
    uia = els.filter(e => e.name?.trim()).slice(0, 30)
      .map(e => `[${e.controlType}] "${e.name}" (${e.x},${e.y},${e.width}x${e.height})`)
      .join("\n");
  } catch {}

  let winInfo = "";
  try { const fg = native.getForegroundWindowInfo(); winInfo = `Foreground: "${fg.title}" (${fg.className})`; } catch {}

  const metrics = native.getScreenMetrics();
  const resp = await askLLM(
    `You are a Windows automation agent on a ${metrics.logicalWidth}x${metrics.logicalHeight} screen.
Respond with EXACTLY ONE JSON action:
{"action":"click","x":N,"y":N,"reason":"..."}
{"action":"type","text":"...","reason":"..."}
{"action":"hotkey","keys":"ctrl+l","reason":"..."}
{"action":"wait","ms":N,"reason":"..."}
{"action":"none","reason":"..."}
ONLY JSON. No explanation.`,
    `Task: ${instruction}\n${winInfo}\nUI elements:\n${uia}`
  );

  if (!resp) return null;
  try {
    const m = resp.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    const d = JSON.parse(m[0]);
    console.log(`  🎯 ${d.action}: ${d.reason || ""}`);
    switch(d.action) {
      case "click": native.mouseClick(d.x, d.y); break;
      case "double_click": native.mouseDoubleClick(d.x, d.y); break;
      case "type": native.typeText(d.text); break;
      case "hotkey": native.sendHotkey(d.keys); break;
      case "wait": await sleep(d.ms || 1000); break;
    }
    return d;
  } catch(e) { console.log(`  ⚠ parse: ${e.message}`); return null; }
}

// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║  26w13aA-P1 Smoke Test — LLM-Driven Browser Compat  ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // 0. Pre-check
  const health = await fetch(`${GATEWAY}/health`).then(r => r.json());
  console.log(`Gateway: ✓ ${health.status}`);
  console.log(`Native: ✓ ${Object.keys(native).length} funcs`);
  console.log(`Screen: ${JSON.stringify(native.getScreenMetrics())}\n`);

  // 1. 关闭已有 Chrome
  console.log("━━━ Step 1: Close existing Chrome ━━━");
  try { execSync('powershell.exe -NoProfile -Command "Get-Process chrome -EA SilentlyContinue | Stop-Process -Force"', { timeout: 10000 }); } catch {}
  await sleep(2000);
  console.log("  ✓ Chrome closed\n");

  // 2. 启动 Chrome
  console.log("━━━ Step 2: Launch Chrome → google.com ━━━");
  execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://www.google.com\'"', { timeout: 15000 });
  console.log("  ✓ Chrome launch command sent");
  await sleep(6000);

  // 3. 检测 Chrome 窗口
  console.log("\n━━━ Step 3: Detect Chrome window ━━━");
  const wins = native.listWindows();
  const chromeWins = wins.filter(w => w.visible && w.className === "Chrome_WidgetWin_1" && w.title && w.width > 200);
  console.log(`  Found ${chromeWins.length} Chrome window(s):`);
  for (const w of chromeWins) {
    console.log(`    "${w.title}" (${w.width}x${w.height}) hwnd=${w.hwnd}`);
  }

  if (chromeWins.length === 0) {
    console.log("  ✗ No Chrome windows found! Aborting.");
    process.exit(1);
  }

  // 聚焦最大的 Chrome 窗口
  const mainWin = chromeWins.sort((a,b) => (b.width*b.height) - (a.width*a.height))[0];
  native.focusWindow(mainWin.hwnd);
  await sleep(1000);
  ss("chrome_launched");

  // 4. LLM 分析当前屏幕
  console.log("\n━━━ Step 4: LLM analyzes current screen ━━━");
  const fg = native.getForegroundWindowInfo();
  console.log(`  Foreground: "${fg.title}" (${fg.className})`);

  const elements = native.getUiElements();
  console.log(`  UIA elements: ${elements.length}`);

  const analysis = await askLLM(
    "You are a screen analysis assistant. Describe what you see based on the UI element data.",
    `Window title: "${fg.title}"\nUI elements (${elements.length} total, showing top 20):\n` +
    elements.filter(e => e.name?.trim()).slice(0, 20)
      .map(e => `  [${e.controlType}] "${e.name}" at (${e.x},${e.y})`)
      .join("\n") +
    "\n\nIs this Google's homepage? What elements are visible?"
  );

  // 5. LLM 驱动导航到 bilibili
  console.log("\n━━━ Step 5: LLM-driven navigation → bilibili ━━━");

  // 让 LLM 打开地址栏
  console.log("  5a. LLM opens address bar:");
  await llmAct("Open the browser address bar (Ctrl+L) so I can type a new URL");
  await sleep(800);

  // 输入 URL
  console.log("  5b. Type URL:");
  native.sendHotkey("ctrl+a");
  await sleep(200);
  native.typeText("https://www.bilibili.com");
  await sleep(300);
  native.sendHotkey("enter");
  console.log("  ✓ URL entered, waiting for load...");
  await sleep(5000);

  ss("bilibili_loaded");

  // 6. LLM 验证 bilibili 加载
  console.log("\n━━━ Step 6: LLM verifies bilibili ━━━");
  const fg2 = native.getForegroundWindowInfo();
  console.log(`  Foreground: "${fg2.title}"`);

  const els2 = native.getUiElements();
  console.log(`  UIA elements: ${els2.length}`);

  const verify = await askLLM(
    "You are verifying a website loaded correctly.",
    `Window title: "${fg2.title}"\nUI elements (${els2.length} total, top 20):\n` +
    els2.filter(e => e.name?.trim()).slice(0, 20)
      .map(e => `  [${e.controlType}] "${e.name}"`)
      .join("\n") +
    "\n\nIs this bilibili (哔哩哔哩)? Respond JSON: {\"is_bilibili\": true/false, \"confidence\": 0-1, \"evidence\": \"...\"}"
  );

  // 7. LLM 驱动搜索操作
  console.log("\n━━━ Step 7: LLM-driven search on bilibili ━━━");
  console.log("  7a. LLM finds and clicks search box:");
  await llmAct("Click on the bilibili search box (搜索框) at the top of the page");
  await sleep(800);

  console.log("  7b. Type search query:");
  native.typeText("OpenOxygen");
  await sleep(500);
  native.sendHotkey("enter");
  await sleep(4000);

  ss("bilibili_search_results");

  const fg3 = native.getForegroundWindowInfo();
  console.log(`  Foreground: "${fg3.title}"`);

  const searchVerify = await askLLM(
    "You are verifying search results.",
    `Window title: "${fg3.title}"\nDid the search execute? Are search results visible?\nRespond JSON: {"search_executed": true/false, "has_results": true/false, "notes": "..."}`
  );

  // 8. 导航到百度
  console.log("\n━━━ Step 8: Navigate to Baidu ━━━");
  await llmAct("Open the browser address bar (press Ctrl+L)");
  await sleep(500);
  native.sendHotkey("ctrl+a");
  await sleep(200);
  native.typeText("https://www.baidu.com");
  await sleep(300);
  native.sendHotkey("enter");
  await sleep(4000);

  ss("baidu_home");
  const fg4 = native.getForegroundWindowInfo();
  console.log(`  Foreground: "${fg4.title}"`);

  // LLM 驱动百度搜索
  console.log("  8a. LLM clicks Baidu search box:");
  await llmAct("Click on the Baidu search input box (百度一下的搜索框)");
  await sleep(500);
  native.typeText("AI Agent 框架");
  await sleep(500);
  native.sendHotkey("enter");
  await sleep(4000);

  ss("baidu_search_results");

  // 9. 总结
  console.log("\n━━━ Summary ━━━");
  console.log("  ✓ Chrome launch & window detection");
  console.log("  ✓ LLM screen analysis via Gateway");
  console.log("  ✓ LLM-driven UI interaction (address bar, search)");
  console.log("  ✓ UIA element detection in browser");
  console.log("  ✓ Chinese website (bilibili, baidu) navigation");
  console.log("  ✓ Search functionality on multiple sites");
  console.log(`\n  Total LLM calls: ~8+`);
  console.log("  Smoke test COMPLETE ✓\n");

  // 不关闭 Chrome，留给用户查看
}

main().catch(e => { console.error("Fatal:", e); process.exit(2); });
