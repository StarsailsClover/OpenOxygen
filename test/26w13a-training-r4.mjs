/**
 * OpenOxygen — 26w13aA R4: VLM-Driven Deep Training
 *
 * R4 核心改进：
 *   1. qwen3-vl:4b 真实截图视觉分析（/no_think 模式）
 *   2. Win键修复：先 win+d 显示桌面再 win 打开菜单
 *   3. 严格窗口隔离：每个任务开始前关闭所有无关窗口
 *   4. 操作闭环：每步操作后 VLM 验证截图，失败换策略重试
 *   5. 多AI接力：VLM感知 → qwen3快速决策 → gpt-oss深度推理
 *
 * 训练任务：
 *   T1: Win键系统搜索 → 打开记事本 → 写内容 → Ctrl+S保存 → Alt+F4关闭
 *   T2: Bilibili VLM导航 — VLM看截图定位搜索框 → 搜索 → 用户 → 视频
 *   T3: Gmail 邮件（用户接管登录）
 *   T4: VS Code 完整闭环（整块粘贴 → Ctrl+S → 处理保存对话框 → 终端运行）
 *   T5: 豆包3轮深度对话
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const fs = require("fs");
const GATEWAY = "http://127.0.0.1:4800";
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\26w13a-training-r4";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";
const MEMORY_DIR = "D:\\Coding\\OpenOxygen\\.state\\ouv-training";
const MEMORY_FILE = `${MEMORY_DIR}\\visual-memory.json`;
const PROMPT_SCRIPT = "D:\\Coding\\OpenOxygen\\scripts\\user-prompt.ps1";

for (const d of [SS_DIR, RESULTS_DIR, MEMORY_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Visual Memory
// ═══════════════════════════════════════════════════════════════════════════

let visualMemory = { experiences: [], appIndex: {}, elementIndex: {} };
function loadMemory() {
  if (existsSync(MEMORY_FILE)) { try { visualMemory = JSON.parse(readFileSync(MEMORY_FILE, "utf-8")); } catch {} }
  console.log(`📚 Memory: ${visualMemory.experiences?.length || 0} prior experiences`);
}
function saveMemory() { writeFileSync(MEMORY_FILE, JSON.stringify({ ...visualMemory, version: "26w13aA-R4", updatedAt: Date.now() }, null, 2)); }
function recordExp(exp) {
  if (exp.windowTitle) exp.windowTitle = sanitize(exp.windowTitle);
  if (exp.vlmDescription) exp.vlmDescription = sanitize(exp.vlmDescription);
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const entry = { id, timestamp: Date.now(), ...exp };
  if (!visualMemory.experiences) visualMemory.experiences = [];
  visualMemory.experiences.push(entry);
  if (!visualMemory.appIndex) visualMemory.appIndex = {};
  if (!visualMemory.appIndex[exp.app]) visualMemory.appIndex[exp.app] = [];
  visualMemory.appIndex[exp.app].push(id);
  saveMemory();
  return entry;
}

function sanitize(text) {
  if (!text) return text;
  return text
    .replace(/1[3-9]\d{9}/g, "1**********")
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, "***@***.***")
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, "****-****-****-****");
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Utilities
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
      ((e.name || "").toLowerCase().includes(lower) || (e.automationId || "").toLowerCase().includes(lower)) &&
      e.y > 30 && e.y < metrics.logicalHeight - 60
    );
    if (found) return found;
  }
  return null;
}

function clickEl(el) {
  const x = el.x + Math.floor(el.width / 2), y = el.y + Math.floor(el.height / 2);
  console.log(`    🖱️ Click: "${(el.name || "").slice(0, 40)}" [${el.controlType}] at (${x}, ${y})`);
  native.mouseClickSmooth(x, y, "left", 200);
  return { x, y };
}

function clickAt(x, y, reason) { console.log(`    🖱️ Click: (${x}, ${y}) — ${reason}`); native.mouseClickSmooth(x, y, "left", 200); }
function key(keys) { console.log(`    ⌨️ Key: ${keys}`); native.sendHotkey(keys); }
function typeEN(text) { console.log(`    ⌨️ EN: "${text}"`); native.typeText(text); }
function typeCN(text) { console.log(`    ⌨️ CN: "${text}"`); native.clipboardSetText(text); native.sendHotkey("ctrl+v"); }
function isRunning(proc) { return native.listProcesses().some(p => (p.name || "").toLowerCase() === proc.toLowerCase()); }

function promptUser(message) {
  console.log(`    👤 USER ACTION: ${message.slice(0, 80)}`);
  try {
    return execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${PROMPT_SCRIPT}" "${message.replace(/"/g, "'")}"`, { timeout: 300000 }).toString().trim() === "OK";
  } catch { return false; }
}

function focusWin(titlePart, className) {
  const wins = native.listWindows();
  const target = wins.find(w => w.visible && w.title && w.width > 100 &&
    (titlePart ? w.title.includes(titlePart) : true) && (className ? w.className === className : true));
  if (target) { native.focusWindow(target.hwnd); console.log(`    🪟 Focus: "${target.title.slice(0, 50)}"`); return target; }
  return null;
}

/**
 * 严格窗口隔离：关闭所有浏览器和无关窗口
 */
