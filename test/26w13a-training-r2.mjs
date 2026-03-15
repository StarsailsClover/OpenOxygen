/**
 * OpenOxygen — 26w13aA Round 2: Fixed Training Test Suite
 *
 * 修复项：
 *   1. 中文输入：使用剪贴板方式 (clipboardSetText + Ctrl+V) 替代 typeText
 *   2. 应用检测：使用 native.listProcesses() 检测运行中进程
 *   3. 窗口隔离：每个任务开始前确认/恢复前台窗口
 *   4. 用户接管：需要登录时弹窗提示用户操作，等待确认后继续
 *
 * 训练任务：
 *   T1: Bilibili 搜索"逗比的雀巢" → 进入用户主页 → 播放第一个视频
 *   T2: QQ 界面探索（已运行）
 *   T3: VS Code 新建 Python 文件并保存
 *   T4: 百度搜索"OpenOxygen AI Agent" → 点击第一个结果
 *   T5: 知乎搜索（需登录 → 用户接管）
 *   T6: 豆包对话测试（已运行）
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const GATEWAY = "http://127.0.0.1:4800";
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\26w13a-training-r2";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";
const MEMORY_DIR = "D:\\Coding\\OpenOxygen\\.state\\ouv-training";
const MEMORY_FILE = `${MEMORY_DIR}\\visual-memory.json`;
const PROMPT_SCRIPT = "D:\\Coding\\OpenOxygen\\scripts\\user-prompt.ps1";

for (const d of [SS_DIR, RESULTS_DIR, MEMORY_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Visual Memory (carried over from R1)
// ═══════════════════════════════════════════════════════════════════════════

let visualMemory = { experiences: [], appIndex: {}, elementIndex: {} };

function loadMemory() {
  if (existsSync(MEMORY_FILE)) {
    try {
      visualMemory = JSON.parse(readFileSync(MEMORY_FILE, "utf-8"));
      console.log(`📚 Loaded ${visualMemory.experiences?.length || 0} prior experiences from R1`);
    } catch { console.log("📚 Starting fresh memory"); }
  }
}

function saveMemory() {
  writeFileSync(MEMORY_FILE, JSON.stringify({
    ...visualMemory, version: "26w13aA-R2", updatedAt: Date.now(),
  }, null, 2));
}

function recordExp(exp) {
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const entry = { id, timestamp: Date.now(), ...exp };
  if (!visualMemory.experiences) visualMemory.experiences = [];
  visualMemory.experiences.push(entry);
  if (!visualMemory.appIndex) visualMemory.appIndex = {};
  if (!visualMemory.appIndex[exp.app]) visualMemory.appIndex[exp.app] = [];
  visualMemory.appIndex[exp.app].push(id);
  if (!visualMemory.elementIndex) visualMemory.elementIndex = {};
  for (const el of (exp.elements || [])) {
    const key = (el.name || el.type || "").toLowerCase().replace(/\s+/g, "");
    if (!key) continue;
    if (!visualMemory.elementIndex[key]) visualMemory.elementIndex[key] = [];
    visualMemory.elementIndex[key].push({
      app: exp.app, x: el.x, y: el.y, w: el.width || el.w, h: el.height || el.h,
      confidence: el.confidence || 1.0, timestamp: Date.now(),
    });
  }
  saveMemory();
  return entry;
}

function queryPrior(app, elementName) {
  const key = (elementName || "").toLowerCase().replace(/\s+/g, "");
  const entries = (visualMemory.elementIndex?.[key] || [])
    .filter(e => !app || e.app === app)
    .sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  if (entries.length === 0) return null;
  let tw = 0, ax = 0, ay = 0;
  for (let i = 0; i < entries.length; i++) {
    const w = 1 / (i + 1); ax += entries[i].x * w; ay += entries[i].y * w; tw += w;
  }
  return { x: Math.round(ax / tw), y: Math.round(ay / tw), confidence: Math.min(entries.length / 3, 1), count: entries.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Utilities (FIXED)
// ═══════════════════════════════════════════════════════════════════════════

let stepCount = 0;
const metrics = native.getScreenMetrics();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function step(name) { stepCount++; console.log(`\n[Step ${stepCount}] ${name}`); }

function ss(label) {
  const path = `${SS_DIR}\\step${String(stepCount).padStart(2, "0")}_${label.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_")}.png`;
  try { native.captureScreen(path); console.log(`    📸 ${label}`); return path; }
  catch (e) { console.log(`    ⚠ SS: ${e.message}`); return null; }
}

function getElements() {
  try { return native.getUiElements(null).filter(e => e.name && !e.isOffscreen && e.width > 0 && e.height > 0); }
  catch { return []; }
}

function findEl(elements, ...keywords) {
  for (const kw of keywords) {
    const lower = kw.toLowerCase();
    const found = elements.find(e =>
      (e.name || "").toLowerCase().includes(lower) ||
      (e.automationId || "").toLowerCase().includes(lower)
    );
    if (found) return found;
  }
  return null;
}

function clickEl(el) {
  const x = el.x + Math.floor(el.width / 2);
  const y = el.y + Math.floor(el.height / 2);
  console.log(`    🖱️ Click: "${(el.name || "").slice(0, 40)}" [${el.controlType}] at (${x}, ${y})`);
  native.mouseClickSmooth(x, y, "left", 200);
  return { x, y };
}

function clickAt(x, y, reason) {
  console.log(`    🖱️ Click: (${x}, ${y}) — ${reason}`);
  native.mouseClickSmooth(x, y, "left", 200);
}

function key(keys) { console.log(`    ⌨️ Key: ${keys}`); native.sendHotkey(keys); }

/**
 * FIX #1: 中文输入使用剪贴板方式
 * typeText 对英文可靠，中文用 clipboard + Ctrl+V
 */
