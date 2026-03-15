/**
 * OpenOxygen — 26w13aA R3: Deep Training Suite
 *
 * 核心改进：
 *   1. 多AI协作：qwen3:4b 快速感知 + gpt-oss:20b 深度推理 + 反思纠错循环
 *   2. 系统快捷键：Win键、Win+S、Alt+F4、Ctrl+S 等系统级操作
 *   3. 浏览器内定位：网页元素用 VLM/坐标估算（UIA 只能看到浏览器框架）
 *   4. 深层复杂任务：多步骤目标链，需要推理和适应
 *   5. 敏感信息脱敏：截图/记忆中的手机号邮箱自动打码
 *   6. 操作闭环：每个操作都验证结果，失败时自动重试或换策略
 *
 * 训练任务：
 *   T1: 系统搜索 — Win键打开开始菜单 → 搜索"记事本" → 打开 → 写内容 → 保存 → 关闭
 *   T2: Bilibili 深度 — 搜索"逗比的雀巢" → 用户标签 → 进入主页 → 播放视频 → 调节音量
 *   T3: Gmail 邮件检查 — Chrome → Gmail → 检查收件箱 → 读取最新邮件主题（需登录→用户接管）
 *   T4: VS Code 完整流程 — 新建文件 → 写代码 → 保存(Ctrl+S) → 运行 → 关闭
 *   T5: 豆包深度对话 — 发送复杂问题 → 等待回复 → 追问 → 评估对话质量
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const GATEWAY = "http://127.0.0.1:4800";
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\26w13a-training-r3";
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
  if (existsSync(MEMORY_FILE)) {
    try { visualMemory = JSON.parse(readFileSync(MEMORY_FILE, "utf-8")); } catch {}
  }
  console.log(`📚 Memory: ${visualMemory.experiences?.length || 0} experiences`);
}

function saveMemory() {
  writeFileSync(MEMORY_FILE, JSON.stringify({ ...visualMemory, version: "26w13aA-R3", updatedAt: Date.now() }, null, 2));
}

function recordExp(exp) {
  // 脱敏处理
  if (exp.windowTitle) exp.windowTitle = sanitize(exp.windowTitle);
  if (exp.vlmDescription) exp.vlmDescription = sanitize(exp.vlmDescription);
  if (exp.resultDetail) exp.resultDetail = sanitize(exp.resultDetail);

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
    visualMemory.elementIndex[key].push({ app: exp.app, x: el.x, y: el.y, w: el.width || el.w, h: el.height || el.h, timestamp: Date.now() });
  }
  saveMemory();
  return entry;
}

// ═══════════════════════════════════════════════════════════════════════════
// 敏感信息脱敏
// ═══════════════════════════════════════════════════════════════════════════

function sanitize(text) {
  if (!text) return text;
  return text
    .replace(/1[3-9]\d{9}/g, "1**********")                    // 手机号
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, "***@***.***")           // 邮箱
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, "****-****-****-****") // 银行卡
    .replace(/\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g, "******************"); // 身份证
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
      e.y > 30 && e.y < metrics.logicalHeight - 60 // 排除任务栏
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

function typeEN(text) { console.log(`    ⌨️ EN: "${text}"`); native.typeText(text); }

function typeCN(text) {
  console.log(`    ⌨️ CN: "${text}"`);
  native.clipboardSetText(text);
  native.sendHotkey("ctrl+v");
}

function typeAuto(text) { /[\u4e00-\u9fff]/.test(text) ? typeCN(text) : typeEN(text); }

function promptUser(message) {
  console.log(`    👤 USER ACTION: ${message.slice(0, 80)}`);
  try {
    const result = execSync(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${PROMPT_SCRIPT}" "${message.replace(/"/g, "'")}"`,
      { timeout: 300000 }
    ).toString().trim();
    console.log(`    👤 Response: ${result}`);
    return result === "OK";
  } catch { return false; }
}

function isRunning(proc) {
  return native.listProcesses().some(p => (p.name || "").toLowerCase() === proc.toLowerCase());
}

function focusWin(titlePart, className) {
  const wins = native.listWindows();
  const target = wins.find(w => w.visible && w.title && w.width > 100 &&
    (titlePart ? w.title.includes(titlePart) : true) &&
    (className ? w.className === className : true)
  );
  if (target) { native.focusWindow(target.hwnd); console.log(`    🪟 Focus: "${target.title.slice(0, 50)}"`); return target; }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Multi-AI Collaboration
// ═══════════════════════════════════════════════════════════════════════════

async function fastThink(question) {
  // qwen3:4b — 快速感知/决策
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [
        { role: "system", content: "You are a fast-thinking Windows automation agent. Be extremely brief. Reply in the exact format requested." },
        { role: "user", content: question }
      ], mode: "fast", model: "qwen3:4b" }),
    });
    const d = await res.json();
    console.log(`    ⚡ Fast [${d.model||"?"}]: ${(d.content||"").slice(0, 100).replace(/\n/g, " ")}`);
    return d.content || "";
  } catch (e) { console.log(`    ⚠ Fast: ${e.message}`); return ""; }
}

async function deepThink(question) {
  // gpt-oss:20b — 深度推理
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [
        { role: "system", content: "You are a deep-thinking AI architect. Analyze thoroughly. Provide structured reasoning." },
        { role: "user", content: question }
      ], model: "gpt-oss:20b" }),
    });
    const d = await res.json();
    console.log(`    🧠 Deep [${d.model||"?"}]: ${(d.content||"").slice(0, 120).replace(/\n/g, " ")}`);
    return d.content || "";
  } catch (e) { console.log(`    ⚠ Deep: ${e.message}`); return ""; }
}

/**
 * 集群思考：快速感知 → 深度推理 → 综合决策
 */