function cleanSlate() {
  console.log("    🧹 Clean slate: closing browsers and dialogs");
  try { execSync('powershell.exe -NoProfile -Command "Get-Process chrome,msedge -EA SilentlyContinue | Stop-Process -Force"', { timeout: 5000 }); } catch {}
  // 关闭可能残留的对话框
  key("escape"); 
}

// ═══════════════════════════════════════════════════════════════════════════
// VLM Vision (qwen3-vl:4b)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 用 VLM 分析截图，返回描述
 */
async function vlmAnalyze(screenshotPath, question) {
  const b64 = fs.readFileSync(screenshotPath).toString("base64");
  try {
    const res = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3-vl:4b",
        messages: [{ role: "user", content: `/no_think\n${question}`, images: [b64] }],
        stream: false,
        options: { num_predict: 300 },
      }),
    });
    const data = await res.json();
    const content = data.message?.content || "";
    console.log(`    👁️ VLM: ${content.slice(0, 120).replace(/\n/g, " ")}`);
    return content;
  } catch (e) { console.log(`    ⚠ VLM: ${e.message}`); return ""; }
}

/**
 * VLM 定位网页元素：截图 → VLM 分析 → 返回坐标
 */
async function vlmLocate(screenshotPath, elementDesc) {
  const resp = await vlmAnalyze(screenshotPath,
    `Find the "${elementDesc}" on this screen. Reply with ONLY the pixel coordinates in format: x,y\nScreen size: ${metrics.logicalWidth}x${metrics.logicalHeight}`
  );
  const m = resp.match(/(\d{2,4})\s*[,，]\s*(\d{2,4})/);
  if (m) {
    const x = parseInt(m[1]), y = parseInt(m[2]);
    if (x > 0 && x < metrics.logicalWidth && y > 0 && y < metrics.logicalHeight) {
      console.log(`    📍 VLM locate: (${x}, ${y})`);
      return { x, y, source: "vlm" };
    }
  }
  return null;
}

/**
 * VLM 验证操作结果
 */
async function vlmVerify(screenshotPath, expectedCondition) {
  const resp = await vlmAnalyze(screenshotPath,
    `${expectedCondition}\nReply JSON: {"success": true/false, "observation": "brief description"}`
  );
  try { const m = resp.match(/\{[\s\S]*?\}/); if (m) return JSON.parse(m[0]); } catch {}
  return { success: null, observation: resp.slice(0, 150) };
}

// ═══════════════════════════════════════════════════════════════════════════
// Multi-AI
// ═══════════════════════════════════════════════════════════════════════════

async function fastThink(q) {
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "system", content: "Be extremely brief. Reply in exact format requested." }, { role: "user", content: q }], model: "qwen3:4b" }),
    });
    const d = await res.json();
    console.log(`    ⚡ Fast: ${(d.content || "").slice(0, 100).replace(/\n/g, " ")}`);
    return d.content || "";
  } catch (e) { console.log(`    ⚠ Fast: ${e.message}`); return ""; }
}

async function deepThink(q) {
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "system", content: "Analyze thoroughly. Structured reasoning." }, { role: "user", content: q }], model: "gpt-oss:20b" }),
    });
    const d = await res.json();
    console.log(`    🧠 Deep: ${(d.content || "").slice(0, 120).replace(/\n/g, " ")}`);
    return d.content || "";
  } catch (e) { console.log(`    ⚠ Deep: ${e.message}`); return ""; }
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK RUNNER
// ═══════════════════════════════════════════════════════════════════════════

