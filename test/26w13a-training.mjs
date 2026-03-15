/**
 * OpenOxygen — 26w13aA: Real Training Test Suite
 *
 * 真实目标驱动的训练测试，每个任务有明确目标，
 * 操作过程记录到 OUV 视觉记忆，失败时反思重试。
 *
 * 训练任务：
 *   T1: 打开 Chrome → 在 bilibili 搜索"逗比的雀巢" → 找到用户主页 → 播放第一个视频
 *   T2: 打开微信 → 识别联系人列表 → 记录界面布局
 *   T3: 打开 VS Code → 新建文件 → 输入代码 → 保存
 *   T4: 打开百度 → 搜索"OpenOxygen" → 点击第一个结果
 *   T5: 打开 Edge → 在知乎搜索"AI Agent" → 浏览第一个回答
 *
 * 每个任务：截图 → UIA + VLM 分析 → 操作 → 验证 → 记录经验 → 反思
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const GATEWAY = "http://127.0.0.1:4800";
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\26w13a-training";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";
const MEMORY_DIR = "D:\\Coding\\OpenOxygen\\.state\\ouv-training";
const MEMORY_FILE = `${MEMORY_DIR}\\visual-memory.json`;

for (const d of [SS_DIR, RESULTS_DIR, MEMORY_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Visual Memory Store (inline for self-contained test)
// ═══════════════════════════════════════════════════════════════════════════

let visualMemory = { experiences: [], appIndex: {}, elementIndex: {} };

function loadMemory() {
  if (existsSync(MEMORY_FILE)) {
    try {
      visualMemory = JSON.parse(readFileSync(MEMORY_FILE, "utf-8"));
      console.log(`📚 Loaded ${visualMemory.experiences?.length || 0} prior experiences`);
    } catch { console.log("📚 Starting fresh memory"); }
  }
}

function saveMemory() {
  writeFileSync(MEMORY_FILE, JSON.stringify({
    ...visualMemory,
    version: "26w13aA",
    updatedAt: Date.now(),
  }, null, 2));
}

function recordExperience(exp) {
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const entry = { id, timestamp: Date.now(), ...exp };
  if (!visualMemory.experiences) visualMemory.experiences = [];
  visualMemory.experiences.push(entry);

  // App index
  if (!visualMemory.appIndex) visualMemory.appIndex = {};
  if (!visualMemory.appIndex[exp.app]) visualMemory.appIndex[exp.app] = [];
  visualMemory.appIndex[exp.app].push(id);

  // Element index
  if (!visualMemory.elementIndex) visualMemory.elementIndex = {};
  for (const el of (exp.elements || [])) {
    const key = (el.name || el.type || "").toLowerCase().replace(/\s+/g, "");
    if (!key) continue;
    if (!visualMemory.elementIndex[key]) visualMemory.elementIndex[key] = [];
    visualMemory.elementIndex[key].push({
      app: exp.app, x: el.x, y: el.y, w: el.width, h: el.height,
      confidence: el.confidence || 1.0, timestamp: Date.now(),
    });
  }

  saveMemory();
  return entry;
}

function queryPriorPosition(app, elementName) {
  const key = (elementName || "").toLowerCase().replace(/\s+/g, "");
  const entries = (visualMemory.elementIndex?.[key] || [])
    .filter(e => !app || e.app === app)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);
  if (entries.length === 0) return null;
  let tw = 0, ax = 0, ay = 0;
  for (let i = 0; i < entries.length; i++) {
    const w = 1 / (i + 1);
    ax += entries[i].x * w; ay += entries[i].y * w; tw += w;
  }
  return { x: Math.round(ax / tw), y: Math.round(ay / tw), confidence: Math.min(entries.length / 3, 1), count: entries.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// Core utilities
// ═══════════════════════════════════════════════════════════════════════════

let stepCount = 0;
const metrics = native.getScreenMetrics();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function step(name) {
  stepCount++;
  console.log(`\n[Step ${stepCount}] ${name}`);
}

function ss(label) {
  const path = `${SS_DIR}\\step${String(stepCount).padStart(2, "0")}_${label.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_")}.png`;
  try {
    native.captureScreen(path);
    console.log(`    📸 ${label}`);
    return path;
  } catch (e) { console.log(`    ⚠ SS: ${e.message}`); return null; }
}

function getElements() {
  try {
    return native.getUiElements(null).filter(e => e.name && !e.isOffscreen && e.width > 0 && e.height > 0);
  } catch { return []; }
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

function type(text) { console.log(`    ⌨️ Type: "${text}"`); native.typeText(text); }
function key(keys) { console.log(`    ⌨️ Key: ${keys}`); native.sendHotkey(keys); }

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
 * 智能定位元素：UIA → 记忆 → LLM → 比例估算，四级 fallback
 */