function typeEN(text) { console.log(`    ⌨️ TypeEN: "${text}"`); native.typeText(text); }

function typeCN(text) {
  console.log(`    ⌨️ TypeCN (clipboard): "${text}"`);
  native.clipboardSetText(text);
  native.sendHotkey("ctrl+v");
}

function typeAuto(text) {
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  if (hasChinese) { typeCN(text); } else { typeEN(text); }
}

/**
 * FIX #4: 用户接管弹窗
 * 弹出 Windows MessageBox，阻塞直到用户点击 OK 或 Cancel
 * 返回 true (OK) 或 false (Cancel)
 */
function promptUser(message) {
  console.log(`    👤 USER ACTION REQUIRED: ${message.slice(0, 80)}`);
  try {
    const result = execSync(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${PROMPT_SCRIPT}" "${message.replace(/"/g, '`"')}"`,
      { timeout: 300000 } // 5 分钟超时
    ).toString().trim();
    console.log(`    👤 User responded: ${result}`);
    return result === "OK";
  } catch (e) {
    console.log(`    ⚠ Prompt failed: ${e.message}`);
    return false;
  }
}

/**
 * FIX #2: 应用检测使用 native.listProcesses()
 */
function isProcessRunning(processName) {
  const procs = native.listProcesses();
  return procs.some(p => (p.name || "").toLowerCase() === processName.toLowerCase());
}

/**
 * FIX #3: 窗口隔离 — 确保前台窗口正确
 */
function ensureForeground(titlePart, className) {
  const wins = native.listWindows();
  const target = wins.find(w => w.visible && w.title &&
    (titlePart ? w.title.includes(titlePart) : true) &&
    (className ? w.className === className : true) &&
    w.width > 100
  );
  if (target) {
    native.focusWindow(target.hwnd);
    console.log(`    🪟 Focused: "${target.title.slice(0, 60)}"`);
    return target;
  }
  console.log(`    ⚠ Window "${titlePart || className}" not found`);
  return null;
}

async function askLLM(sys, user, model) {
  const body = { messages: [{ role: "system", content: sys }, { role: "user", content: user }], mode: "fast" };
  if (model) body.model = model;
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(`    🧠 LLM [${data.model || "?"}]: ${(data.content || "").slice(0, 120).replace(/\n/g, " ")}`);
    return data.content || "";
  } catch (e) { console.log(`    ⚠ LLM: ${e.message}`); return ""; }
}

/**
 * 智能定位：UIA → Memory → LLM → Ratio，带位置合理性校验
 */
async function smartLocate(app, desc, uiaKW, ratioFB) {
  const elements = getElements();

  // Level 1: UIA (排除底部导航栏误匹配)
  for (const kw of uiaKW) {
    const lower = kw.toLowerCase();
    const candidates = elements.filter(e =>
      ((e.name || "").toLowerCase().includes(lower) || (e.automationId || "").toLowerCase().includes(lower)) &&
      e.y > 30 && e.y < metrics.logicalHeight - 80 // 排除任务栏和极顶部
    );
    // 优先选择 input/edit 类型
    const inputEl = candidates.find(e => ["Edit", "ComboBox", "SearchBox"].includes(e.controlType));
    const bestEl = inputEl || candidates[0];
    if (bestEl) {
      const cx = bestEl.x + Math.floor(bestEl.width / 2);
      const cy = bestEl.y + Math.floor(bestEl.height / 2);
      console.log(`    📍 UIA: "${bestEl.name}" [${bestEl.controlType}] at (${cx}, ${cy})`);
      return { x: cx, y: cy, source: "uia", element: bestEl };
    }
  }

  // Level 2: Memory
  const prior = queryPrior(app, desc);
  if (prior && prior.confidence >= 0.5) {
    console.log(`    📍 Memory: (${prior.x}, ${prior.y}) conf=${prior.confidence.toFixed(2)} (${prior.count} samples)`);
    return { x: prior.x, y: prior.y, source: "memory" };
  }

  // Level 3: LLM
  const topEls = elements.slice(0, 25).map(e =>
    `[${e.controlType}] "${(e.name || "").slice(0, 30)}" at (${e.x},${e.y}) ${e.width}x${e.height}`
  ).join("\n");
  const fg = native.getForegroundWindowInfo();
  const llmResp = await askLLM(
    "You locate UI elements. Reply ONLY: x,y",
    `Screen ${metrics.logicalWidth}x${metrics.logicalHeight}. Window: "${fg?.title}". Find: ${desc}\nElements:\n${topEls}`,
    "qwen3:4b"
  );
  const m = llmResp.match(/(\d+)\s*,\s*(\d+)/);
  if (m) {
    console.log(`    📍 LLM: (${m[1]}, ${m[2]})`);
    return { x: parseInt(m[1]), y: parseInt(m[2]), source: "llm" };
  }

  // Level 4: Ratio
  if (ratioFB) {
    const x = Math.round(metrics.logicalWidth * ratioFB[0]);
    const y = Math.round(metrics.logicalHeight * ratioFB[1]);
    console.log(`    📍 Ratio: (${x}, ${y})`);
    return { x, y, source: "ratio" };
  }

  return null;
}

async function reflect(task, action, beforeTitle, afterTitle, elements) {
  const resp = await askLLM(
    'Evaluate action result. JSON: {"success":true/false,"observation":"...","lesson":"...","suggestion":"..."}',
    `Task: ${task}\nAction: ${action}\nBefore: "${beforeTitle}"\nAfter: "${afterTitle}"\nElements(${elements.length}): ${elements.slice(0, 10).map(e => (e.name || "").slice(0, 20)).filter(Boolean).join(", ")}`,
    "qwen3:4b"
  );
  try { const m = resp.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return { success: null, observation: resp.slice(0, 200) };
}

// ═══════════════════════════════════════════════════════════════════════════
// Browser helpers
// ═══════════════════════════════════════════════════════════════════════════

function closeBrowser(name = "chrome") {
  const proc = name === "edge" ? "msedge" : "chrome";
  try { execSync(`powershell.exe -NoProfile -Command "Get-Process ${proc} -EA SilentlyContinue | Stop-Process -Force"`, { timeout: 10000 }); } catch {}
}

function launchChrome(url) {
  execSync(`powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList '--new-window','${url}'"`, { timeout: 15000 });
}

function focusChrome() {
  return ensureForeground(null, "Chrome_WidgetWin_1");
}

async function navigateTo(url) {
  key("ctrl+l"); await sleep(500);
  key("ctrl+a"); await sleep(200);
  typeEN(url); await sleep(300);
  key("enter");
  console.log(`    ⏳ Loading ${url}...`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TRAINING TASKS
// ═══════════════════════════════════════════════════════════════════════════

const taskResults = [];

async function runTask(name, fn) {
  const start = performance.now();
  console.log(`\n${"═".repeat(65)}`);
  console.log(`  TASK: ${name}`);
  console.log(`${"═".repeat(65)}`);
  try {
    const result = await fn();
    const duration = performance.now() - start;
    taskResults.push({ name, status: result?.status || "done", duration, details: result });
    console.log(`\n  Result: ${name} → ${result?.status || "done"} (${(duration / 1000).toFixed(1)}s)`);
    return result;
  } catch (e) {
    const duration = performance.now() - start;
    taskResults.push({ name, status: "error", duration, error: e.message });
    console.log(`\n  ❌ Error: ${name} — ${e.message}`);
    return null;
  }
}

// ─── T1: Bilibili 搜索并播放视频 (FIXED: 剪贴板中文输入) ────────────

async function taskBilibili() {
  const GOAL = "在 bilibili 搜索'逗比的雀巢'，进入用户主页，播放第一个视频";

  step("启动 Chrome → bilibili");
  closeBrowser("chrome"); await sleep(2000);
  launchChrome("https://www.bilibili.com");
  await sleep(7000);
  const win = focusChrome(); await sleep(1000);
  const ssHome = ss("bilibili_home");

  // 记录首页
  const homeEls = getElements();
  recordExp({
    app: "bilibili", appType: "browser", pageUrl: "https://www.bilibili.com",
    windowTitle: win?.title, screenshotPath: ssHome,
    elements: homeEls.slice(0, 30).map(e => ({ name: e.name, type: e.controlType, x: e.x, y: e.y, width: e.width, height: e.height })),
    landmarks: [{ name: "搜索框", relativePosition: "top-center-right" }],
    action: { type: "observe" }, intent: "观察首页布局", result: "success",
  });

  // 定位搜索框
  step("定位并点击搜索框");
  const searchLoc = await smartLocate("bilibili", "搜索框", ["nav-search-input", "请输入", "搜索"], [0.53, 0.05]);
  if (!searchLoc) throw new Error("搜索框定位失败");
  clickAt(searchLoc.x, searchLoc.y, `搜索框 (${searchLoc.source})`);
  await sleep(800);

  // FIX: 用剪贴板输入中文
  step("输入搜索词 (剪贴板方式)");
  key("ctrl+a"); await sleep(200);
  typeCN("逗比的雀巢");
  await sleep(800);
  ss("bilibili_search_typed");

  // 验证输入是否成功
  const clipCheck = native.clipboardGetText();
  console.log(`    📋 Clipboard content: "${clipCheck}"`);

  key("enter");
  console.log("    ⏳ 等待搜索结果...");
  await sleep(6000);
  ss("bilibili_search_results");

  // 反思
  const afterSearch = native.getForegroundWindowInfo();
  const searchEls = getElements();
  const ref1 = await reflect(GOAL, "搜索'逗比的雀巢'", win?.title, afterSearch?.title, searchEls);

  recordExp({
    app: "bilibili", appType: "browser", windowTitle: afterSearch?.title,
    elements: searchEls.slice(0, 20).map(e => ({ name: e.name, type: e.controlType, x: e.x, y: e.y, width: e.width, height: e.height })),
    action: { type: "type", target: "搜索框", text: "逗比的雀巢", method: "clipboard" },
    intent: "搜索用户", result: ref1.success ? "success" : "partial",
    resultDetail: ref1.observation, reflection: ref1,
  });

  // 点击"用户"标签
  step("点击'用户'标签");
  const userTabLoc = await smartLocate("bilibili", "用户标签", ["用户"], [0.22, 0.17]);
  if (userTabLoc) {
    clickAt(userTabLoc.x, userTabLoc.y, `用户标签 (${userTabLoc.source})`);
    await sleep(4000);
    ss("bilibili_user_tab");
  }

  // 找用户并进入主页
  step("进入'逗比的雀巢'主页");
  const userEls = getElements();
  const userCard = findEl(userEls, "逗比的雀巢");
  if (userCard) {
    clickEl(userCard);
  } else {
    const advice = await askLLM(
      "Find '逗比的雀巢' user link. Reply: x,y",
      `Screen ${metrics.logicalWidth}x${metrics.logicalHeight}. Elements: ${userEls.slice(0, 20).map(e => `"${(e.name || "").slice(0, 30)}" at(${e.x},${e.y})`).join("; ")}`,
      "qwen3:4b"
    );
    const m = advice.match(/(\d+)\s*,\s*(\d+)/);
    if (m) clickAt(parseInt(m[1]), parseInt(m[2]), "用户卡片 (LLM)");
    else {
      console.log("    ⚠ 无法定位用户，尝试滚动查找...");
      native.mouseScroll(-3); await sleep(2000);
    }
  }
  await sleep(5000);
  ss("bilibili_user_profile");

  // 播放第一个视频
  step("播放第一个视频");
  const profileEls = getElements();
  const videoLinks = profileEls.filter(e =>
    (e.controlType === "Hyperlink" || e.controlType === "Link" || e.controlType === "ListItem") &&
    (e.name || "").length > 5 && e.y > 200 &&
    !(e.name || "").includes("搜索") && !(e.name || "").includes("首页")
  );
  console.log(`    视频链接: ${videoLinks.length}`);
  for (const v of videoLinks.slice(0, 5)) {
    console.log(`      "${(v.name || "").slice(0, 50)}" at (${v.x},${v.y})`);
  }

  if (videoLinks.length > 0) {
    clickEl(videoLinks[0]);
    await sleep(6000);
    ss("bilibili_video");
    const videoFg = native.getForegroundWindowInfo();
    const ref2 = await reflect(GOAL, "播放第一个视频", afterSearch?.title, videoFg?.title, getElements());
    recordExp({
      app: "bilibili", windowTitle: videoFg?.title,
      action: { type: "click", target: "第一个视频" },
      intent: "播放视频", result: ref2.success ? "success" : "partial",
      reflection: ref2,
    });
    return { status: ref2.success ? "success" : "partial", reflection: ref2 };
  }
  return { status: "partial", note: "No video links found" };
}

// ─── T2: QQ 界面探索 (FIXED: 使用 listProcesses 检测) ───────────────

async function taskQQExplore() {
  const GOAL = "探索 QQ 界面布局，记录联系人列表和聊天窗口位置";

  step("检测 QQ 进程");
  const qqRunning = isProcessRunning("QQ.exe");
  console.log(`    QQ running: ${qqRunning}`);

  if (!qqRunning) {
    return { status: "skip", note: "QQ not running" };
  }

  step("聚焦 QQ 窗口");
  // QQ 可能最小化到托盘，尝试多种方式找到窗口
  let qqWin = ensureForeground("QQ", null);
  if (!qqWin) {
    // 尝试通过类名
    const wins = native.listWindows();
    const qqCandidates = wins.filter(w => w.title && (
      w.title.includes("QQ") || w.className?.includes("TXGuiFoundation") ||
      w.className?.includes("QQ") || w.title.includes("腾讯")
    ));
    console.log(`    QQ window candidates: ${qqCandidates.length}`);
    for (const w of qqCandidates) {
      console.log(`      "${w.title}" class=${w.className} visible=${w.visible} ${w.width}x${w.height}`);
    }
    if (qqCandidates.length > 0) {
      native.focusWindow(qqCandidates[0].hwnd);
      qqWin = qqCandidates[0];
      await sleep(1000);
    }
  }

  if (!qqWin) {
    // QQ 可能在托盘，提示用户打开
    const userOk = promptUser("QQ 似乎最小化到了托盘。\n\n请手动打开 QQ 主窗口，然后点击「确定」继续。");
    if (!userOk) return { status: "skip", note: "User cancelled" };
    await sleep(2000);
    qqWin = ensureForeground("QQ", null);
  }

  if (!qqWin) return { status: "fail", note: "QQ window not found" };

  ss("qq_main");

  step("分析 QQ 界面");
  const elements = getElements();
  console.log(`    UIA elements: ${elements.length}`);

  const typeCount = {};
  for (const e of elements) typeCount[e.controlType] = (typeCount[e.controlType] || 0) + 1;
  console.log(`    Types: ${JSON.stringify(typeCount)}`);

  // 找关键区域
  const chatList = findEl(elements, "消息", "聊天", "会话");
  const contacts = findEl(elements, "联系人", "好友", "通讯录");
  const searchBox = findEl(elements, "搜索", "Search");

  console.log(`    消息列表: ${chatList ? `"${chatList.name}" at (${chatList.x},${chatList.y})` : "未找到"}`);
  console.log(`    联系人: ${contacts ? `"${contacts.name}" at (${contacts.x},${contacts.y})` : "未找到"}`);
  console.log(`    搜索: ${searchBox ? `"${searchBox.name}" at (${searchBox.x},${searchBox.y})` : "未找到"}`);

  // LLM 分析
  const analysis = await askLLM(
    "Analyze this IM app layout. Describe: contact list, chat area, search, toolbar positions.",
    `Window: "${qqWin.title}" (${qqWin.width}x${qqWin.height})\nElements (${elements.length}):\n` +
    elements.slice(0, 30).map(e => `[${e.controlType}] "${(e.name || "").slice(0, 30)}" at (${e.x},${e.y}) ${e.width}x${e.height}`).join("\n"),
    "qwen3:4b"
  );

  recordExp({
    app: "qq", appType: "desktop", windowTitle: qqWin.title,
    elements: elements.slice(0, 40).map(e => ({ name: e.name, type: e.controlType, x: e.x, y: e.y, width: e.width, height: e.height })),
    landmarks: [
      chatList && { name: "消息列表", relativePosition: "left" },
      contacts && { name: "联系人", relativePosition: "left" },
      searchBox && { name: "搜索框", relativePosition: "top" },
    ].filter(Boolean),
    action: { type: "observe" }, intent: GOAL, result: "success",
    vlmDescription: analysis.slice(0, 300),
  });

  return { status: "success", elements: elements.length, analysis: analysis.slice(0, 200) };
}

// ─── T3: VS Code 新建文件 (FIXED: 窗口隔离 + 保存流程) ──────────────

async function taskVSCode() {
  const GOAL = "VS Code 新建 Python 文件，输入代码，保存";

  step("聚焦 VS Code");
  let vscWin = ensureForeground("Visual Studio Code", null);
  if (!vscWin) {
    execSync('powershell.exe -NoProfile -Command "Start-Process code"', { timeout: 15000 });
    await sleep(5000);
    vscWin = ensureForeground("Visual Studio Code", null);
  }
  if (!vscWin) return { status: "fail", note: "VS Code not found" };
  ss("vscode_ready");

  step("新建文件");
  key("ctrl+n"); await sleep(2000);

  // FIX: 确保焦点在编辑器
  const afterNew = ensureForeground("Untitled", null) || ensureForeground("Visual Studio Code", null);
  ss("vscode_new");

  step("输入 Python 代码");
  // 用英文输入（代码不需要中文）
  typeEN("# OpenOxygen OUV Training R2");
  key("enter");
  typeEN("def test_ouv():");
  key("enter");
  typeEN("    print('Hello from OpenOxygen R2!')");
  key("enter");
  typeEN("    return True");
  key("enter"); key("enter");
  typeEN("if __name__ == '__main__':");
  key("enter");
  typeEN("    test_ouv()");
  await sleep(500);
  ss("vscode_code");

  step("保存文件");
  // 使用 Ctrl+S（如果是新文件会弹出保存对话框）
  key("ctrl+s");
  await sleep(2000);
  ss("vscode_save_dialog");

  // 检查是否弹出了保存对话框
  const saveWin = native.getForegroundWindowInfo();
  console.log(`    Save dialog: "${saveWin?.title}"`);

  if (saveWin?.title?.includes("Save") || saveWin?.title?.includes("保存") || saveWin?.title?.includes("另存为")) {
    // 在保存对话框中输入文件名
    typeEN("test_ouv_r2.py");
    await sleep(500);
    key("enter");
    await sleep(2000);
  } else {
    // 可能需要 Ctrl+Shift+S
    key("ctrl+shift+s");
    await sleep(2000);
    typeEN("test_ouv_r2.py");
    await sleep(500);
    key("enter");
    await sleep(2000);
  }

  // FIX: 确认保存对话框已关闭
  const afterSave = native.getForegroundWindowInfo();
  console.log(`    After save: "${afterSave?.title}"`);

  // 如果还在对话框中，按 Escape 关闭
  if (afterSave?.title?.includes("Save") || afterSave?.title?.includes("保存")) {
    key("escape");
    await sleep(1000);
  }

  ss("vscode_saved");

  const ref = await reflect(GOAL, "保存 Python 文件", vscWin?.title, afterSave?.title, getElements());
  recordExp({
    app: "vscode", appType: "desktop", windowTitle: afterSave?.title,
    action: { type: "type", target: "editor", text: "Python code" },
    intent: GOAL, result: ref.success ? "success" : "partial",
    reflection: ref,
  });

  // 关闭文件
  key("ctrl+w"); await sleep(1000);

  return { status: ref.success ? "success" : "partial", reflection: ref };
}

// ─── T4: 百度搜索 (FIXED: 窗口隔离) ────────────────────────────────

async function taskBaidu() {
  const GOAL = "百度搜索'OpenOxygen AI Agent'，点击第一个结果";

  step("确保 Chrome 在前台，导航到百度");
  // FIX: 先确认前台窗口是浏览器
  let win = focusChrome();
  if (!win) {
    launchChrome("https://www.baidu.com");
    await sleep(5000);
    win = focusChrome();
  } else {
    await navigateTo("https://www.baidu.com");
  }
  await sleep(4000);

  // FIX: 再次确认前台是 Chrome
  const fg = native.getForegroundWindowInfo();
  if (!fg?.className?.includes("Chrome")) {
    console.log(`    ⚠ 前台不是 Chrome (${fg?.className})，重新聚焦`);
    win = focusChrome();
    await sleep(1000);
  }
  ss("baidu_home");

  step("定位百度搜索框");
  const searchLoc = await smartLocate("baidu", "百度搜索框", ["kw", "百度一下"], [0.45, 0.42]);
  if (!searchLoc) throw new Error("百度搜索框定位失败");
  clickAt(searchLoc.x, searchLoc.y, `搜索框 (${searchLoc.source})`);
  await sleep(500);

  step("输入搜索词并搜索");
  key("ctrl+a"); await sleep(200);
  typeEN("OpenOxygen AI Agent");
  await sleep(500);
  ss("baidu_typed");
  key("enter");
  await sleep(5000);
  ss("baidu_results");

  step("点击第一个结果");
  const resultEls = getElements();
  const links = resultEls.filter(e =>
    (e.controlType === "Hyperlink" || e.controlType === "Link") &&
    (e.name || "").length > 10 && e.y > 200 && e.y < metrics.logicalHeight - 100
  );
  console.log(`    结果链接: ${links.length}`);
  for (const l of links.slice(0, 5)) {
    console.log(`      "${(l.name || "").slice(0, 50)}" at (${l.x},${l.y})`);
  }

  if (links.length > 0) {
    clickEl(links[0]);
    await sleep(5000);
    ss("baidu_result_page");
    const afterClick = native.getForegroundWindowInfo();
    const ref = await reflect(GOAL, "点击第一个结果", "百度搜索", afterClick?.title, getElements());
    recordExp({
      app: "baidu", windowTitle: afterClick?.title,
      action: { type: "click", target: "第一个搜索结果" },
      intent: GOAL, result: ref.success ? "success" : "partial", reflection: ref,
    });
    return { status: ref.success ? "success" : "partial" };
  }
  return { status: "partial", note: "No result links" };
}

// ─── T5: 知乎搜索 (FIXED: 用户接管登录) ────────────────────────────

async function taskZhihu() {
  const GOAL = "在知乎搜索'AI Agent 框架'，浏览第一个回答";

  step("启动 Edge → 知乎");
  closeBrowser("chrome"); await sleep(2000);
  execSync('powershell.exe -NoProfile -Command "Start-Process msedge.exe -ArgumentList \'--new-window\',\'https://www.zhihu.com\'"', { timeout: 15000 });
  await sleep(6000);
  ensureForeground(null, "Chrome_WidgetWin_1"); // Edge 也用这个类名
  await sleep(1000);
  ss("zhihu_home");

  // 检查是否需要登录
  step("检查是否需要登录");
  const fg = native.getForegroundWindowInfo();
  const elements = getElements();
  const loginIndicators = elements.filter(e =>
    (e.name || "").includes("登录") || (e.name || "").includes("注册") ||
    (e.name || "").includes("验证码") || (e.name || "").includes("Login")
  );

  if (loginIndicators.length > 0) {
    console.log(`    🔐 检测到登录页面 (${loginIndicators.length} 个登录相关元素)`);

    // 用户接管
    const userOk = promptUser(
      "知乎需要登录才能使用搜索功能。\n\n" +
      "请在浏览器中完成知乎登录，\n" +
      "登录成功后点击「确定」继续测试。\n\n" +
      "如果不想登录，点击「取消」跳过此测试。"
    );

    if (!userOk) {
      recordExp({
        app: "zhihu", action: { type: "observe" }, intent: "登录检测",
        result: "skip", resultDetail: "用户选择跳过登录",
        reflection: { lesson: "知乎需要登录，用户选择跳过" },
      });
      return { status: "skip", note: "User skipped login" };
    }

    // 用户登录完成，等待页面稳定
    await sleep(3000);
    ss("zhihu_after_login");
  }

  // 搜索
  step("定位知乎搜索框");
  const searchLoc = await smartLocate("zhihu", "知乎搜索框", ["搜索", "Search", "搜你想搜的", "请输入"], [0.45, 0.05]);
  if (!searchLoc) {
    return { status: "partial", note: "搜索框未找到" };
  }
  clickAt(searchLoc.x, searchLoc.y, `搜索框 (${searchLoc.source})`);
  await sleep(500);

  step("输入搜索词");
  key("ctrl+a"); await sleep(200);
  typeCN("AI Agent 框架");
  await sleep(800);
  ss("zhihu_typed");
  key("enter");
  await sleep(5000);
  ss("zhihu_results");

  // 点击第一个回答
  step("点击第一个回答");
  const resultEls = getElements();
  const answers = resultEls.filter(e =>
    (e.controlType === "Hyperlink" || e.controlType === "Link") &&
    (e.name || "").length > 10 && e.y > 200
  );
  if (answers.length > 0) {
    clickEl(answers[0]);
    await sleep(5000);
    ss("zhihu_answer");
    recordExp({
      app: "zhihu", action: { type: "click", target: "第一个回答" },
      intent: GOAL, result: "success",
    });
    return { status: "success" };
  }
  return { status: "partial", note: "No answers found" };
}

// ─── T6: 豆包对话 (已运行的桌面应用) ───────────────────────────────

async function taskDoubao() {
  const GOAL = "打开豆包，发送一条消息，验证 AI 回复";

  step("检测豆包进程");
  const running = isProcessRunning("Doubao.exe");
  console.log(`    Doubao running: ${running}`);
  if (!running) return { status: "skip", note: "Doubao not running" };

  step("聚焦豆包窗口");
  let dbWin = ensureForeground("豆包", null);
  if (!dbWin) {
    // 可能在托盘
    const userOk = promptUser("豆包似乎最小化了。\n\n请手动打开豆包窗口，然后点击「确定」继续。");
    if (!userOk) return { status: "skip", note: "User cancelled" };
    await sleep(2000);
    dbWin = ensureForeground("豆包", null);
  }
  if (!dbWin) return { status: "fail", note: "Doubao window not found" };
  ss("doubao_main");

  step("分析豆包界面");
  const elements = getElements();
  console.log(`    UIA elements: ${elements.length}`);

  // 找输入框
  const inputBox = findEl(elements, "输入", "发送", "消息", "Message", "input");
  console.log(`    输入框: ${inputBox ? `"${inputBox.name}" at (${inputBox.x},${inputBox.y})` : "未找到"}`);

  // LLM 分析
  const analysis = await askLLM(
    "Analyze this AI chat app layout. Where is the input box, send button, chat history?",
    `Window: "${dbWin.title}" (${dbWin.width}x${dbWin.height})\nElements:\n` +
    elements.slice(0, 30).map(e => `[${e.controlType}] "${(e.name || "").slice(0, 30)}" at (${e.x},${e.y})`).join("\n"),
    "qwen3:4b"
  );

  // 尝试发送消息
  step("发送测试消息");
  if (inputBox) {
    clickEl(inputBox);
  } else {
    // 豆包输入框通常在底部
    const inputLoc = await smartLocate("doubao", "输入框", ["输入", "发送"], [0.5, 0.9]);
    if (inputLoc) clickAt(inputLoc.x, inputLoc.y, `输入框 (${inputLoc.source})`);
  }
  await sleep(500);

  typeCN("你好，这是 OpenOxygen 的自动化测试。请回复'收到'。");
  await sleep(800);
  ss("doubao_typed");
  key("enter");
  console.log("    ⏳ 等待 AI 回复...");
  await sleep(8000);
  ss("doubao_reply");

  const afterReply = native.getForegroundWindowInfo();
  const ref = await reflect(GOAL, "发送消息并等待回复", dbWin.title, afterReply?.title, getElements());

  recordExp({
    app: "doubao", appType: "desktop", windowTitle: dbWin.title,
    elements: elements.slice(0, 30).map(e => ({ name: e.name, type: e.controlType, x: e.x, y: e.y, width: e.width, height: e.height })),
    action: { type: "type", target: "输入框", text: "测试消息", method: "clipboard" },
    intent: GOAL, result: ref.success ? "success" : "partial",
    vlmDescription: analysis.slice(0, 300), reflection: ref,
  });

  return { status: ref.success ? "success" : "partial", reflection: ref };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA R2 — Fixed Training Suite               ║");
  console.log("║  Fixes: clipboard CN input, process detection, window mgmt  ║");
  console.log("║  New: user takeover prompts for login scenarios             ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const taskStart = performance.now();
  loadMemory();

  // Pre-check
  const health = await fetch(`${GATEWAY}/health`).then(r => r.json());
  console.log(`Gateway: ✓ ${health.status}`);
  const llm = await askLLM("Test", "Say OK", "qwen3:4b");
  console.log(`LLM: ${llm ? "✓" : "✗"}`);
  console.log(`Screen: ${metrics.logicalWidth}x${metrics.logicalHeight}`);
  console.log(`Memory: ${visualMemory.experiences?.length || 0} prior experiences`);

  // 检测已运行的应用
  const runningApps = ["QQ.exe", "Doubao.exe", "ChatGPT.exe", "Code.exe", "WeChat.exe", "wps.exe"]
    .filter(p => isProcessRunning(p));
  console.log(`Running apps: ${runningApps.join(", ") || "none detected"}\n`);

  // Run tasks
  await runTask("T1: Bilibili 搜索并播放视频", taskBilibili);
  await runTask("T2: QQ 界面探索", taskQQExplore);
  await runTask("T3: VS Code 新建文件并写代码", taskVSCode);
  await runTask("T4: 百度搜索并点击结果", taskBaidu);
  await runTask("T5: 知乎搜索 (需登录)", taskZhihu);
  await runTask("T6: 豆包对话测试", taskDoubao);

  // Cleanup
  closeBrowser("chrome");
  closeBrowser("edge");

  // Memory stats
  saveMemory();
  const memStats = {
    total: visualMemory.experiences?.length || 0,
    apps: Object.keys(visualMemory.appIndex || {}).length,
    elements: Object.keys(visualMemory.elementIndex || {}).length,
  };

  // Summary
  const totalTime = performance.now() - taskStart;
  console.log(`\n${"═".repeat(65)}`);
  console.log("  26w13aA R2 Training Results");
  console.log(`${"═".repeat(65)}`);
  for (const t of taskResults) {
    const icon = t.status === "success" ? "✅" : t.status === "partial" ? "⚠️" : t.status === "skip" ? "⊘" : "❌";
    console.log(`  ${icon} ${t.name} — ${t.status} (${(t.duration / 1000).toFixed(1)}s)`);
  }
  console.log(`\n  Duration: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Memory: ${memStats.total} exp, ${memStats.apps} apps, ${memStats.elements} element types`);
  console.log(`  Memory file: ${MEMORY_FILE}`);

  const resultsPath = `${RESULTS_DIR}\\training-r2-${Date.now()}.json`;
  writeFileSync(resultsPath, JSON.stringify({ taskResults, memStats, duration: totalTime }, null, 2));
  console.log(`  Results: ${resultsPath}`);
}

main().catch(err => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