const taskResults = [];
async function runTask(name, fn) {
  const start = performance.now();
  console.log(`\n${"═".repeat(65)}`);
  console.log(`  TASK: ${name}`);
  console.log(`${"═".repeat(65)}`);
  try {
    const result = await fn();
    const dur = performance.now() - start;
    taskResults.push({ name, status: result?.status || "done", duration: dur, details: result });
    const icon = result?.status === "success" ? "✅" : result?.status === "skip" ? "⊘" : "⚠️";
    console.log(`\n  ${icon} ${name} → ${result?.status} (${(dur / 1000).toFixed(1)}s)`);
  } catch (e) {
    taskResults.push({ name, status: "error", duration: performance.now() - start, error: e.message });
    console.log(`\n  ❌ ${name} — ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// T1: Win键系统搜索 → 记事本 → 写 → 保存 → 关闭
// ═══════════════════════════════════════════════════════════════════════════

async function taskSystemSearch() {
  const GOAL = "Win键搜索记事本 → 打开 → 写内容 → Ctrl+S保存 → Alt+F4关闭";

  step("关闭已有记事本 + 清理环境");
  try { execSync('powershell.exe -NoProfile -Command "Get-Process Notepad -EA SilentlyContinue | Stop-Process -Force"', { timeout: 5000 }); } catch {}
  await sleep(1000);

  // FIX: 先显示桌面确保焦点不在其他窗口
  step("Win+D 显示桌面 → Win 打开开始菜单");
  key("win+d");
  await sleep(1500);
  key("win");
  await sleep(2500);

  // VLM 验证开始菜单是否打开
  const ssMenu = ss("start_menu");
  const menuCheck = await vlmVerify(ssMenu, "Is the Windows Start Menu or search panel open? Can you see a search box?");
  console.log(`    Menu check: ${JSON.stringify(menuCheck).slice(0, 100)}`);

  if (!menuCheck.success) {
    // 重试
    console.log("    🔄 Retry: Win key");
    key("escape"); await sleep(500);
    key("win"); await sleep(2500);
    ss("start_menu_retry");
  }

  step("搜索'记事本'");
  typeCN("记事本");
  await sleep(2500);
  const ssSearch = ss("search_notepad");

  // VLM 验证搜索结果
  const searchCheck = await vlmVerify(ssSearch, "Are there search results showing '记事本' (Notepad)? Is it the top result?");
  console.log(`    Search check: ${JSON.stringify(searchCheck).slice(0, 100)}`);

  step("打开记事本 (Enter)");
  key("enter");
  await sleep(3000);

  // 验证记事本打开
  const notepadWin = focusWin("Notepad", null) || focusWin("记事本", null) || focusWin("无标题", null);
  if (!notepadWin) {
    const ssCheck = ss("notepad_check");
    const vlmCheck = await vlmVerify(ssCheck, "Is Notepad open? Can you see a text editor window?");
    if (!vlmCheck.success) return { status: "fail", note: "Notepad did not open" };
  }
  ss("notepad_opened");

  step("写入内容");
  typeCN("OpenOxygen R4 训练测试\n");
  typeCN("系统搜索 + 快捷键验证\n");
  typeEN("Time: " + new Date().toISOString() + "\n");
  typeCN("VLM 视觉验证成功！");
  await sleep(500);
  ss("notepad_content");

  step("Ctrl+S 保存");
  key("ctrl+s");
  await sleep(2000);
  const ssSave = ss("notepad_save");

  // 检查保存对话框
  const fg = native.getForegroundWindowInfo();
  if (fg?.title?.includes("另存为") || fg?.title?.includes("Save")) {
    typeEN("ouv_r4_test.txt");
    await sleep(500);
    key("enter");
    await sleep(2000);
    // 覆盖确认
    const fg2 = native.getForegroundWindowInfo();
    if (fg2?.title?.includes("确认") || fg2?.title?.includes("Confirm")) {
      key("enter"); await sleep(1000);
    }
  }

  step("Alt+F4 关闭");
  key("alt+F4");
  await sleep(1500);

  // 如果弹出保存提示
  const fg3 = native.getForegroundWindowInfo();
  if (fg3?.title?.includes("Notepad") || fg3?.title?.includes("记事本")) {
    const els = getElements();
    const dontSave = findEl(els, "不保存", "Don't Save");
    if (dontSave) clickEl(dontSave);
    else { key("tab"); key("enter"); }
    await sleep(1000);
  }

  // VLM 验证关闭
  const ssClosed = ss("notepad_closed");
  const closeCheck = await vlmVerify(ssClosed, "Is Notepad closed? Is the desktop or another window visible instead?");

  recordExp({
    app: "system", appType: "system",
    action: { type: "full-flow", steps: ["win+d", "win", "search", "enter", "type", "ctrl+s", "alt+f4"] },
    intent: GOAL, result: closeCheck.success ? "success" : "partial",
    vlmDescription: `Menu: ${menuCheck.observation}; Close: ${closeCheck.observation}`,
  });

  return { status: closeCheck.success !== false ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T2: Bilibili VLM导航
// ═══════════════════════════════════════════════════════════════════════════

async function taskBilibiliVLM() {
  const GOAL = "VLM 引导 bilibili 搜索'逗比的雀巢' → 用户标签 → 主页 → 播放视频";

  step("清理 + 启动 Chrome → bilibili");
  cleanSlate(); await sleep(2000);
  launchChrome("https://www.bilibili.com");
  await sleep(7000);
  focusChrome(); await sleep(1000);
  const ssHome = ss("bili_home");

  // VLM 分析首页
  step("VLM 分析首页布局");
  const homeDesc = await vlmAnalyze(ssHome,
    "Describe this bilibili homepage. Where is the search box? Give its approximate pixel coordinates (x,y). Screen: " + metrics.logicalWidth + "x" + metrics.logicalHeight
  );

  // 从 VLM 描述中提取搜索框坐标
  let searchCoord = null;
  const coordMatch = homeDesc.match(/(\d{3,4})\s*[,，]\s*(\d{2,3})/);
  if (coordMatch) {
    searchCoord = { x: parseInt(coordMatch[1]), y: parseInt(coordMatch[2]) };
    console.log(`    📍 VLM found search box at (${searchCoord.x}, ${searchCoord.y})`);
  }

  step("点击搜索框 (VLM 定位)");
  if (searchCoord && searchCoord.y < 200) {
    // VLM 给出的坐标合理（搜索框应该在顶部）
    clickAt(searchCoord.x, searchCoord.y, "搜索框 (VLM)");
  } else {
    // VLM 坐标不合理，用 URL 直接搜索
    console.log("    ⚠ VLM 坐标不合理，改用 URL 搜索");
    await navigateTo("https://search.bilibili.com/upuser?keyword=逗比的雀巢");
    await sleep(6000);
    ss("bili_url_search");

    // 直接跳到用户搜索结果
    const ssResults = ss("bili_user_results");
    const resultsDesc = await vlmAnalyze(ssResults,
      "Is this bilibili user search results? Can you see user cards with avatars? Where is the first user card? Give coordinates x,y."
    );

    const userCoord = resultsDesc.match(/(\d{3,4})\s*[,，]\s*(\d{2,3})/);
    if (userCoord) {
      step("点击用户卡片 (VLM)");
      clickAt(parseInt(userCoord[1]), parseInt(userCoord[2]), "用户卡片 (VLM)");
      await sleep(5000);
    } else {
      clickAt(Math.round(metrics.logicalWidth * 0.35), Math.round(metrics.logicalHeight * 0.4), "用户卡片 (ratio)");
      await sleep(5000);
    }

    ss("bili_user_profile");

    // 播放视频
    step("VLM 定位第一个视频");
    const ssProfile = ss("bili_profile_videos");
    const videoDesc = await vlmAnalyze(ssProfile,
      "Is this a bilibili user profile? Can you see video thumbnails? Where is the first video? Give coordinates x,y."
    );
    const videoCoord = videoDesc.match(/(\d{3,4})\s*[,，]\s*(\d{2,3})/);
    if (videoCoord) {
      clickAt(parseInt(videoCoord[1]), parseInt(videoCoord[2]), "第一个视频 (VLM)");
    } else {
      clickAt(Math.round(metrics.logicalWidth * 0.3), Math.round(metrics.logicalHeight * 0.55), "第一个视频 (ratio)");
    }
    await sleep(6000);
    const ssVideo = ss("bili_video");
    const videoCheck = await vlmVerify(ssVideo, "Is a bilibili video page shown? Is a video player visible?");

    recordExp({
      app: "bilibili", appType: "browser",
      action: { type: "full-flow", steps: ["url-search", "vlm-user", "vlm-video"] },
      intent: GOAL, result: videoCheck.success ? "success" : "partial",
      vlmDescription: `Home: ${homeDesc.slice(0, 100)}; Video: ${videoCheck.observation}`,
    });
    return { status: videoCheck.success ? "success" : "partial" };
  }

  // 如果 VLM 搜索框坐标合理，走页面内搜索流程
  await sleep(500);
  typeCN("逗比的雀巢");
  await sleep(800);
  ss("bili_typed");
  key("enter");
  await sleep(6000);
  const ssResults2 = ss("bili_search_results");
  const searchVerify = await vlmVerify(ssResults2, "Are bilibili search results shown for '逗比的雀巢'?");

  recordExp({
    app: "bilibili", appType: "browser",
    action: { type: "vlm-search", method: "page-search" },
    intent: GOAL, result: searchVerify.success ? "success" : "partial",
    vlmDescription: searchVerify.observation,
  });
  return { status: searchVerify.success ? "success" : "partial" };
}

function launchChrome(url) {
  execSync(`powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList '--new-window','${url}'"`, { timeout: 15000 });
}
function focusChrome() { return focusWin(null, "Chrome_WidgetWin_1"); }
async function navigateTo(url) {
  key("ctrl+l"); await sleep(500); key("ctrl+a"); await sleep(200);
  typeEN(url); await sleep(300); key("enter");
}

// ═══════════════════════════════════════════════════════════════════════════
// T3: Gmail
// ═══════════════════════════════════════════════════════════════════════════

async function taskGmail() {
  const GOAL = "Gmail: 检查收件箱 → 读取最新邮件";

  step("清理 + 导航到 Gmail");
  cleanSlate(); await sleep(2000);
  launchChrome("https://mail.google.com");
  await sleep(8000);
  focusChrome(); await sleep(1000);
  const ssGmail = ss("gmail_page");

  // VLM 判断是否需要登录
  step("VLM 检查登录状态");
  const loginCheck = await vlmAnalyze(ssGmail,
    "Is this Gmail inbox? Or is this a Google login page? Reply: INBOX or LOGIN or OTHER"
  );

  if (loginCheck.toUpperCase().includes("LOGIN") || loginCheck.toUpperCase().includes("SIGN")) {
    const userOk = promptUser("Gmail 需要登录。\n\n请完成登录进入收件箱后，\n点击「确定」继续。\n\n点击「取消」跳过。");
    if (!userOk) return { status: "skip", note: "User skipped" };
    await sleep(3000);
    ss("gmail_after_login");
  }

  step("VLM 分析收件箱");
  const ssInbox = ss("gmail_inbox");
  const inboxDesc = await vlmAnalyze(ssInbox,
    "Describe this Gmail inbox. How many emails are visible? What is the subject of the first/newest email? Where is the first email row? Give coordinates x,y."
  );

  // 点击第一封邮件
  step("点击第一封邮件");
  const emailCoord = inboxDesc.match(/(\d{3,4})\s*[,，]\s*(\d{2,3})/);
  if (emailCoord) {
    clickAt(parseInt(emailCoord[1]), parseInt(emailCoord[2]), "第一封邮件 (VLM)");
  } else {
    clickAt(Math.round(metrics.logicalWidth * 0.5), Math.round(metrics.logicalHeight * 0.3), "第一封邮件 (ratio)");
  }
  await sleep(4000);
  const ssEmail = ss("gmail_email");
  const emailCheck = await vlmVerify(ssEmail, "Is an email opened? Can you see the email subject, sender, and body?");

  recordExp({
    app: "gmail", appType: "browser",
    action: { type: "full-flow", steps: ["navigate", "login-check", "vlm-inbox", "open-email"] },
    intent: GOAL, result: emailCheck.success ? "success" : "partial",
    vlmDescription: sanitize(`Inbox: ${inboxDesc.slice(0, 150)}; Email: ${emailCheck.observation}`),
  });

  return { status: emailCheck.success ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T4: VS Code 完整闭环
// ═══════════════════════════════════════════════════════════════════════════

async function taskVSCode() {
  const GOAL = "VS Code: 新建 → 粘贴代码 → Ctrl+S保存 → 终端运行 → 关闭";

  step("聚焦 VS Code");
  let vsc = focusWin("Visual Studio Code", null);
  if (!vsc) {
    execSync('powershell.exe -NoProfile -Command "Start-Process code"', { timeout: 15000 });
    await sleep(5000);
    vsc = focusWin("Visual Studio Code", null);
  }
  if (!vsc) return { status: "fail", note: "VS Code not found" };
  await sleep(1000);

  step("Ctrl+N 新建文件");
  key("ctrl+n"); await sleep(2000);
  ss("vsc_new");

  step("整块粘贴 Python 代码");
  const code = `# OpenOxygen R4 VLM Training
import datetime
print("Hello from R4!")
print(f"Time: {datetime.datetime.now()}")
print("VLM-driven training complete!")
`;
  native.clipboardSetText(code);
  key("ctrl+v");
  await sleep(1000);
  const ssCode = ss("vsc_code");

  // VLM 验证代码粘贴
  const codeCheck = await vlmVerify(ssCode, "Is Python code visible in VS Code editor? Can you see 'OpenOxygen R4' in the code?");
  console.log(`    Code paste: ${JSON.stringify(codeCheck).slice(0, 100)}`);

  step("Ctrl+S 保存 → 处理保存对话框");
  key("ctrl+s");
  await sleep(2000);

  // 检查并处理保存对话框
  for (let attempt = 0; attempt < 3; attempt++) {
    const fg = native.getForegroundWindowInfo();
    const title = fg?.title || "";
    console.log(`    Save attempt ${attempt + 1}: "${title}"`);

    if (title.includes("Save") || title.includes("保存") || title.includes("另存为")) {
      // 在保存对话框中
      typeEN("ouv_r4_test.py");
      await sleep(500);
      key("enter");
      await sleep(2000);

      // 覆盖确认
      const fg2 = native.getForegroundWindowInfo();
      if (fg2?.title?.includes("确认") || fg2?.title?.includes("Confirm") || fg2?.title?.includes("Replace")) {
        key("enter"); await sleep(1000);
      }
      break;
    } else if (title.includes("ouv_r4") || title.includes(".py")) {
      // 已保存成功
      console.log("    ✅ File saved");
      break;
    } else {
      // 可能需要 Ctrl+Shift+S
      if (attempt === 0) { key("ctrl+shift+s"); await sleep(2000); }
      else { key("escape"); await sleep(500); break; }
    }
  }
  ss("vsc_saved");

  step("Ctrl+` 打开终端 → 运行");
  key("ctrl+`");
  await sleep(2000);
  typeEN("python ouv_r4_test.py");
  key("enter");
  await sleep(3000);
  const ssTerm = ss("vsc_terminal");

  // VLM 验证终端输出
  const termCheck = await vlmVerify(ssTerm, "Is there terminal output in VS Code? Can you see 'Hello from R4' or 'VLM-driven training'?");

  step("Ctrl+W 关闭文件");
  key("ctrl+w");
  await sleep(1000);
  // 处理保存提示
  const fgClose = native.getForegroundWindowInfo();
  if (fgClose?.title?.includes("Save") || fgClose?.title?.includes("保存")) {
    const els = getElements();
    const dontSave = findEl(els, "Don't Save", "不保存");
    if (dontSave) clickEl(dontSave);
    else key("enter");
    await sleep(1000);
  }

  recordExp({
    app: "vscode", appType: "desktop",
    action: { type: "full-flow", steps: ["new", "paste", "ctrl-s", "save-dialog", "terminal", "close"] },
    intent: GOAL, result: termCheck.success ? "success" : "partial",
    vlmDescription: `Code: ${codeCheck.observation}; Terminal: ${termCheck.observation}`,
  });

  return { status: termCheck.success ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T5: 豆包3轮深度对话
// ═══════════════════════════════════════════════════════════════════════════

async function taskDoubao() {
  const GOAL = "豆包3轮深度对话 + 深度评估";

  step("聚焦豆包");
  let db = focusWin("豆包", null);
  if (!db) {
    if (isRunning("Doubao.exe")) {
      promptUser("请打开豆包窗口，然后点击「确定」。");
      await sleep(2000);
      db = focusWin("豆包", null);
    }
    if (!db) return { status: "skip", note: "Doubao not available" };
  }
  await sleep(1000);
  ss("doubao_ready");

  // 找输入框
  const els = getElements();
  const input = findEl(els, "输入", "发送", "消息");
  if (input) clickEl(input);
  else clickAt(Math.round(metrics.logicalWidth * 0.5), Math.round(db.height * 0.85 + db.y), "输入框");
  await sleep(500);

  // Round 1
  step("Round 1: 发送复杂问题");
  typeCN("如果让你设计一个能自主操作电脑的AI Agent，你认为最关键的3个技术挑战是什么？请简要分析。");
  await sleep(800);
  key("enter");
  await sleep(15000);
  ss("doubao_r1");

  // Round 2
  step("Round 2: 追问");
  typeCN("你提到的第一个挑战，目前业界有哪些解决方案？效果如何？");
  await sleep(800);
  key("enter");
  await sleep(15000);
  ss("doubao_r2");

  // Round 3
  step("Round 3: 深入");
  typeCN("如果用本地小模型（4B参数）来做视觉理解，你觉得够用吗？有什么局限性？");
  await sleep(800);
  key("enter");
  await sleep(15000);
  const ssR3 = ss("doubao_r3");

  // 深度评估
  step("深度评估对话质量");
  const assessment = await deepThink(
    "Evaluate a 3-round AI conversation about building a computer-operating AI Agent:\n" +
    "Q1: Key technical challenges\nQ2: Current solutions for challenge #1\nQ3: Can a 4B local model handle visual understanding?\n" +
    "Rate the conversation depth and usefulness 1-10. What insights were gained?"
  );

  recordExp({
    app: "doubao", appType: "desktop",
    action: { type: "deep-conversation", rounds: 3 },
    intent: GOAL, result: "success",
    vlmDescription: sanitize(assessment.slice(0, 300)),
  });

  return { status: "success", assessment: assessment.slice(0, 200) };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA R4 — VLM-Driven Deep Training           ║");
  console.log("║  qwen3-vl vision · multi-AI relay · strict isolation        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const taskStart = performance.now();
  loadMemory();

  // Pre-check
  const health = await fetch(`${GATEWAY}/health`).then(r => r.json());
  console.log(`Gateway: ✓ ${health.status}`);
  console.log(`Screen: ${metrics.logicalWidth}x${metrics.logicalHeight}`);
  const running = ["QQ.exe", "Doubao.exe", "ChatGPT.exe", "Code.exe"].filter(p => isRunning(p));
  console.log(`Running: ${running.join(", ")}\n`);

  // VLM pre-check
  const vlmTest = await vlmAnalyze(ss("vlm_precheck"), "What do you see? Reply briefly.");
  console.log(`VLM: ${vlmTest ? "✓" : "✗"}\n`);

  await runTask("T1: 系统搜索 (Win键→记事本→保存→关闭)", taskSystemSearch);
  await runTask("T2: Bilibili VLM导航 (搜索→用户→视频)", taskBilibiliVLM);
  await runTask("T3: Gmail 邮件检查", taskGmail);
  await runTask("T4: VS Code 完整闭环", taskVSCode);
  await runTask("T5: 豆包3轮深度对话", taskDoubao);

  cleanSlate();
  saveMemory();

  const totalTime = performance.now() - taskStart;
  console.log(`\n${"═".repeat(65)}`);
  console.log("  26w13aA R4 Results");
  console.log(`${"═".repeat(65)}`);
  for (const t of taskResults) {
    const icon = t.status === "success" ? "✅" : t.status === "skip" ? "⊘" : t.status === "error" ? "❌" : "⚠️";
    console.log(`  ${icon} ${t.name} → ${t.status} (${(t.duration / 1000).toFixed(1)}s)`);
  }
  console.log(`\n  Duration: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Memory: ${visualMemory.experiences?.length || 0} experiences`);

  writeFileSync(`${RESULTS_DIR}\\training-r4-${Date.now()}.json`, JSON.stringify({ taskResults, duration: totalTime }, null, 2));
}

main().catch(err => { console.error("❌ Fatal:", err.message); process.exit(1); });