async function smartLocate(app, elementDesc, uiaKeywords, ratioFallback) {
  // Level 1: UIA
  const elements = getElements();
  const uiaEl = findEl(elements, ...uiaKeywords);
  if (uiaEl) {
    // 验证位置合理性（不在屏幕边缘的导航栏）
    const centerY = uiaEl.y + uiaEl.height / 2;
    const isReasonable = centerY > 50 && centerY < metrics.logicalHeight - 50;
    if (isReasonable) {
      console.log(`    📍 Located via UIA: "${uiaEl.name}" at (${uiaEl.x}, ${uiaEl.y})`);
      return { x: uiaEl.x + uiaEl.width / 2, y: uiaEl.y + uiaEl.height / 2, source: "uia", element: uiaEl };
    } else {
      console.log(`    ⚠ UIA found "${uiaEl.name}" but position suspicious (y=${centerY}), trying other methods`);
    }
  }

  // Level 2: 记忆
  const prior = queryPriorPosition(app, elementDesc);
  if (prior && prior.confidence >= 0.5) {
    console.log(`    📍 Located via memory: (${prior.x}, ${prior.y}) confidence=${prior.confidence.toFixed(2)} (${prior.count} samples)`);
    return { x: prior.x, y: prior.y, source: "memory", confidence: prior.confidence };
  }

  // Level 3: LLM
  const topElements = elements.slice(0, 25).map(e =>
    `[${e.controlType}] "${(e.name || "").slice(0, 30)}" at (${e.x},${e.y}) ${e.width}x${e.height}`
  ).join("\n");
  const fg = native.getForegroundWindowInfo();

  const llmResp = await askLLM(
    "You are a UI element locator. Given UI elements and a target description, respond with ONLY coordinates: x,y",
    `Screen: ${metrics.logicalWidth}x${metrics.logicalHeight}\nWindow: "${fg?.title}"\nFind: ${elementDesc}\nElements:\n${topElements}`,
    "qwen3:4b"
  );
  const coordMatch = llmResp.match(/(\d+)\s*,\s*(\d+)/);
  if (coordMatch) {
    const x = parseInt(coordMatch[1]), y = parseInt(coordMatch[2]);
    console.log(`    📍 Located via LLM: (${x}, ${y})`);
    return { x, y, source: "llm" };
  }

  // Level 4: 比例估算
  if (ratioFallback) {
    const x = Math.round(metrics.logicalWidth * ratioFallback[0]);
    const y = Math.round(metrics.logicalHeight * ratioFallback[1]);
    console.log(`    📍 Located via ratio fallback: (${x}, ${y})`);
    return { x, y, source: "ratio" };
  }

  console.log("    ❌ Could not locate element");
  return null;
}

/**
 * 反思：操作后让 LLM 评估结果，记录教训
 */
async function reflect(taskDesc, actionDesc, beforeTitle, afterTitle, elements) {
  const resp = await askLLM(
    "You are a reflection engine. Evaluate if an action succeeded. Respond JSON: " +
    '{"success": true/false, "observation": "...", "lesson": "...", "suggestion": "..."}',
    `Task: ${taskDesc}\nAction: ${actionDesc}\nBefore: "${beforeTitle}"\nAfter: "${afterTitle}"\n` +
    `UI elements after (${elements.length}): ${elements.slice(0, 10).map(e => e.name).filter(Boolean).join(", ")}`,
    "qwen3:4b"
  );
  try {
    const m = resp.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return { success: null, observation: resp, lesson: "", suggestion: "" };
}

function closeBrowser(name = "chrome") {
  const proc = name === "edge" ? "msedge" : "chrome";
  try { execSync(`powershell.exe -NoProfile -Command "Get-Process ${proc} -EA SilentlyContinue | Stop-Process -Force"`, { timeout: 10000 }); } catch {}
}

function focusBrowser() {
  const wins = native.listWindows();
  const bw = wins.filter(w => w.visible && w.className === "Chrome_WidgetWin_1" && w.title && w.width > 200)
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));
  if (bw[0]) { native.focusWindow(bw[0].hwnd); return bw[0]; }
  return null;
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
    console.log(`\n  ✅ Task completed: ${name} (${(duration / 1000).toFixed(1)}s)`);
    return result;
  } catch (e) {
    const duration = performance.now() - start;
    taskResults.push({ name, status: "error", duration, error: e.message });
    console.log(`\n  ❌ Task error: ${name} — ${e.message}`);
    return null;
  }
}

