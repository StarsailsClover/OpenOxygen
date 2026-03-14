/**
 * OpenOxygen — Real Agent Task Test
 *
 * 任务：打开Chrome → 搜索哔哩哔哩 → 进入bilibili → 搜索"逗比的雀巢"
 *       → 打开个人主页 → 播放列表第三个视频
 *
 * 使用：OUV 视觉理解 + qwen3:4b 推理 + Native 输入
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const NATIVE_PATH = "D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js";
const GATEWAY = "http://127.0.0.1:4800";
const SCREENSHOT_DIR = "D:\\Coding\\OpenOxygen\\.state\\agent-task";

if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

let native;
try {
  native = require(NATIVE_PATH);
} catch (e) {
  console.error("Native module not available:", e.message);
  process.exit(1);
}

let stepCount = 0;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(label) {
  const path = `${SCREENSHOT_DIR}\\step${stepCount}_${label}.png`;
  const result = native.captureScreen(path);
  console.log(`    📸 Screenshot: ${label} (${result.durationMs?.toFixed(0)}ms)`);
  return path;
}

async function askLLM(question) {
  const start = performance.now();
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
}

function getUIElements() {
  const elements = native.getUiElements(null);
  return elements.filter(e => e.name && !e.isOffscreen && e.width > 0 && e.height > 0);
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

function step(name) {
  stepCount++;
  console.log(`\n[Step ${stepCount}] ${name}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Task Execution
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen Real Agent Task — 打开Chrome搜索并播放B站视频   ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("Target: 打开Chrome → 搜索哔哩哔哩 → 搜索逗比的雀巢 → 播放第3个视频");
  console.log("");

  const taskStart = performance.now();

  // ─── Step 1: 打开 Chrome ──────────────────────────────────────
  step("打开 Chrome");
  try {
    execSync("start chrome about:blank", { stdio: "ignore", windowsHide: true });
    console.log("    ✅ Chrome 启动命令已发送");
  } catch {
    try {
      execSync("start msedge about:blank", { stdio: "ignore", windowsHide: true });
      console.log("    ✅ Edge 启动命令已发送 (Chrome不可用)");
    } catch {
      console.log("    ❌ 无法启动浏览器");
      process.exit(1);
    }
  }
  await sleep(3000);
  await screenshot("chrome_opened");

  // ─── Step 2: 导航到搜索引擎搜索哔哩哔哩 ──────────────────────
  step("在地址栏输入搜索哔哩哔哩");
  
  // 聚焦地址栏
  pressKey("ctrl+l");
  await sleep(500);
  
  // 输入搜索
  typeText("bilibili.com");
  await sleep(300);
  pressKey("enter");
  
  console.log("    ⏳ 等待页面加载...");
  await sleep(5000);
  await screenshot("bilibili_loaded");

  // ─── Step 3: 检测 bilibili 是否加载 ──────────────────────────
  step("检测 bilibili 页面");
  
  let elements = getUIElements();
  const biliElements = elements.filter(e =>
    e.name.toLowerCase().includes("bilibili") ||
    e.name.includes("哔哩") ||
    e.name.includes("b站")
  );
  console.log(`    UI 元素总数: ${elements.length}`);
  console.log(`    B站相关元素: ${biliElements.length}`);
  for (const e of biliElements.slice(0, 5)) {
    console.log(`      [${e.controlType}] "${e.name.slice(0, 60)}"`);
  }

  // ─── Step 4: 在 bilibili 搜索"逗比的雀巢" ────────────────────
  step("在 bilibili 搜索'逗比的雀巢'");
  
  // 找搜索框
  elements = getUIElements();
  let searchBox = findElement(elements, "搜索", "search", "nav-search-input", "请输入");
  
  if (searchBox) {
    clickElement(searchBox);
    await sleep(500);
  } else {
    // 尝试用快捷键或点击页面顶部搜索区域
    console.log("    ⚠️ 未找到搜索框，尝试点击页面顶部...");
    native.mouseClickSmooth(600, 55, "left", 200);
    await sleep(500);
  }
  
  // 清空并输入
  pressKey("ctrl+a");
  await sleep(200);
  typeText("逗比的雀巢");
  await sleep(500);
  await screenshot("search_typed");
  
  // 按回车搜索
  pressKey("enter");
  console.log("    ⏳ 等待搜索结果...");
  await sleep(5000);
  await screenshot("search_results");

  // ─── Step 5: 查找并点击用户主页 ──────────────────────────────
  step("查找'逗比的雀巢'用户主页");
  
  elements = getUIElements();
  const userElements = elements.filter(e =>
    e.name.includes("逗比的雀巢") ||
    e.name.includes("个人主页") ||
    e.name.includes("UP主")
  );
  console.log(`    搜索结果中找到 ${userElements.length} 个相关元素`);
  for (const e of userElements.slice(0, 5)) {
    console.log(`      [${e.controlType}] "${e.name.slice(0, 80)}" at (${e.x},${e.y})`);
  }

  // 尝试点击用户链接
  const userLink = userElements.find(e =>
    e.controlType === "Hyperlink" || e.controlType === "Text" || e.controlType === "Link"
  ) || userElements[0];

  if (userLink) {
    clickElement(userLink);
    console.log("    ⏳ 等待用户主页加载...");
    await sleep(5000);
  } else {
    // 用 LLM 分析屏幕
    console.log("    ⚠️ 未找到用户链接，请求 LLM 分析...");
    const screenshotPath = await screenshot("need_llm_help");
    const advice = await askLLM(
      `I'm on bilibili search results page for "逗比的雀巢". I need to click on the user profile link. ` +
      `Available UI elements: ${elements.slice(0, 20).map(e => `[${e.controlType}]"${e.name.slice(0,30)}" at(${e.x},${e.y})`).join("; ")}. ` +
      `Which element should I click? Reply with just the coordinates (x,y).`
    );
    
    // 尝试解析坐标
    const coordMatch = advice.match(/\((\d+)\s*,\s*(\d+)\)/);
    if (coordMatch) {
      const cx = parseInt(coordMatch[1]);
      const cy = parseInt(coordMatch[2]);
      console.log(`    🤖 LLM suggests clicking (${cx}, ${cy})`);
      native.mouseClickSmooth(cx, cy, "left", 300);
      await sleep(5000);
    }
  }
  await screenshot("user_profile");

  // ─── Step 6: 找到视频列表并播放第三个视频 ────────────────────
  step("播放列表第三个视频");
  
  elements = getUIElements();
  
  // 查找视频列表项
  const videoElements = elements.filter(e =>
    (e.controlType === "Hyperlink" || e.controlType === "ListItem" || e.controlType === "Link") &&
    e.name.length > 5 &&
    !e.name.includes("搜索") &&
    !e.name.includes("首页") &&
    e.y > 200 // 排除导航栏
  );
  
  console.log(`    找到 ${videoElements.length} 个可能的视频元素`);
  for (const e of videoElements.slice(0, 8)) {
    console.log(`      [${e.controlType}] "${e.name.slice(0, 60)}" at (${e.x},${e.y})`);
  }
  
  // 选择第三个视频
  if (videoElements.length >= 3) {
    const thirdVideo = videoElements[2];
    console.log(`    🎯 选择第三个: "${thirdVideo.name.slice(0, 50)}"`);
    clickElement(thirdVideo);
    console.log("    ⏳ 等待视频加载...");
    await sleep(5000);
  } else {
    console.log("    ⚠️ 视频列表不足3个，尝试滚动...");
    native.mouseScroll(-3);
    await sleep(2000);
    
    // 重新检测
    elements = getUIElements();
    const moreVideos = elements.filter(e =>
      (e.controlType === "Hyperlink" || e.controlType === "ListItem") &&
      e.name.length > 5 && e.y > 200
    );
    
    if (moreVideos.length >= 3) {
      clickElement(moreVideos[2]);
      await sleep(5000);
    } else {
      console.log("    ⚠️ 仍然不足，尝试 LLM 辅助...");
      const advice = await askLLM(
        `I'm on a bilibili user profile page. I need to click the 3rd video in their video list. ` +
        `UI elements: ${elements.slice(0, 30).map(e => `"${e.name.slice(0,25)}" at(${e.x},${e.y})`).join("; ")}. ` +
        `Which coordinates for the 3rd video?`
      );
    }
  }
  
  await screenshot("video_playing");

  // ─── Step 7: 验证视频播放 ────────────────────────────────────
  step("验证视频播放状态");
  
  elements = getUIElements();
  const playerElements = elements.filter(e =>
    e.name.includes("播放") ||
    e.name.includes("暂停") ||
    e.name.includes("play") ||
    e.name.includes("pause") ||
    e.name.includes("视频") ||
    e.controlType === "Video"
  );
  
  console.log(`    播放器相关元素: ${playerElements.length}`);
  for (const e of playerElements.slice(0, 5)) {
    console.log(`      [${e.controlType}] "${e.name.slice(0, 60)}"`);
  }

  // ─── Summary ──────────────────────────────────────────────────
  const totalTime = performance.now() - taskStart;
  
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Task Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Total steps: ${stepCount}`);
  console.log(`  Total time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(err => {
  console.error("\n❌ Task failed:", err.message);
  process.exit(1);
});
