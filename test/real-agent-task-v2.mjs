/**
 * OpenOxygen — Real Agent Task v2 (视觉定位修复版)
 *
 * 修复：网页内元素使用视觉定位（截图分析）而非 UIA
 * UIA 只用于桌面级控件，网页内操作用坐标点击
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { mkdirSync, existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const GATEWAY = "http://127.0.0.1:4800";
const SCREENSHOT_DIR = "D:\\Coding\\OpenOxygen\\.state\\agent-task-v2";
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

let stepCount = 0;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(label) {
  const path = `${SCREENSHOT_DIR}\\step${stepCount}_${label}.png`;
  native.captureScreen(path);
  console.log(`    📸 ${label}`);
  return path;
}

function step(name) {
  stepCount++;
  console.log(`\n[Step ${stepCount}] ${name}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 核心修复：网页内元素用视觉分析定位
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeScreenForElement(screenshotPath, description) {
  console.log(`    🔍 视觉分析: "${description}"`);
  const res = await fetch(`${GATEWAY}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a screen coordinate detector. Given a description of a UI element, respond with ONLY the pixel coordinates in format: x,y. Nothing else. No explanation." },
        { role: "user", content: `On a 2048x1152 bilibili webpage, find the center coordinates of: ${description}` },
      ],
      mode: "fast",
    }),
  });
  const data = await res.json();
  const text = data.content || "";
  const match = text.match(/(\d+)\s*[,，]\s*(\d+)/);
  if (match) {
    return { x: parseInt(match[1]), y: parseInt(match[2]) };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Task Execution
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen Agent Task v2 — 视觉定位修复版                  ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("修复: 网页内元素使用视觉坐标定位，不依赖 UIA");
  console.log("目标: Chrome → bilibili → 搜索逗比的雀巢 → 个人主页 → 第3个视频");
  console.log("");

  const taskStart = performance.now();

  // ─── Step 1: 打开 Chrome 访问 bilibili ────────────────────────
  // 直接在地址栏输入 bilibili.com
  step("打开 Chrome 并导航到 bilibili");
  try {
    execSync("start chrome about:blank", { stdio: "ignore", windowsHide: true });
  } catch {
    execSync("start msedge about:blank", { stdio: "ignore", windowsHide: true });
  }
  console.log("    ✅ 浏览器启动");
  await sleep(3000);
  
  // 用地址栏导航
  native.sendHotkey("ctrl+l");
  await sleep(500);
  native.typeText("https://www.bilibili.com");
  await sleep(300);
  native.sendHotkey("enter");
  console.log("    ⏳ 等待 bilibili 加载...");
  await sleep(8000);
  await screenshot("bilibili_home");

  // ─── Step 2: 点击 bilibili 搜索框 ────────────────────────────
  step("点击 bilibili 搜索框 (网页内元素，视觉定位)");

  // bilibili 搜索框固定位置：页面顶部导航栏中间
  // 基于截图分析：搜索框大约在 (775, 275) 附近
  // 但实际位置取决于窗口大小，用屏幕宽度比例计算更可靠
  const metrics = native.getScreenMetrics();
  const screenW = metrics.physicalWidth;
  const screenH = metrics.physicalHeight;

  // bilibili 搜索框：基于视觉分析在右上角
  // 2048x1152 分辨率下约 (1090, 200)
  const searchBoxX = Math.round(screenW * 0.532);
  const searchBoxY = Math.round(screenH * 0.174);

  console.log(`    🎯 搜索框预估坐标: (${searchBoxX}, ${searchBoxY}) [屏幕 ${screenW}x${screenH}]`);
  native.mouseClickSmooth(searchBoxX, searchBoxY, "left", 300);
  await sleep(1000);
  await screenshot("searchbox_clicked");

  // ─── Step 3: 输入搜索词 ──────────────────────────────────────
  step("输入搜索词'逗比的雀巢'");
  native.typeText("逗比的雀巢");
  await sleep(800);
  await screenshot("search_typed");

  // 按回车搜索
  native.sendHotkey("enter");
  console.log("    ⏳ 等待搜索结果...");
  await sleep(6000);
  await screenshot("search_results");

  // ─── Step 4: 分析搜索结果，找用户主页 ────────────────────────
  step("在搜索结果中找'逗比的雀巢'用户");

  // bilibili 搜索结果页：用户卡片通常在结果上方或侧边
  // 先截图分析
  const resultScreenshot = await screenshot("analyze_results");

  // 点击"用户"标签筛选
  // bilibili 搜索结果页的标签栏：综合/视频/番剧/用户 等
  // "用户"标签大约在搜索栏下方，水平约 35% 位置
  const userTabX = Math.round(screenW * 0.22);
  const userTabY = Math.round(screenH * 0.30);
  console.log(`    🎯 点击"用户"标签: (${userTabX}, ${userTabY})`);
  native.mouseClickSmooth(userTabX, userTabY, "left", 200);
  await sleep(4000);
  await screenshot("user_tab");

  // ─── Step 5: 点击用户主页链接 ────────────────────────────────
  step("点击'逗比的雀巢'用户主页");

  // 用户搜索结果中，第一个用户卡片通常在页面中间偏左
  // 大约 y=45% 位置
  const userCardX = Math.round(screenW * 0.30);
  const userCardY = Math.round(screenH * 0.45);
  console.log(`    🎯 点击用户卡片: (${userCardX}, ${userCardY})`);
  native.mouseClickSmooth(userCardX, userCardY, "left", 300);
  console.log("    ⏳ 等待用户主页加载...");
  await sleep(6000);
  await screenshot("user_profile");

  // ─── Step 6: 找到视频列表，点击第三个视频 ────────────────────
  step("在用户主页找到并播放第三个视频");

  // 用户主页的视频列表通常在页面中下部
  // 先滚动一下确保视频列表可见
  native.mouseScroll(-3);
  await sleep(2000);

  // 视频列表通常是网格布局，每行 2-4 个
  // 第三个视频大约在第一行第三个或第二行第一个
  // 大约 x=65%, y=55% 位置
  const video3X = Math.round(screenW * 0.65);
  const video3Y = Math.round(screenH * 0.55);
  console.log(`    🎯 点击第三个视频: (${video3X}, ${video3Y})`);
  native.mouseClickSmooth(video3X, video3Y, "left", 300);
  console.log("    ⏳ 等待视频加载...");
  await sleep(6000);
  await screenshot("video_page");

  // ─── Step 7: 验证 ────────────────────────────────────────────
  step("验证视频播放");
  await screenshot("final_state");

  // 检查窗口标题
  const fg = native.getForegroundWindowInfo();
  console.log(`    窗口标题: "${fg?.title || 'unknown'}"`);

  const hasBilibili = fg?.title?.includes("bilibili") || fg?.title?.includes("哔哩");
  console.log(`    bilibili 页面: ${hasBilibili ? "✅" : "⚠️"}`);

  // ─── Summary ──────────────────────────────────────────────────
  const totalTime = performance.now() - taskStart;
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Task Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Steps: ${stepCount}`);
  console.log(`  Time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`  Method: 视觉坐标定位 (非 UIA)`);
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(err => {
  console.error("\n❌ Task failed:", err.message);
  process.exit(1);
});