// ─── T1: Bilibili 搜索并播放视频 ────────────────────────────────────────

async function taskBilibiliVideo() {
  const GOAL = "在 bilibili 搜索'逗比的雀巢'，找到用户主页，播放第一个视频";

  step("关闭已有浏览器，启动 Chrome");
  closeBrowser("chrome");
  await sleep(2000);
  execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://www.bilibili.com\'"', { timeout: 15000 });
  await sleep(6000);
  const win = focusBrowser();
  await sleep(1000);
  const ssHome = ss("bilibili_home");

  // 记录首页经验
  const homeElements = getElements();
  recordExperience({
    app: "bilibili", appType: "browser", pageUrl: "https://www.bilibili.com",
    windowTitle: win?.title,
    screenshotPath: ssHome,
    elements: homeElements.slice(0, 30).map(e => ({ name: e.name, type: e.controlType, x: e.x, y: e.y, width: e.width, height: e.height })),
    landmarks: [
      { name: "搜索框", relativePosition: "top-center-right", description: "页面顶部导航栏中偏右的搜索输入框" },
      { name: "导航栏", relativePosition: "top", description: "首页/番剧/直播等分类导航" },
    ],
    action: { type: "observe", target: "homepage" },
    intent: "观察 bilibili 首页布局",
    result: "success",
    resultDetail: `首页加载成功，检测到 ${homeElements.length} 个 UIA 元素`,
  });

  // 找搜索框
  step("定位 bilibili 搜索框");
  const searchLoc = await smartLocate("bilibili", "搜索框", ["nav-search-input", "请输入"], [0.53, 0.05]);
  if (!searchLoc) throw new Error("Cannot locate search box");

  clickAt(searchLoc.x, searchLoc.y, `搜索框 (via ${searchLoc.source})`);
  await sleep(800);

  // 记录搜索框位置经验
  recordExperience({
    app: "bilibili", appType: "browser",
    elements: [{ name: "搜索框", type: "input", x: searchLoc.x, y: searchLoc.y, width: 200, height: 30 }],
    action: { type: "click", target: "搜索框", x: searchLoc.x, y: searchLoc.y },
    intent: "点击搜索框准备输入",
    result: "success",
  });

  step("输入搜索词'逗比的雀巢'");
  key("ctrl+a");
  await sleep(200);
  type("逗比的雀巢");
  await sleep(500);
  ss("bilibili_search_typed");
  key("enter");
  console.log("    ⏳ 等待搜索结果...");
  await sleep(6000);
  ss("bilibili_search_results");

  // 反思搜索结果
  const afterSearch = native.getForegroundWindowInfo();
  const searchElements = getElements();
  const searchReflection = await reflect(
    GOAL, "搜索'逗比的雀巢'",
    win?.title, afterSearch?.title, searchElements
  );
  console.log(`    🔍 Reflection: ${JSON.stringify(searchReflection).slice(0, 150)}`);

  recordExperience({
    app: "bilibili", appType: "browser",
    windowTitle: afterSearch?.title,
    elements: searchElements.slice(0, 20).map(e => ({ name: e.name, type: e.controlType, x: e.x, y: e.y, width: e.width, height: e.height })),
    action: { type: "type", target: "搜索框", text: "逗比的雀巢" },
    intent: "搜索用户'逗比的雀巢'",
    result: searchReflection.success ? "success" : "partial",
    resultDetail: searchReflection.observation,
    reflection: searchReflection,
  });

  // 找"用户"标签
  step("点击'用户'标签筛选");
  const userTabLoc = await smartLocate("bilibili", "用户标签", ["用户"], [0.22, 0.17]);
  if (userTabLoc) {
    clickAt(userTabLoc.x, userTabLoc.y, `用户标签 (via ${userTabLoc.source})`);
    await sleep(4000);
    ss("bilibili_user_tab");
  }

  // 找用户卡片并点击
  step("找到'逗比的雀巢'用户并进入主页");
  const userElements = getElements();
  const userCard = findEl(userElements, "逗比的雀巢");
  if (userCard) {
    clickEl(userCard);
  } else {
    // LLM 辅助
    const advice = await askLLM(
      "You are a UI locator. Find the user profile link for '逗比的雀巢' in bilibili search results. Reply: x,y",
      `Screen ${metrics.logicalWidth}x${metrics.logicalHeight}. Elements: ${userElements.slice(0, 20).map(e => `"${(e.name || "").slice(0, 30)}" at(${e.x},${e.y})`).join("; ")}`,
      "qwen3:4b"
    );
    const m = advice.match(/(\d+)\s*,\s*(\d+)/);
    if (m) clickAt(parseInt(m[1]), parseInt(m[2]), "用户卡片 (LLM)");
  }
  await sleep(5000);
  ss("bilibili_user_profile");

  // 找视频列表并播放第一个
  step("播放第一个视频");
  const profileElements = getElements();
  const videoLinks = profileElements.filter(e =>
    (e.controlType === "Hyperlink" || e.controlType === "Link" || e.controlType === "ListItem") &&
    (e.name || "").length > 5 && e.y > 200 &&
    !(e.name || "").includes("搜索") && !(e.name || "").includes("首页")
  );

  console.log(`    找到 ${videoLinks.length} 个可能的视频链接`);
  for (const v of videoLinks.slice(0, 5)) {
    console.log(`      [${v.controlType}] "${(v.name || "").slice(0, 50)}" at (${v.x},${v.y})`);
  }

  if (videoLinks.length > 0) {
    clickEl(videoLinks[0]);
    await sleep(6000);
    ss("bilibili_video_playing");

    const videoFg = native.getForegroundWindowInfo();
    const videoReflection = await reflect(
      GOAL, "点击第一个视频",
      afterSearch?.title, videoFg?.title, getElements()
    );

    recordExperience({
      app: "bilibili", appType: "browser",
      windowTitle: videoFg?.title,
      action: { type: "click", target: "第一个视频" },
      intent: "播放第一个视频",
      result: videoReflection.success ? "success" : "partial",
      resultDetail: videoReflection.observation,
      reflection: videoReflection,
    });

    return { status: videoReflection.success ? "success" : "partial", reflection: videoReflection };
  } else {
    return { status: "partial", note: "No video links found" };
  }
}