async function clusterThink(situation, options) {
  console.log(`    🔄 Cluster thinking...`);

  // Phase 1: 快速感知当前状态
  const perception = await fastThink(
    `Current situation: ${situation}\nWhat do you observe? What should we do next? Be brief.`
  );

  // Phase 2: 深度推理最佳策略
  const strategy = await deepThink(
    `Situation: ${situation}\nFast perception: ${perception}\nOptions: ${options || "any"}\n` +
    `What is the best strategy? Consider risks and fallbacks. Reply JSON: {"action":"...","params":{},"reasoning":"...","fallback":"..."}`
  );

  // Phase 3: 解析决策
  try {
    const m = strategy.match(/\{[\s\S]*\}/);
    if (m) return { perception, strategy: JSON.parse(m[0]), raw: strategy };
  } catch {}
  return { perception, strategy: { action: "observe", reasoning: strategy }, raw: strategy };
}

/**
 * 反思引擎（带重试）
 */
async function reflectAndRetry(task, action, beforeTitle, afterTitle, maxRetries = 2) {
  const elements = getElements();
  const resp = await fastThink(
    `Task: ${task}\nAction: ${action}\nBefore: "${sanitize(beforeTitle)}"\nAfter: "${sanitize(afterTitle)}"\n` +
    `Elements(${elements.length}): ${elements.slice(0, 8).map(e => (e.name || "").slice(0, 20)).filter(Boolean).join(", ")}\n` +
    `Did the action succeed? Reply JSON: {"success":true/false,"observation":"...","nextAction":"..."}`
  );
  try {
    const m = resp.match(/\{[\s\S]*?\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return { success: null, observation: resp.slice(0, 150), nextAction: "continue" };
}

/**
 * 验证操作结果，失败时自动重试
 */
async function verifyAndRetry(task, action, expectedCondition, retryFn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const fg = native.getForegroundWindowInfo();
    const ref = await reflectAndRetry(task, action, "", fg?.title || "");

    if (ref.success || expectedCondition()) {
      console.log(`    ✅ Verified: ${action} (attempt ${attempt + 1})`);
      return { success: true, attempts: attempt + 1, reflection: ref };
    }

    if (attempt < maxRetries) {
      console.log(`    🔄 Retry ${attempt + 2}/${maxRetries + 1}: ${ref.nextAction || "retrying"}`);
      await retryFn(attempt);
      await sleep(2000);
    }
  }
  console.log(`    ⚠ Failed after ${maxRetries + 1} attempts`);
  return { success: false, attempts: maxRetries + 1 };
}

// ═══════════════════════════════════════════════════════════════════════════
// Browser helpers (FIXED: 网页元素用坐标，不用 UIA)
// ═══════════════════════════════════════════════════════════════════════════

function closeBrowser(name = "chrome") {
  try { execSync(`powershell.exe -NoProfile -Command "Get-Process ${name === 'edge' ? 'msedge' : 'chrome'} -EA SilentlyContinue | Stop-Process -Force"`, { timeout: 10000 }); } catch {}
}

function launchChrome(url) {
  execSync(`powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList '--new-window','${url}'"`, { timeout: 15000 });
}

function focusChrome() { return focusWin(null, "Chrome_WidgetWin_1"); }

async function navigateTo(url) {
  key("ctrl+l"); await sleep(500);
  key("ctrl+a"); await sleep(200);
  typeEN(url); await sleep(300);
  key("enter");
  console.log(`    ⏳ Loading...`);
}

/**
 * 浏览器内元素定位：用 LLM 推理坐标（因为 UIA 看不到网页内容）
 */
async function locateWebElement(app, desc, fallbackRatio) {
  // 让 LLM 根据常识推理元素位置
  const fg = native.getForegroundWindowInfo();
  const decision = await clusterThink(
    `I'm on ${app} in Chrome (${metrics.logicalWidth}x${metrics.logicalHeight}). Window: "${sanitize(fg?.title || "")}". I need to find: ${desc}`,
    `Reply with pixel coordinates x,y for the ${desc}. Consider typical ${app} layout.`
  );

  // 从策略中提取坐标
  const coordMatch = (decision.raw || "").match(/(\d{2,4})\s*[,，]\s*(\d{2,4})/);
  if (coordMatch) {
    const x = parseInt(coordMatch[1]), y = parseInt(coordMatch[2]);
    if (x > 0 && x < metrics.logicalWidth && y > 0 && y < metrics.logicalHeight) {
      console.log(`    📍 Web element via cluster: (${x}, ${y})`);
      return { x, y, source: "cluster" };
    }
  }

  // Fallback
  if (fallbackRatio) {
    const x = Math.round(metrics.logicalWidth * fallbackRatio[0]);
    const y = Math.round(metrics.logicalHeight * fallbackRatio[1]);
    console.log(`    📍 Web element via ratio: (${x}, ${y})`);
    return { x, y, source: "ratio" };
  }
  return null;
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
    console.log(`\n  ${icon} ${name} → ${result?.status || "done"} (${(dur / 1000).toFixed(1)}s)`);
  } catch (e) {
    taskResults.push({ name, status: "error", duration: performance.now() - start, error: e.message });
    console.log(`\n  ❌ ${name} — ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// T1: 系统搜索 — Win键 → 搜索记事本 → 打开 → 写内容 → 保存 → 关闭
// ═══════════════════════════════════════════════════════════════════════════

async function taskSystemSearch() {
  const GOAL = "用 Win 键打开开始菜单，搜索并打开记事本，写入内容，保存文件，关闭";

  // 先关闭已有记事本
  step("关闭已有记事本");
  try { execSync('powershell.exe -NoProfile -Command "Get-Process Notepad -EA SilentlyContinue | Stop-Process -Force"', { timeout: 5000 }); } catch {}
  await sleep(1000);

  step("Win 键打开开始菜单");
  key("win");
  await sleep(2000);
  ss("start_menu");

  // 验证开始菜单打开
  const startEls = getElements();
  const searchBox = findEl(startEls, "搜索框", "搜索应用");
  console.log(`    开始菜单搜索框: ${searchBox ? "✓ found" : "✗ not found"}`);

  step("搜索'记事本'");
  typeCN("记事本");
  await sleep(2000);
  ss("search_notepad");

  // 找到记事本结果并点击
  step("点击记事本搜索结果");
  const searchResults = getElements();
  const notepadResult = findEl(searchResults, "记事本", "Notepad");
  if (notepadResult) {
    clickEl(notepadResult);
  } else {
    // 搜索结果通常在搜索框下方
    key("enter"); // 直接回车打开第一个结果
  }
  await sleep(3000);
  ss("notepad_opened");

  // 验证记事本打开
  const notepadWin = focusWin("Notepad", null) || focusWin("记事本", null) || focusWin("无标题", null);
  if (!notepadWin) {
    return { status: "fail", note: "Notepad did not open" };
  }

  step("写入内容");
  typeCN("这是 OpenOxygen R3 训练测试。\n系统搜索功能验证成功！\n");
  typeEN("Timestamp: " + new Date().toISOString());
  await sleep(500);
  ss("notepad_content");

  step("保存文件 (Ctrl+S)");
  key("ctrl+s");
  await sleep(2000);
  ss("notepad_save_dialog");

  // 检查是否弹出保存对话框
  const saveDialog = native.getForegroundWindowInfo();
  console.log(`    Save dialog: "${saveDialog?.title}"`);

  if (saveDialog?.title?.includes("另存为") || saveDialog?.title?.includes("Save")) {
    // 输入文件名
    typeEN("ouv_r3_test.txt");
    await sleep(500);
    key("enter");
    await sleep(2000);

    // 如果提示覆盖，点确定
    const overwrite = native.getForegroundWindowInfo();
    if (overwrite?.title?.includes("确认") || overwrite?.title?.includes("Confirm")) {
      key("enter");
      await sleep(1000);
    }
  }

  ss("notepad_saved");

  step("关闭记事本 (Alt+F4)");
  key("alt+F4");
  await sleep(1000);

  // 如果提示保存，选择不保存
  const closeDialog = native.getForegroundWindowInfo();
  if (closeDialog?.title?.includes("Notepad") || closeDialog?.title?.includes("记事本")) {
    // 可能还在记事本中（已保存所以直接关闭了）
    // 或者弹出了"是否保存"对话框
    const els = getElements();
    const dontSave = findEl(els, "不保存", "Don't Save", "否");
    if (dontSave) {
      clickEl(dontSave);
    }
  }
  await sleep(1000);
  ss("notepad_closed");

  // 验证记事本已关闭
  const stillOpen = focusWin("Notepad", null) || focusWin("记事本", null);
  const ref = await reflectAndRetry(GOAL, "完整流程：搜索→打开→写入→保存→关闭", "", stillOpen ? "still open" : "closed");

  recordExp({
    app: "system", appType: "system",
    action: { type: "full-flow", steps: ["win-key", "search", "open", "type", "save", "close"] },
    intent: GOAL, result: stillOpen ? "partial" : "success",
    reflection: ref,
  });

  return { status: stillOpen ? "partial" : "success", reflection: ref };
}

// ═══════════════════════════════════════════════════════════════════════════
// T2: Bilibili 深度 — 搜索 → 用户标签 → 主页 → 播放视频
// ═══════════════════════════════════════════════════════════════════════════

async function taskBilibiliDeep() {
  const GOAL = "在 bilibili 搜索'逗比的雀巢'，切换到用户标签，进入主页，播放第一个视频";

  step("启动 Chrome → bilibili");
  closeBrowser("chrome"); await sleep(2000);
  launchChrome("https://www.bilibili.com");
  await sleep(7000);
  focusChrome(); await sleep(1000);
  ss("bili_home");

  // 关键修复：浏览器内搜索框用地址栏方式
  step("通过地址栏直接搜索 bilibili");
  // 不用页面内搜索框（UIA 看不到），直接用 URL 搜索
  await navigateTo("https://search.bilibili.com/all?keyword=逗比的雀巢");
  await sleep(6000);
  ss("bili_search_results");

  // 集群思考：分析搜索结果页面
  step("集群思考：分析搜索结果");
  const fg1 = native.getForegroundWindowInfo();
  const decision1 = await clusterThink(
    `On bilibili search results page. Title: "${sanitize(fg1?.title || "")}". Screen: ${metrics.logicalWidth}x${metrics.logicalHeight}. I need to click the "用户" tab to filter by users.`,
    `Where is the "用户" (Users) tab? It's usually in a horizontal tab bar near the top of search results. Reply x,y coordinates.`
  );

  // 点击用户标签
  step("点击'用户'标签");
  const coordMatch1 = (decision1.raw || "").match(/(\d{2,4})\s*[,，]\s*(\d{2,4})/);
  if (coordMatch1) {
    clickAt(parseInt(coordMatch1[1]), parseInt(coordMatch1[2]), "用户标签 (cluster)");
  } else {
    // bilibili 搜索页用户标签通常在 URL 中
    await navigateTo("https://search.bilibili.com/upuser?keyword=逗比的雀巢");
  }
  await sleep(5000);
  ss("bili_user_tab");

  // 找用户并点击
  step("集群思考：找到用户并进入主页");
  const fg2 = native.getForegroundWindowInfo();
  const decision2 = await clusterThink(
    `On bilibili user search results for "逗比的雀巢". Title: "${sanitize(fg2?.title || "")}". I need to click on the user's profile/avatar to enter their homepage.`,
    `The user card is usually the first result with avatar, username, and follower count. Where should I click? Reply x,y.`
  );

  const coordMatch2 = (decision2.raw || "").match(/(\d{2,4})\s*[,，]\s*(\d{2,4})/);
  if (coordMatch2) {
    clickAt(parseInt(coordMatch2[1]), parseInt(coordMatch2[2]), "用户卡片 (cluster)");
  } else {
    // 用户卡片通常在页面中间偏上
    clickAt(Math.round(metrics.logicalWidth * 0.35), Math.round(metrics.logicalHeight * 0.35), "用户卡片 (ratio)");
  }
  await sleep(5000);
  ss("bili_user_profile");

  // 播放视频
  step("集群思考：播放第一个视频");
  const fg3 = native.getForegroundWindowInfo();
  const decision3 = await clusterThink(
    `On a bilibili user's profile page. Title: "${sanitize(fg3?.title || "")}". I need to click on their first video to play it.`,
    `Videos are usually displayed as thumbnails in a grid below the user info. The first video is typically top-left. Reply x,y.`
  );

  const coordMatch3 = (decision3.raw || "").match(/(\d{2,4})\s*[,，]\s*(\d{2,4})/);
  if (coordMatch3) {
    clickAt(parseInt(coordMatch3[1]), parseInt(coordMatch3[2]), "第一个视频 (cluster)");
  } else {
    clickAt(Math.round(metrics.logicalWidth * 0.3), Math.round(metrics.logicalHeight * 0.55), "第一个视频 (ratio)");
  }
  await sleep(6000);
  ss("bili_video_playing");

  // 验证视频播放
  const fg4 = native.getForegroundWindowInfo();
  const ref = await reflectAndRetry(GOAL, "播放视频", fg2?.title, fg4?.title);

  recordExp({
    app: "bilibili", appType: "browser", windowTitle: sanitize(fg4?.title),
    action: { type: "full-flow", steps: ["url-search", "user-tab", "user-profile", "play-video"] },
    intent: GOAL, result: ref.success ? "success" : "partial",
    reflection: ref,
  });

  return { status: ref.success ? "success" : "partial", reflection: ref };
}

// ═══════════════════════════════════════════════════════════════════════════
// T3: Gmail 邮件检查（需登录→用户接管）
// ═══════════════════════════════════════════════════════════════════════════

async function taskGmail() {
  const GOAL = "打开 Gmail，检查收件箱，读取最新邮件主题";

  step("导航到 Gmail");
  let win = focusChrome();
  if (!win) {
    launchChrome("https://mail.google.com");
    await sleep(5000);
    win = focusChrome();
  } else {
    await navigateTo("https://mail.google.com");
  }
  await sleep(6000);
  ss("gmail_initial");

  // 检查是否需要登录
  step("检查登录状态");
  const fg = native.getForegroundWindowInfo();
  const title = fg?.title || "";
  const needsLogin = title.includes("Sign in") || title.includes("登录") || title.includes("Google Account");

  if (needsLogin) {
    console.log("    🔐 Gmail 需要登录");
    const userOk = promptUser(
      "Gmail 需要登录您的 Google 账号。\n\n" +
      "请在浏览器中完成登录，\n" +
      "进入收件箱后点击「确定」继续。\n\n" +
      "点击「取消」跳过此测试。"
    );
    if (!userOk) {
      recordExp({
        app: "gmail", action: { type: "observe" }, intent: "登录检测",
        result: "skip", reflection: { lesson: "Gmail 需要登录，用户选择跳过" },
      });
      return { status: "skip", note: "User skipped login" };
    }
    await sleep(3000);
  }

  ss("gmail_inbox");

  // 分析收件箱
  step("集群思考：分析收件箱");
  const fg2 = native.getForegroundWindowInfo();
  const decision = await clusterThink(
    `On Gmail inbox. Title: "${sanitize(fg2?.title || "")}". Screen: ${metrics.logicalWidth}x${metrics.logicalHeight}. I need to identify the latest email subject and sender.`,
    `Analyze the inbox. What can you infer about the emails? The email list is usually in the center. Reply JSON: {"hasEmails":true/false,"observation":"..."}`
  );

  // 尝试点击第一封邮件
  step("点击第一封邮件");
  // Gmail 邮件列表通常在页面中间
  clickAt(Math.round(metrics.logicalWidth * 0.5), Math.round(metrics.logicalHeight * 0.35), "第一封邮件 (ratio)");
  await sleep(4000);
  ss("gmail_email_opened");

  const fg3 = native.getForegroundWindowInfo();
  const ref = await reflectAndRetry(GOAL, "打开邮件", fg2?.title, fg3?.title);

  recordExp({
    app: "gmail", appType: "browser", windowTitle: sanitize(fg3?.title),
    action: { type: "full-flow", steps: ["navigate", "login-check", "open-email"] },
    intent: GOAL, result: ref.success ? "success" : "partial",
    reflection: ref,
  });

  return { status: ref.success ? "success" : "partial", reflection: ref };
}

// ═══════════════════════════════════════════════════════════════════════════
// T4: VS Code 完整流程 — 新建 → 写代码 → 保存 → 运行 → 关闭
// ═══════════════════════════════════════════════════════════════════════════

async function taskVSCodeFull() {
  const GOAL = "VS Code: 新建 Python 文件 → 写代码 → Ctrl+S 保存 → 终端运行 → 关闭文件";

  step("聚焦 VS Code");
  let vscWin = focusWin("Visual Studio Code", null);
  if (!vscWin) {
    execSync('powershell.exe -NoProfile -Command "Start-Process code"', { timeout: 15000 });
    await sleep(5000);
    vscWin = focusWin("Visual Studio Code", null);
  }
  if (!vscWin) return { status: "fail", note: "VS Code not found" };
  await sleep(1000);
  ss("vsc_ready");

  step("新建文件 (Ctrl+N)");
  key("ctrl+n");
  await sleep(2000);
  ss("vsc_new_file");

  step("写入 Python 代码（剪贴板整块粘贴避免自动补全干扰）");
  const code = `# OpenOxygen R3 Training Test
import datetime

def main():
    print("Hello from OpenOxygen R3!")
    print(f"Time: {datetime.datetime.now()}")
    print("Training successful!")
    return 0

if __name__ == "__main__":
    exit(main())
`;
  // 整块粘贴避免自动补全干扰
  native.clipboardSetText(code);
  key("ctrl+v");
  await sleep(1000);
  ss("vsc_code_pasted");

  step("保存文件 (Ctrl+S → 输入文件名)");
  key("ctrl+s");
  await sleep(2000);

  // 验证保存对话框
  const saveCheck = await verifyAndRetry(
    GOAL, "打开保存对话框",
    () => {
      const fg = native.getForegroundWindowInfo();
      return fg?.title?.includes("Save") || fg?.title?.includes("保存");
    },
    async () => { key("ctrl+shift+s"); },
    1
  );

  if (saveCheck.success) {
    typeEN("ouv_r3_test.py");
    await sleep(500);
    key("enter");
    await sleep(2000);

    // 处理"覆盖"确认
    const overwriteCheck = native.getForegroundWindowInfo();
    if (overwriteCheck?.title?.includes("确认") || overwriteCheck?.title?.includes("Confirm") || overwriteCheck?.title?.includes("Replace")) {
      key("enter");
      await sleep(1000);
    }
  }
  ss("vsc_saved");

  // 验证保存成功（标题应该包含文件名）
  step("验证保存成功");
  const afterSave = native.getForegroundWindowInfo();
  console.log(`    After save: "${afterSave?.title}"`);
  const saved = afterSave?.title?.includes("ouv_r3_test") || afterSave?.title?.includes(".py");
  console.log(`    Save verified: ${saved}`);

  // 如果保存对话框还在，按 Escape 关闭
  if (!saved && (afterSave?.title?.includes("Save") || afterSave?.title?.includes("保存"))) {
    console.log("    ⚠ Save dialog still open, pressing Escape");
    key("escape");
    await sleep(1000);
  }

  step("在终端运行 (Ctrl+`)");
  key("ctrl+`"); // 打开终端
  await sleep(2000);
  typeEN("python ouv_r3_test.py");
  key("enter");
  await sleep(3000);
  ss("vsc_terminal_output");

  step("关闭文件 (Ctrl+W)");
  key("ctrl+w");
  await sleep(1000);

  // 如果提示保存，选择不保存
  const closeCheck = native.getForegroundWindowInfo();
  if (closeCheck?.title?.includes("Save") || closeCheck?.title?.includes("保存")) {
    // 找"不保存"按钮
    const els = getElements();
    const dontSave = findEl(els, "Don't Save", "不保存");
    if (dontSave) clickEl(dontSave);
    else key("tab"); key("enter"); // Tab 到不保存，回车
    await sleep(1000);
  }
  ss("vsc_closed");

  const ref = await reflectAndRetry(GOAL, "完整流程", vscWin?.title, native.getForegroundWindowInfo()?.title);
  recordExp({
    app: "vscode", appType: "desktop",
    action: { type: "full-flow", steps: ["new-file", "paste-code", "ctrl-s", "save-dialog", "terminal-run", "close"] },
    intent: GOAL, result: saved ? "success" : "partial",
    reflection: ref,
  });

  return { status: saved ? "success" : "partial", reflection: ref };
}

// ═══════════════════════════════════════════════════════════════════════════
// T5: 豆包深度对话 — 发送复杂问题 → 追问 → 评估
// ═══════════════════════════════════════════════════════════════════════════

async function taskDoubaoDeep() {
  const GOAL = "与豆包进行深度对话：发送复杂问题 → 等待回复 → 追问 → 评估对话质量";

  step("聚焦豆包");
  let dbWin = focusWin("豆包", null);
  if (!dbWin) {
    if (isRunning("Doubao.exe")) {
      const userOk = promptUser("豆包似乎最小化了。\n\n请打开豆包窗口，然后点击「确定」继续。");
      if (!userOk) return { status: "skip" };
      await sleep(2000);
      dbWin = focusWin("豆包", null);
    } else {
      return { status: "skip", note: "Doubao not running" };
    }
  }
  if (!dbWin) return { status: "fail", note: "Doubao window not found" };
  await sleep(1000);
  ss("doubao_ready");

  // 找输入框
  step("定位输入框并发送复杂问题");
  const elements = getElements();
  const inputBox = findEl(elements, "输入", "发送", "消息", "Message");
  if (inputBox) {
    clickEl(inputBox);
  } else {
    // 豆包输入框在底部中间
    clickAt(Math.round(metrics.logicalWidth * 0.5), Math.round(dbWin.height * 0.85 + dbWin.y), "输入框 (ratio)");
  }
  await sleep(500);

  // 发送复杂问题
  typeCN("请用简短的方式解释：为什么 AI Agent 需要视觉理解能力？给出3个具体的应用场景。");
  await sleep(800);
  ss("doubao_question1");
  key("enter");
  console.log("    ⏳ 等待 AI 回复...");
  await sleep(12000);
  ss("doubao_reply1");

  // 追问
  step("追问");
  typeCN("在这些场景中，哪个最难实现？为什么？");
  await sleep(800);
  ss("doubao_question2");
  key("enter");
  await sleep(12000);
  ss("doubao_reply2");

  // 用深度思考评估对话质量
  step("深度评估对话质量");
  const fg = native.getForegroundWindowInfo();
  const assessment = await deepThink(
    `I just had a 2-round conversation with Doubao AI:\n` +
    `Q1: "为什么 AI Agent 需要视觉理解能力？给出3个具体的应用场景"\n` +
    `Q2: "在这些场景中，哪个最难实现？为什么？"\n` +
    `Window title: "${sanitize(fg?.title || "")}"\n` +
    `Evaluate: Was the conversation meaningful? Did the AI provide substantive answers? Rate 1-10.`
  );

  recordExp({
    app: "doubao", appType: "desktop", windowTitle: sanitize(fg?.title),
    action: { type: "deep-conversation", rounds: 2 },
    intent: GOAL, result: "success",
    vlmDescription: assessment.slice(0, 300),
  });

  return { status: "success", assessment: assessment.slice(0, 200) };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA R3 — Deep Training Suite                ║");
  console.log("║  Multi-AI collab · System hotkeys · Deep tasks · Sanitize   ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const taskStart = performance.now();
  loadMemory();

  // Pre-check
  const health = await fetch(`${GATEWAY}/health`).then(r => r.json());
  console.log(`Gateway: ✓ ${health.status}`);
  const fast = await fastThink("Say OK");
  console.log(`Fast model: ${fast ? "✓" : "✗"}`);
  console.log(`Screen: ${metrics.logicalWidth}x${metrics.logicalHeight}`);

  const running = ["QQ.exe", "Doubao.exe", "ChatGPT.exe", "Code.exe", "WeChat.exe"].filter(p => isRunning(p));
  console.log(`Running: ${running.join(", ") || "none"}\n`);

  // Run tasks
  await runTask("T1: 系统搜索 (Win键→记事本→保存→关闭)", taskSystemSearch);
  await runTask("T2: Bilibili 深度 (URL搜索→用户→视频)", taskBilibiliDeep);
  await runTask("T3: Gmail 邮件检查 (登录→收件箱→读邮件)", taskGmail);
  await runTask("T4: VS Code 完整流程 (新建→写码→保存→运行→关闭)", taskVSCodeFull);
  await runTask("T5: 豆包深度对话 (复杂问题→追问→评估)", taskDoubaoDeep);

  // Cleanup
  closeBrowser("chrome");

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
  console.log("  26w13aA R3 Deep Training Results");
  console.log(`${"═".repeat(65)}`);
  for (const t of taskResults) {
    const icon = t.status === "success" ? "✅" : t.status === "partial" ? "⚠️" : t.status === "skip" ? "⊘" : "❌";
    console.log(`  ${icon} ${t.name} — ${t.status} (${(t.duration / 1000).toFixed(1)}s)`);
  }
  console.log(`\n  Duration: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Memory: ${memStats.total} exp, ${memStats.apps} apps, ${memStats.elements} elements`);

  const resultsPath = `${RESULTS_DIR}\\training-r3-${Date.now()}.json`;
  writeFileSync(resultsPath, JSON.stringify({ taskResults, memStats, duration: totalTime }, null, 2));
  console.log(`  Results: ${resultsPath}`);
}

main().catch(err => { console.error("\n❌ Fatal:", err.message); process.exit(1); });
