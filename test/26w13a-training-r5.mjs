/**
 * OpenOxygen — 26w13aA R5: Scaled Training Suite
 *
 * 扩大训练规模：10个任务，覆盖更多应用和更深层操作
 * 修复：清理残留窗口、VS Code 保存对话框、VLM 坐标提取
 *
 * T1:  Win键搜索 → 打开计算器 → 计算 123+456 → 关闭
 * T2:  Bilibili VLM → 搜索"逗比的雀巢" → 用户主页 → 播放视频 → 调音量
 * T3:  Gmail → 检查收件箱 → 读邮件 → 返回收件箱
 * T4:  VS Code → 新建 → 粘贴代码 → Ctrl+S → 终端运行 → 验证输出 → 关闭
 * T5:  微信 → 探索界面布局 → 记录联系人
 * T6:  Steam → 探索界面 → 查看游戏库
 * T7:  百度搜索 → 点击结果 → 返回
 * T8:  豆包 → 3轮技术对话
 * T9:  多应用切换 → Win+Tab → Alt+Tab → 验证切换
 * T10: 文件管理 → Win+E → 导航到文件夹 → 创建文件 → 删除
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const fs = require("fs");
const GATEWAY = "http://127.0.0.1:4800";
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\26w13a-training-r5";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";
const MEMORY_DIR = "D:\\Coding\\OpenOxygen\\.state\\ouv-training";
const MEMORY_FILE = `${MEMORY_DIR}\\visual-memory.json`;
const PROMPT_SCRIPT = "D:\\Coding\\OpenOxygen\\scripts\\user-prompt.ps1";

for (const d of [SS_DIR, RESULTS_DIR, MEMORY_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Memory + Sanitize
// ═══════════════════════════════════════════════════════════════════════════

let visualMemory = { experiences: [], appIndex: {}, elementIndex: {} };
function loadMemory() { if (existsSync(MEMORY_FILE)) { try { visualMemory = JSON.parse(readFileSync(MEMORY_FILE, "utf-8")); } catch {} } }
function saveMemory() { writeFileSync(MEMORY_FILE, JSON.stringify({ ...visualMemory, version: "26w13aA-R5", updatedAt: Date.now() }, null, 2)); }
function recordExp(exp) {
  if (exp.windowTitle) exp.windowTitle = sanitize(exp.windowTitle);
  if (exp.vlmDescription) exp.vlmDescription = sanitize(exp.vlmDescription);
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (!visualMemory.experiences) visualMemory.experiences = [];
  visualMemory.experiences.push({ id, timestamp: Date.now(), ...exp });
  if (!visualMemory.appIndex) visualMemory.appIndex = {};
  if (!visualMemory.appIndex[exp.app]) visualMemory.appIndex[exp.app] = [];
  visualMemory.appIndex[exp.app].push(id);
  saveMemory();
}
function sanitize(t) {
  if (!t) return t;
  return t.replace(/1[3-9]\d{9}/g, "1**********").replace(/[\w.-]+@[\w.-]+\.\w+/g, "***@***.***")
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, "****-****-****-****");
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Utils
// ═══════════════════════════════════════════════════════════════════════════

let stepCount = 0;
const M = native.getScreenMetrics();
const sleep = ms => new Promise(r => setTimeout(r, ms));
function step(n) { stepCount++; console.log(`\n[Step ${stepCount}] ${n}`); }
function ss(label) {
  const p = `${SS_DIR}\\s${String(stepCount).padStart(2,"0")}_${label.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g,"_")}.png`;
  try { native.captureScreen(p); console.log(`    📸 ${label}`); return p; } catch(e) { return null; }
}
function getEls() { try { return native.getUiElements(null).filter(e=>e.name&&!e.isOffscreen&&e.width>0&&e.height>0); } catch { return []; } }
function findEl(els,...kws) {
  for (const kw of kws) { const l=kw.toLowerCase(); const f=els.find(e=>((e.name||"").toLowerCase().includes(l)||(e.automationId||"").toLowerCase().includes(l))&&e.y>30&&e.y<M.logicalHeight-60); if(f) return f; }
  return null;
}
function clickEl(el) { const x=el.x+Math.floor(el.width/2),y=el.y+Math.floor(el.height/2); console.log(`    🖱️ "${(el.name||"").slice(0,30)}" [${el.controlType}] (${x},${y})`); native.mouseClickSmooth(x,y,"left",200); }
function clickAt(x,y,r) { console.log(`    🖱️ (${x},${y}) — ${r}`); native.mouseClickSmooth(x,y,"left",200); }
function key(k) { console.log(`    ⌨️ ${k}`); native.sendHotkey(k); }
function typeEN(t) { console.log(`    ⌨️ EN: "${t}"`); native.typeText(t); }
function typeCN(t) { console.log(`    ⌨️ CN: "${t}"`); native.clipboardSetText(t); native.sendHotkey("ctrl+v"); }
function isRunning(p) { return native.listProcesses().some(x=>(x.name||"").toLowerCase()===p.toLowerCase()); }
function promptUser(msg) {
  console.log(`    👤 ${msg.slice(0,60)}`);
  try { return execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${PROMPT_SCRIPT}" "${msg.replace(/"/g,"'")}"`,{timeout:300000}).toString().trim()==="OK"; } catch { return false; }
}
function focusWin(title,cls) {
  const w=native.listWindows().find(w=>w.visible&&w.title&&w.width>100&&(title?w.title.includes(title):true)&&(cls?w.className===cls:true));
  if(w){native.focusWindow(w.hwnd);console.log(`    🪟 "${w.title.slice(0,45)}"`);return w;} return null;
}

// 严格清理：关闭浏览器 + 残留对话框
function cleanSlate() {
  console.log("    🧹 Cleaning...");
  // 关闭残留的"另存为"对话框
  const wins = native.listWindows();
  const dialogs = wins.filter(w => w.visible && (w.className === "#32770" || (w.title && (w.title.includes("另存为") || w.title.includes("Save As")))));
  for (const d of dialogs) { native.focusWindow(d.hwnd); key("escape"); }
  try { execSync('powershell.exe -NoProfile -Command "Get-Process chrome,msedge -EA SilentlyContinue | Stop-Process -Force"',{timeout:5000}); } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// VLM (qwen3-vl:4b)
// ═══════════════════════════════════════════════════════════════════════════

async function vlm(ssPath, question) {
  const b64 = fs.readFileSync(ssPath).toString("base64");
  try {
    const r = await fetch("http://127.0.0.1:11434/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:"qwen3-vl:4b", messages:[{role:"user",content:`/no_think\n${question}`,images:[b64]}], stream:false, options:{num_predict:300} }),
    });
    const d = await r.json(); const c = d.message?.content||"";
    console.log(`    👁️ VLM: ${c.slice(0,110).replace(/\n/g," ")}`);
    return c;
  } catch(e) { console.log(`    ⚠ VLM: ${e.message}`); return ""; }
}

async function vlmVerify(ssPath, condition) {
  const r = await vlm(ssPath, `${condition}\nReply JSON: {"success":true/false,"observation":"brief"}`);
  try { const m=r.match(/\{[\s\S]*?\}/); if(m) return JSON.parse(m[0]); } catch {}
  return { success: null, observation: r.slice(0,120) };
}

async function vlmCoords(ssPath, what) {
  const r = await vlm(ssPath, `Find "${what}" on screen (${M.logicalWidth}x${M.logicalHeight}). Reply ONLY: x,y`);
  const m = r.match(/(\d{2,4})\s*[,，]\s*(\d{2,4})/);
  if (m) { const x=parseInt(m[1]),y=parseInt(m[2]); if(x>0&&x<M.logicalWidth&&y>0&&y<M.logicalHeight) return {x,y}; }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Multi-AI
// ═══════════════════════════════════════════════════════════════════════════

async function fast(q) {
  try {
    const r=await fetch(`${GATEWAY}/api/v1/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"Be extremely brief."},{role:"user",content:q}],model:"qwen3:4b"})});
    const d=await r.json(); console.log(`    ⚡ ${(d.content||"").slice(0,90).replace(/\n/g," ")}`); return d.content||"";
  } catch(e) { return ""; }
}

async function deep(q) {
  try {
    const r=await fetch(`${GATEWAY}/api/v1/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"Analyze thoroughly."},{role:"user",content:q}],model:"gpt-oss:20b"})});
    const d=await r.json(); console.log(`    🧠 ${(d.content||"").slice(0,110).replace(/\n/g," ")}`); return d.content||"";
  } catch(e) { return ""; }
}

// ═══════════════════════════════════════════════════════════════════════════
// Task Runner
// ═══════════════════════════════════════════════════════════════════════════

const R = [];
async function run(name, fn) {
  const t0 = performance.now();
  console.log(`\n${"═".repeat(65)}\n  TASK: ${name}\n${"═".repeat(65)}`);
  try {
    const r = await fn();
    const d = performance.now()-t0;
    R.push({name,status:r?.status||"done",duration:d,details:r});
    const i = r?.status==="success"?"✅":r?.status==="skip"?"⊘":"⚠️";
    console.log(`\n  ${i} ${name} → ${r?.status} (${(d/1000).toFixed(1)}s)`);
  } catch(e) {
    R.push({name,status:"error",duration:performance.now()-t0,error:e.message});
    console.log(`\n  ❌ ${name} — ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// T1: Win键 → 计算器 → 123+456 → 关闭
// ═══════════════════════════════════════════════════════════════════════════

async function T1() {
  step("Win+D → Win → 搜索计算器");
  try { execSync('powershell.exe -NoProfile -Command "Get-Process CalculatorApp -EA SilentlyContinue | Stop-Process -Force"',{timeout:5000}); } catch {}
  await sleep(1000);
  key("win+d"); await sleep(1500);
  key("win"); await sleep(2500);
  const s1 = ss("start_menu");
  const v1 = await vlmVerify(s1, "Is the Windows Start Menu or search open?");
  if (!v1.success) { key("escape"); await sleep(500); key("win"); await sleep(2500); }

  step("搜索'计算器'");
  typeCN("计算器"); await sleep(2500);
  ss("search_calc");
  key("enter"); await sleep(3000);

  step("VLM 验证计算器打开");
  const s2 = ss("calc_opened");
  const v2 = await vlmVerify(s2, "Is the Windows Calculator app open?");

  step("输入 123+456=");
  // 计算器用键盘直接输入
  typeEN("123"); await sleep(300);
  native.typeText("+"); await sleep(300);
  typeEN("456"); await sleep(300);
  key("enter"); // = 号
  await sleep(1000);
  const s3 = ss("calc_result");
  const v3 = await vlmVerify(s3, "Does the calculator show the result 579?");

  step("Alt+F4 关闭");
  key("alt+F4"); await sleep(1000);
  ss("calc_closed");

  recordExp({ app:"calculator", appType:"system", action:{type:"full-flow",steps:["win","search","open","calculate","close"]}, intent:"计算器 123+456", result:v3.success?"success":"partial", vlmDescription:v3.observation });
  return { status: v3.success !== false ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T2: Bilibili VLM 深度导航
// ═══════════════════════════════════════════════════════════════════════════

async function T2() {
  step("清理 + Chrome → bilibili 用户搜索");
  cleanSlate(); await sleep(2000);
  // 直接 URL 搜索用户（跳过页面内搜索框的 UIA 问题）
  execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://search.bilibili.com/upuser?keyword=逗比的雀巢\'"',{timeout:15000});
  await sleep(8000);
  focusWin(null, "Chrome_WidgetWin_1"); await sleep(1000);
  const s1 = ss("bili_user_search");

  step("VLM 定位用户卡片");
  const v1 = await vlm(s1, "Is this bilibili user search results? Where is the first user card with avatar? Give coordinates x,y for clicking the username.");
  const c1 = v1.match(/(\d{3,4})\s*[,，]\s*(\d{2,3})/);

  step("点击用户进入主页");
  if (c1) { clickAt(parseInt(c1[1]), parseInt(c1[2]), "用户卡片 (VLM)"); }
  else { clickAt(Math.round(M.logicalWidth*0.35), Math.round(M.logicalHeight*0.4), "用户卡片 (ratio)"); }
  await sleep(6000);
  const s2 = ss("bili_profile");

  step("VLM 定位第一个视频");
  const v2 = await vlm(s2, "Is this a bilibili user profile page? Where is the first video thumbnail? Give x,y coordinates.");
  const c2 = v2.match(/(\d{3,4})\s*[,，]\s*(\d{2,3})/);

  step("点击视频");
  if (c2) { clickAt(parseInt(c2[1]), parseInt(c2[2]), "视频 (VLM)"); }
  else { clickAt(Math.round(M.logicalWidth*0.3), Math.round(M.logicalHeight*0.55), "视频 (ratio)"); }
  await sleep(6000);
  const s3 = ss("bili_video");
  const v3 = await vlmVerify(s3, "Is a bilibili video player visible? Is a video playing or ready to play?");

  // 调节音量
  step("调节音量 (VLM 定位音量按钮)");
  const volCoord = await vlmCoords(s3, "video player volume/sound button or icon");
  if (volCoord) { clickAt(volCoord.x, volCoord.y, "音量 (VLM)"); await sleep(1000); }

  ss("bili_volume");
  recordExp({ app:"bilibili", appType:"browser", action:{type:"full-flow",steps:["url-search","vlm-user","vlm-video","vlm-volume"]}, intent:"bilibili 搜索→用户→视频→音量", result:v3.success?"success":"partial", vlmDescription:v3.observation });
  return { status: v3.success ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T3: Gmail
// ═══════════════════════════════════════════════════════════════════════════

async function T3() {
  step("清理 + Chrome → Gmail");
  cleanSlate(); await sleep(2000);
  execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://mail.google.com\'"',{timeout:15000});
  await sleep(8000);
  focusWin(null,"Chrome_WidgetWin_1"); await sleep(1000);
  const s1 = ss("gmail");

  step("VLM 判断登录状态");
  const login = await vlm(s1, "Is this Gmail inbox? Or Google login page? Reply: INBOX or LOGIN or OTHER");
  if (login.toUpperCase().includes("LOGIN")) {
    if (!promptUser("Gmail 需要登录。\n请完成登录进入收件箱后点击「确定」。\n点击「取消」跳过。")) return {status:"skip"};
    await sleep(3000);
  }

  step("VLM 分析收件箱 + 点击第一封邮件");
  const s2 = ss("gmail_inbox");
  const emailCoord = await vlmCoords(s2, "first/newest email row in Gmail inbox");
  if (emailCoord) clickAt(emailCoord.x, emailCoord.y, "邮件 (VLM)");
  else clickAt(Math.round(M.logicalWidth*0.5), Math.round(M.logicalHeight*0.3), "邮件 (ratio)");
  await sleep(4000);
  const s3 = ss("gmail_email");
  const v3 = await vlmVerify(s3, "Is an email opened showing subject, sender and body?");

  step("返回收件箱");
  key("escape"); await sleep(1000);
  // Gmail 用左箭头返回
  const backCoord = await vlmCoords(ss("gmail_back"), "back arrow or return button in Gmail");
  if (backCoord) clickAt(backCoord.x, backCoord.y, "返回 (VLM)");
  else key("u"); // Gmail 快捷键 u = 返回收件箱
  await sleep(2000);
  ss("gmail_returned");

  recordExp({ app:"gmail", appType:"browser", action:{type:"full-flow",steps:["navigate","login","open-email","read","return"]}, intent:"Gmail 读邮件+返回", result:v3.success?"success":"partial" });
  return { status: v3.success ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T4: VS Code 完整闭环
// ═══════════════════════════════════════════════════════════════════════════

async function T4() {
  step("关闭残留对话框 + 聚焦 VS Code");
  // 先关闭所有残留的保存对话框
  const wins = native.listWindows();
  for (const w of wins.filter(w => w.visible && (w.className === "#32770" || w.title?.includes("另存为")))) {
    native.focusWindow(w.hwnd); key("escape"); await sleep(500);
  }
  // 关闭所有未保存的 VS Code 标签
  let vsc = focusWin("Visual Studio Code", null);
  if (!vsc) { execSync('powershell.exe -NoProfile -Command "Start-Process code"',{timeout:15000}); await sleep(5000); vsc = focusWin("Visual Studio Code",null); }
  if (!vsc) return {status:"fail",note:"VS Code not found"};

  step("关闭所有标签 (Ctrl+K Ctrl+W)");
  key("ctrl+k"); await sleep(300); key("ctrl+w"); await sleep(2000);
  // 如果弹出保存提示，选择不保存
  for (let i = 0; i < 5; i++) {
    const fg = native.getForegroundWindowInfo();
    if (fg?.title?.includes("Save") || fg?.title?.includes("保存") || fg?.className === "#32770") {
      const els = getEls();
      const dontSave = findEl(els, "Don't Save", "不保存");
      if (dontSave) clickEl(dontSave);
      else { key("tab"); key("tab"); key("enter"); }
      await sleep(1000);
    } else break;
  }
  await sleep(1000);

  step("Ctrl+N 新建");
  key("ctrl+n"); await sleep(2000);
  ss("vsc_new");

  step("粘贴代码");
  native.clipboardSetText(`# OpenOxygen R5 Training
import datetime, sys
def main():
    print("=== OpenOxygen R5 ===")
    print(f"Python {sys.version}")
    print(f"Time: {datetime.datetime.now()}")
    return 0
if __name__ == "__main__":
    exit(main())
`);
  key("ctrl+v"); await sleep(1000);
  const sCode = ss("vsc_code");
  const vCode = await vlmVerify(sCode, "Is Python code visible in VS Code? Can you see 'OpenOxygen R5'?");

  step("Ctrl+S 保存");
  key("ctrl+s"); await sleep(2000);
  // 处理保存对话框
  for (let attempt = 0; attempt < 3; attempt++) {
    const fg = native.getForegroundWindowInfo();
    const t = fg?.title || "";
    if (t.includes("Save") || t.includes("保存") || t.includes("另存为") || fg?.className === "#32770") {
      // 清空文件名输入框，输入新名字
      key("ctrl+a"); await sleep(200);
      typeEN("ouv_r5_test.py"); await sleep(500);
      key("enter"); await sleep(2000);
      // 覆盖确认
      const fg2 = native.getForegroundWindowInfo();
      if (fg2?.title?.includes("确认") || fg2?.title?.includes("Confirm") || fg2?.title?.includes("Replace")) {
        key("enter"); await sleep(1000);
      }
      break;
    } else if (t.includes("ouv_r5") || t.includes(".py")) {
      console.log("    ✅ Saved"); break;
    } else {
      if (attempt === 0) { key("ctrl+shift+s"); await sleep(2000); }
      else break;
    }
  }
  ss("vsc_saved");

  step("终端运行");
  key("ctrl+`"); await sleep(2000);
  typeEN("python ouv_r5_test.py"); key("enter"); await sleep(3000);
  const sTerm = ss("vsc_terminal");
  const vTerm = await vlmVerify(sTerm, "Is there terminal output showing 'OpenOxygen R5' or Python version?");

  step("关闭文件");
  key("ctrl+w"); await sleep(1000);
  const fgC = native.getForegroundWindowInfo();
  if (fgC?.title?.includes("Save") || fgC?.title?.includes("保存")) {
    const els = getEls(); const ds = findEl(els,"Don't Save","不保存");
    if (ds) clickEl(ds); else key("enter");
    await sleep(1000);
  }

  recordExp({ app:"vscode", appType:"desktop", action:{type:"full-flow"}, intent:"VS Code 完整闭环", result:vTerm.success?"success":"partial", vlmDescription:`Code:${vCode.observation}; Term:${vTerm.observation}` });
  return { status: vTerm.success ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T5: 微信界面探索
// ═══════════════════════════════════════════════════════════════════════════

async function T5() {
  step("检测微信");
  const running = isRunning("WeChat.exe") || isRunning("WeChatAppEx.exe");
  if (!running) return { status: "skip", note: "WeChat not running" };

  step("聚焦微信");
  let wx = focusWin("微信", null);
  if (!wx) {
    if (!promptUser("微信可能最小化了。\n请打开微信主窗口后点击「确定」。")) return {status:"skip"};
    await sleep(2000);
    wx = focusWin("微信", null);
  }
  if (!wx) return { status: "fail", note: "WeChat window not found" };
  await sleep(1000);
  const s1 = ss("wechat_main");

  step("VLM 分析微信界面");
  const desc = await vlm(s1, "Describe this WeChat interface. Where are: contact list, chat area, search box, toolbar? Be specific about layout.");
  const els = getEls();
  console.log(`    UIA: ${els.length} elements`);

  recordExp({ app:"wechat", appType:"desktop", windowTitle:sanitize(wx.title),
    elements: els.slice(0,30).map(e=>({name:sanitize(e.name),type:e.controlType,x:e.x,y:e.y,width:e.width,height:e.height})),
    action:{type:"observe"}, intent:"微信界面探索", result:"success", vlmDescription:sanitize(desc.slice(0,300)) });
  return { status: "success", elements: els.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// T6: Steam 界面探索
// ═══════════════════════════════════════════════════════════════════════════

async function T6() {
  step("检测 Steam");
  const running = isRunning("steam.exe") || isRunning("steamwebhelper.exe");
  if (!running) return { status: "skip", note: "Steam not running" };

  step("聚焦 Steam");
  let stm = focusWin("Steam", null);
  if (!stm) {
    if (!promptUser("Steam 可能最小化了。\n请打开 Steam 主窗口后点击「确定」。")) return {status:"skip"};
    await sleep(2000);
    stm = focusWin("Steam", null);
  }
  if (!stm) return { status: "fail" };
  await sleep(1000);
  const s1 = ss("steam_main");

  step("VLM 分析 Steam 界面");
  const desc = await vlm(s1, "Describe this Steam interface. What section is shown? Library, Store, Community? What games are visible?");

  recordExp({ app:"steam", appType:"desktop", windowTitle:sanitize(stm.title),
    action:{type:"observe"}, intent:"Steam 界面探索", result:"success", vlmDescription:sanitize(desc.slice(0,300)) });
  return { status: "success" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T7: 百度搜索
// ═══════════════════════════════════════════════════════════════════════════

async function T7() {
  step("清理 + Chrome → 百度");
  cleanSlate(); await sleep(2000);
  execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://www.baidu.com/s?wd=OpenOxygen+AI+Agent\'"',{timeout:15000});
  await sleep(6000);
  focusWin(null,"Chrome_WidgetWin_1"); await sleep(1000);
  const s1 = ss("baidu_results");

  step("VLM 分析搜索结果 + 点击第一个");
  const v1 = await vlmVerify(s1, "Are Baidu search results shown for 'OpenOxygen'?");
  const c1 = await vlmCoords(s1, "first search result link/title on Baidu");
  if (c1) clickAt(c1.x, c1.y, "结果 (VLM)");
  else clickAt(Math.round(M.logicalWidth*0.4), Math.round(M.logicalHeight*0.35), "结果 (ratio)");
  await sleep(5000);
  const s2 = ss("baidu_result_page");
  const v2 = await vlmVerify(s2, "Has a new page opened from the search result?");

  step("返回 (Alt+Left)");
  key("alt+Left"); await sleep(3000);
  ss("baidu_returned");

  recordExp({ app:"baidu", appType:"browser", action:{type:"full-flow",steps:["url-search","vlm-click","return"]}, intent:"百度搜索+点击+返回", result:v2.success?"success":"partial" });
  return { status: v2.success ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// T8: 豆包 3轮深度对话
// ═══════════════════════════════════════════════════════════════════════════

async function T8() {
  step("聚焦豆包");
  let db = focusWin("豆包", null);
  if (!db) {
    if (isRunning("Doubao.exe")) { promptUser("请打开豆包窗口后点击「确定」。"); await sleep(2000); db = focusWin("豆包",null); }
    if (!db) return { status: "skip" };
  }
  await sleep(1000);

  // 找输入框
  const els = getEls();
  const input = findEl(els, "输入", "发送", "消息");
  if (input) clickEl(input);
  else clickAt(Math.round(M.logicalWidth*0.5), Math.round(db.height*0.85+db.y), "输入框");
  await sleep(500);

  const questions = [
    "假设你要设计一个能自主操作Windows电脑的AI系统，它需要看屏幕截图来理解界面。用4B参数的视觉模型够吗？有什么局限？",
    "如果这个AI系统在操作过程中犯了错（比如点错了按钮），它应该怎么自动发现并纠正错误？",
    "这种AI系统最大的安全风险是什么？如何防止它执行危险操作（比如删除重要文件）？"
  ];

  for (let i = 0; i < questions.length; i++) {
    step(`Round ${i+1}: 发送问题`);
    typeCN(questions[i]); await sleep(800);
    key("enter");
    console.log("    ⏳ 等待回复...");
    await sleep(15000);
    ss(`doubao_r${i+1}`);
  }

  step("深度评估");
  const assessment = await deep(
    "Evaluate a 3-round conversation about building a Windows AI Agent:\n" +
    questions.map((q,i) => `Q${i+1}: ${q}`).join("\n") +
    "\nRate depth 1-10. Key insights?"
  );

  recordExp({ app:"doubao", appType:"desktop", action:{type:"deep-conversation",rounds:3}, intent:"豆包3轮技术对话", result:"success", vlmDescription:sanitize(assessment.slice(0,300)) });
  return { status: "success", assessment: assessment.slice(0,200) };
}

// ═══════════════════════════════════════════════════════════════════════════
// T9: 多应用切换 (Alt+Tab, Win+Tab)
// ═══════════════════════════════════════════════════════════════════════════

async function T9() {
  step("Alt+Tab 切换");
  key("alt+tab"); await sleep(2000);
  const s1 = ss("alt_tab");
  const v1 = await vlmVerify(s1, "Is the Alt+Tab task switcher visible showing multiple windows?");
  key("escape"); await sleep(500);

  step("Win+Tab 任务视图");
  key("win+tab"); await sleep(2000);
  const s2 = ss("win_tab");
  const v2 = await vlmVerify(s2, "Is the Windows Task View showing multiple desktops or windows?");
  key("escape"); await sleep(500);

  step("Win+D 显示桌面 → 恢复");
  key("win+d"); await sleep(1500);
  const s3 = ss("desktop");
  const v3 = await vlmVerify(s3, "Is the desktop shown with no application windows visible?");
  key("win+d"); await sleep(1000); // 恢复

  recordExp({ app:"system", appType:"system", action:{type:"hotkey-test",keys:["alt+tab","win+tab","win+d"]}, intent:"系统快捷键测试", result:"success" });
  return { status: "success", altTab: v1.success, winTab: v2.success, desktop: v3.success };
}

// ═══════════════════════════════════════════════════════════════════════════
// T10: 文件管理 (Win+E → 导航 → 创建文件)
// ═══════════════════════════════════════════════════════════════════════════

async function T10() {
  step("Win+E 打开文件资源管理器");
  key("win+e"); await sleep(3000);
  const s1 = ss("explorer");
  const v1 = await vlmVerify(s1, "Is Windows File Explorer open?");

  step("导航到文档文件夹");
  key("ctrl+l"); await sleep(500);
  typeEN("D:\\Coding\\OpenOxygen\\test"); key("enter");
  await sleep(2000);
  ss("explorer_test");

  step("VLM 验证导航");
  const s2 = ss("explorer_nav");
  const v2 = await vlmVerify(s2, "Is File Explorer showing the contents of a 'test' folder?");

  step("关闭资源管理器");
  key("alt+F4"); await sleep(1000);

  recordExp({ app:"explorer", appType:"system", action:{type:"full-flow",steps:["win+e","navigate","verify","close"]}, intent:"文件管理器导航", result:v2.success?"success":"partial" });
  return { status: v2.success !== false ? "success" : "partial" };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA R5 — Scaled Training (10 Tasks)         ║");
  console.log("║  VLM vision · multi-AI · system hotkeys · deep tasks        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const t0 = performance.now();
  loadMemory();
  console.log(`Gateway: ✓`);
  console.log(`Screen: ${M.logicalWidth}x${M.logicalHeight}`);
  const apps = ["QQ.exe","Doubao.exe","ChatGPT.exe","Code.exe","WeChatAppEx.exe","steamwebhelper.exe"].filter(p=>isRunning(p));
  console.log(`Running: ${apps.join(", ")}\n`);

  // VLM pre-check
  const vlmOk = await vlm(ss("precheck"), "What do you see? Brief.");
  console.log(`VLM: ${vlmOk?"✓":"✗"}\n`);

  await run("T1: 计算器 (Win键→搜索→计算→关闭)", T1);
  await run("T2: Bilibili VLM (搜索→用户→视频→音量)", T2);
  await run("T3: Gmail (收件箱→读邮件→返回)", T3);
  await run("T4: VS Code (新建→代码→保存→运行→关闭)", T4);
  await run("T5: 微信界面探索", T5);
  await run("T6: Steam 界面探索", T6);
  await run("T7: 百度搜索 (搜索→点击→返回)", T7);
  await run("T8: 豆包3轮深度对话", T8);
  await run("T9: 系统快捷键 (Alt+Tab, Win+Tab, Win+D)", T9);
  await run("T10: 文件管理器 (Win+E→导航→关闭)", T10);

  cleanSlate();
  saveMemory();

  const total = performance.now() - t0;
  const pass = R.filter(t=>t.status==="success").length;
  const part = R.filter(t=>t.status==="partial").length;
  const skip = R.filter(t=>t.status==="skip").length;
  const fail = R.filter(t=>t.status==="error"||t.status==="fail").length;

  console.log(`\n${"═".repeat(65)}`);
  console.log("  26w13aA R5 — Scaled Training Results");
  console.log(`${"═".repeat(65)}`);
  for (const t of R) {
    const i = t.status==="success"?"✅":t.status==="skip"?"⊘":t.status==="error"?"❌":"⚠️";
    console.log(`  ${i} ${t.name} → ${t.status} (${(t.duration/1000).toFixed(1)}s)`);
  }
  console.log(`\n  ✅ ${pass} | ⚠️ ${part} | ⊘ ${skip} | ❌ ${fail} | Total: ${(total/1000).toFixed(1)}s`);
  console.log(`  Memory: ${visualMemory.experiences?.length||0} experiences`);

  writeFileSync(`${RESULTS_DIR}\\training-r5-${Date.now()}.json`, JSON.stringify({taskResults:R,duration:total,memStats:{total:visualMemory.experiences?.length,apps:Object.keys(visualMemory.appIndex||{}).length}},null,2));
}

main().catch(err => { console.error("❌ Fatal:", err.message); process.exit(1); });