// ─── T2: 微信界面探索 ──────────────────────────────────────────────────

async function taskWeChatExplore() {
  const GOAL = "打开微信，识别界面布局，记录联系人列表和聊天窗口位置";

  step("查找并聚焦微信窗口");
  const wins = native.listWindows();
  let wechatWin = wins.find(w => w.visible && w.title && (
    w.title.includes("微信") || w.title.includes("WeChat") || w.className === "WeChatMainWndForPC"
  ));

  if (!wechatWin) {
    console.log("    微信未运行，尝试启动...");
    // 搜索微信可执行文件
    try {
      execSync('powershell.exe -NoProfile -Command "Start-Process (Get-ChildItem \'C:\\Program Files*\\Tencent\\WeChat\\WeChat.exe\',\'C:\\Program Files*\\WeChat\\WeChat.exe\',\'D:\\Program Files*\\Tencent\\WeChat\\WeChat.exe\',\'D:\\Program Files*\\WeChat\\WeChat.exe\' -EA SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName)"', { timeout: 15000 });
    } catch {
      try {
        // 通过注册表查找
        const regPath = execSync('powershell.exe -NoProfile -Command "(Get-ItemProperty \'HKCU:\\Software\\Tencent\\WeChat\' -EA SilentlyContinue).InstallPath"', { timeout: 5000 }).toString().trim();
        if (regPath) {
          execSync(`powershell.exe -NoProfile -Command "Start-Process '${regPath}\\WeChat.exe'"`, { timeout: 15000 });
        }
      } catch {}
    }
    await sleep(8000);

    const wins2 = native.listWindows();
    wechatWin = wins2.find(w => w.visible && w.title && (
      w.title.includes("微信") || w.title.includes("WeChat") || w.className === "WeChatMainWndForPC"
    ));
  }

  if (!wechatWin) {
    // 最后尝试：列出所有窗口看看有没有类似的
    const allWins = native.listWindows().filter(w => w.visible && w.title);
    console.log("    所有可见窗口:");
    for (const w of allWins.slice(0, 15)) {
      console.log(`      "${w.title}" class=${w.className}`);
    }
    return { status: "fail", note: "WeChat window not found" };
  }

  native.focusWindow(wechatWin.hwnd);
  await sleep(1000);
  ss("wechat_main");

  step("分析微信界面布局");
  const elements = getElements();
  console.log(`    UIA 元素: ${elements.length}`);

  // 记录所有元素类型
  const typeCount = {};
  for (const e of elements) {
    typeCount[e.controlType] = (typeCount[e.controlType] || 0) + 1;
  }
  console.log(`    元素类型: ${JSON.stringify(typeCount)}`);

  // 找关键区域
  const chatList = findEl(elements, "聊天", "消息", "会话");
  const contacts = findEl(elements, "通讯录", "联系人", "Contacts");
  const searchBox = findEl(elements, "搜索", "Search");

  console.log(`    聊天列表: ${chatList ? `"${chatList.name}" at (${chatList.x},${chatList.y})` : "未找到"}`);
  console.log(`    通讯录: ${contacts ? `"${contacts.name}" at (${contacts.x},${contacts.y})` : "未找到"}`);
  console.log(`    搜索框: ${searchBox ? `"${searchBox.name}" at (${searchBox.x},${searchBox.y})` : "未找到"}`);

  // LLM 分析界面
  const layoutAnalysis = await askLLM(
    "You are analyzing a WeChat desktop interface. Describe the layout: where is the contact list, chat area, search box, toolbar. Be specific about positions.",
    `Window: "${wechatWin.title}" (${wechatWin.width}x${wechatWin.height})\nUI elements (${elements.length}):\n` +
    elements.slice(0, 30).map(e => `[${e.controlType}] "${(e.name || "").slice(0, 30)}" at (${e.x},${e.y}) ${e.width}x${e.height}`).join("\n"),
    "qwen3:4b"
  );

  recordExperience({
    app: "wechat", appType: "desktop",
    windowTitle: wechatWin.title,
    screenshotPath: `${SS_DIR}\\step${String(stepCount).padStart(2, "0")}_wechat_main.png`,
    elements: elements.slice(0, 40).map(e => ({ name: e.name, type: e.controlType, x: e.x, y: e.y, width: e.width, height: e.height })),
    landmarks: [
      chatList && { name: "聊天列表", relativePosition: "left", description: `at (${chatList.x},${chatList.y})` },
      contacts && { name: "通讯录", relativePosition: "left-bottom", description: `at (${contacts.x},${contacts.y})` },
      searchBox && { name: "搜索框", relativePosition: "top-left", description: `at (${searchBox.x},${searchBox.y})` },
    ].filter(Boolean),
    action: { type: "observe", target: "wechat layout" },
    intent: GOAL,
    result: "success",
    resultDetail: layoutAnalysis.slice(0, 200),
    vlmDescription: layoutAnalysis,
  });

  return { status: "success", elements: elements.length, layout: layoutAnalysis.slice(0, 300) };
}

// ─── T3: VS Code 新建文件并写代码 ──────────────────────────────────────

async function taskVSCodeNewFile() {
  const GOAL = "打开 VS Code，新建文件，输入一段 Python 代码，保存为 test_ouv.py";

  step("启动 VS Code");
  try {
    execSync('powershell.exe -NoProfile -Command "Start-Process code"', { timeout: 15000 });
  } catch {
    return { status: "fail", note: "VS Code not found" };
  }
  await sleep(5000);

  const wins = native.listWindows();
  const vscodeWin = wins.find(w => w.visible && w.title && w.title.includes("Visual Studio Code"));
  if (!vscodeWin) return { status: "fail", note: "VS Code window not found" };

  native.focusWindow(vscodeWin.hwnd);
  await sleep(1000);
  ss("vscode_opened");

  step("新建文件 (Ctrl+N)");
  key("ctrl+n");
  await sleep(2000);
  ss("vscode_new_file");

  step("输入 Python 代码");
  const code = `# OpenOxygen OUV Training Test
# Generated by 26w13aA training suite

def hello_ouv():
    """Test function for OUV visual memory training."""
    print("Hello from OpenOxygen!")
    print("OUV training successful!")
    return True

if __name__ == "__main__":
    result = hello_ouv()
    print(f"Result: {result}")
`;
  type(code);
  await sleep(1000);
  ss("vscode_code_typed");

  step("保存文件 (Ctrl+Shift+S)");
  key("ctrl+shift+s");
  await sleep(2000);
  ss("vscode_save_dialog");

  // 输入文件名
  type("test_ouv.py");
  await sleep(500);
  key("enter");
  await sleep(2000);
  ss("vscode_saved");

  const afterSave = native.getForegroundWindowInfo();
  const saveReflection = await reflect(
    GOAL, "保存文件为 test_ouv.py",
    vscodeWin.title, afterSave?.title, getElements()
  );

  recordExperience({
    app: "vscode", appType: "desktop",
    windowTitle: afterSave?.title,
    elements: getElements().slice(0, 20).map(e => ({ name: e.name, type: e.controlType, x: e.x, y: e.y, width: e.width, height: e.height })),
    landmarks: [
      { name: "编辑区", relativePosition: "center", description: "代码编辑主区域" },
      { name: "文件标签", relativePosition: "top", description: "打开文件的标签栏" },
    ],
    action: { type: "type", target: "editor", text: "Python code" },
    intent: GOAL,
    result: saveReflection.success ? "success" : "partial",
    resultDetail: saveReflection.observation,
    reflection: saveReflection,
  });

  // 关闭文件
  key("ctrl+w");
  await sleep(1000);

  return { status: saveReflection.success ? "success" : "partial", reflection: saveReflection };
}

// ─── T4: 百度搜索并点击结果 ────────────────────────────────────────────

async function taskBaiduSearch() {
  const GOAL = "在百度搜索'OpenOxygen AI Agent'，点击第一个搜索结果";

  step("导航到百度");
  // 复用已有 Chrome 或启动新的
  let win = focusBrowser();
  if (!win) {
    execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://www.baidu.com\'"', { timeout: 15000 });
    await sleep(5000);
    win = focusBrowser();
  } else {
    key("ctrl+l"); await sleep(500);
    key("ctrl+a"); await sleep(200);
    type("https://www.baidu.com"); await sleep(300);
    key("enter");
  }
  await sleep(4000);
  ss("baidu_home");

  step("定位百度搜索框");
  const searchLoc = await smartLocate("baidu", "百度搜索框", ["百度一下", "kw", "搜索"], [0.45, 0.42]);
  if (!searchLoc) throw new Error("Cannot locate Baidu search box");

  clickAt(searchLoc.x, searchLoc.y, `百度搜索框 (via ${searchLoc.source})`);
  await sleep(500);

  recordExperience({
    app: "baidu", appType: "browser",
    elements: [{ name: "搜索框", type: "input", x: searchLoc.x, y: searchLoc.y, width: 400, height: 30 }],
    action: { type: "click", target: "搜索框", x: searchLoc.x, y: searchLoc.y },
    intent: "点击百度搜索框",
    result: "success",
  });

  step("输入搜索词并搜索");
  key("ctrl+a"); await sleep(200);
  type("OpenOxygen AI Agent"); await sleep(500);
  ss("baidu_typed");
  key("enter");
  await sleep(5000);
  ss("baidu_results");

  step("点击第一个搜索结果");
  const resultElements = getElements();
  const resultLinks = resultElements.filter(e =>
    (e.controlType === "Hyperlink" || e.controlType === "Link") &&
    (e.name || "").length > 10 && e.y > 200
  );

  console.log(`    找到 ${resultLinks.length} 个结果链接`);
  if (resultLinks.length > 0) {
    clickEl(resultLinks[0]);
    await sleep(5000);
    ss("baidu_first_result");

    const afterClick = native.getForegroundWindowInfo();
    const clickReflection = await reflect(
      GOAL, "点击第一个搜索结果",
      "百度搜索结果", afterClick?.title, getElements()
    );

    recordExperience({
      app: "baidu", appType: "browser",
      windowTitle: afterClick?.title,
      action: { type: "click", target: "第一个搜索结果" },
      intent: "点击第一个搜索结果",
      result: clickReflection.success ? "success" : "partial",
      reflection: clickReflection,
    });

    return { status: clickReflection.success ? "success" : "partial" };
  }

  return { status: "partial", note: "No result links found" };
}

// ─── T5: Edge 知乎搜索 ─────────────────────────────────────────────────

async function taskZhihuSearch() {
  const GOAL = "在 Edge 浏览器打开知乎，搜索'AI Agent 框架'，浏览第一个回答";

  step("关闭 Chrome，启动 Edge");
  closeBrowser("chrome");
  await sleep(2000);
  execSync('powershell.exe -NoProfile -Command "Start-Process msedge.exe -ArgumentList \'--new-window\',\'https://www.zhihu.com\'"', { timeout: 15000 });
  await sleep(6000);
  const win = focusBrowser();
  await sleep(1000);
  ss("zhihu_home");

  step("定位知乎搜索框");
  const searchLoc = await smartLocate("zhihu", "知乎搜索框", ["搜索", "Search", "搜你想搜的"], [0.45, 0.05]);
  if (!searchLoc) {
    // 知乎可能需要登录，记录这个经验
    recordExperience({
      app: "zhihu", appType: "browser",
      action: { type: "observe" },
      intent: "定位搜索框",
      result: "fail",
      resultDetail: "搜索框未找到，可能需要登录",
      reflection: { lesson: "知乎可能需要登录才能使用搜索功能" },
    });
    return { status: "partial", note: "Search box not found, may need login" };
  }

  clickAt(searchLoc.x, searchLoc.y, `知乎搜索框 (via ${searchLoc.source})`);
  await sleep(500);
  type("AI Agent 框架");
  await sleep(500);
  ss("zhihu_search_typed");
  key("enter");
  await sleep(5000);
  ss("zhihu_results");

  // 尝试点击第一个结果
  const resultElements = getElements();
  const answerLinks = resultElements.filter(e =>
    (e.controlType === "Hyperlink" || e.controlType === "Link") &&
    (e.name || "").length > 10 && e.y > 200
  );

  if (answerLinks.length > 0) {
    clickEl(answerLinks[0]);
    await sleep(5000);
    ss("zhihu_answer");

    recordExperience({
      app: "zhihu", appType: "browser",
      action: { type: "click", target: "第一个回答" },
      intent: "浏览第一个回答",
      result: "success",
    });

    return { status: "success" };
  }

  return { status: "partial", note: "No answer links found" };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA — Real Training Test Suite              ║");
  console.log("║  Goal-driven tasks with OUV visual memory training          ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const taskStart = performance.now();
  loadMemory();

  // Pre-check
  const health = await fetch(`${GATEWAY}/health`).then(r => r.json());
  console.log(`Gateway: ✓ ${health.status}`);
  const llm = await askLLM("Test", "Say OK", "qwen3:4b");
  console.log(`LLM: ${llm ? "✓" : "✗"}`);
  console.log(`Screen: ${metrics.logicalWidth}x${metrics.logicalHeight}`);
  console.log(`Memory: ${visualMemory.experiences?.length || 0} prior experiences\n`);

  // Run tasks
  await runTask("T1: Bilibili 搜索并播放视频", taskBilibiliVideo);
  await runTask("T2: 微信界面探索", taskWeChatExplore);
  await runTask("T3: VS Code 新建文件并写代码", taskVSCodeNewFile);
  await runTask("T4: 百度搜索并点击结果", taskBaiduSearch);
  await runTask("T5: Edge 知乎搜索", taskZhihuSearch);

  // Cleanup
  closeBrowser("chrome");
  closeBrowser("edge");

  // Final memory stats
  saveMemory();
  const memStats = {
    totalExperiences: visualMemory.experiences?.length || 0,
    apps: Object.keys(visualMemory.appIndex || {}).length,
    elements: Object.keys(visualMemory.elementIndex || {}).length,
  };

  // Results
  const totalTime = performance.now() - taskStart;
  console.log(`\n${"═".repeat(65)}`);
  console.log("  26w13aA Training Results");
  console.log(`${"═".repeat(65)}`);
  for (const t of taskResults) {
    const icon = t.status === "success" ? "✅" : t.status === "partial" ? "⚠️" : t.status === "error" ? "❌" : "📋";
    console.log(`  ${icon} ${t.name} — ${t.status} (${(t.duration / 1000).toFixed(1)}s)`);
  }
  console.log(`\n  Duration: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Visual Memory: ${memStats.totalExperiences} experiences, ${memStats.apps} apps, ${memStats.elements} element types`);
  console.log(`  Memory file: ${MEMORY_FILE}`);

  const resultsPath = `${RESULTS_DIR}\\training-${Date.now()}.json`;
  writeFileSync(resultsPath, JSON.stringify({ taskResults, memStats, duration: totalTime }, null, 2));
  console.log(`  Results: ${resultsPath}`);
}

main().catch(err => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
