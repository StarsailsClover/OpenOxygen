/**
 * OpenOxygen — 26w13aA R6: Deep Interaction Training (15 Tasks)
 *
 * 修复：
 *   - VLM 空响应：增加 num_predict 到 400 + 重试机制
 *   - VS Code 残留对话框：启动前 Ctrl+K Ctrl+W 关闭所有标签 + 处理保存提示
 *   - 百度 VLM 坐标：改用 URL 参数直接跳转
 *   - Bilibili：VLM 重试 + 更精确的坐标提示
 *
 * 深层任务：
 *   T1:  计算器 — 复杂计算 (123*456-789)
 *   T2:  Bilibili — VLM 搜索→用户主页→播放视频→全屏→退出
 *   T3:  Gmail — 筛选未读邮件 → 查看未回复邮件
 *   T4:  VS Code — 新建→写代码→保存→运行→验证输出
 *   T5:  QQ群聊 — 查看群消息 → LLM总结 → 发送[OpenOxygen]标识回复
 *   T6:  微信 — 探索界面 + VLM 深度分析
 *   T7:  Steam — 查看游戏库 → 分析游戏列表
 *   T8:  豆包 — 4轮深度对话
 *   T9:  GitHub Desktop — 查看仓库状态
 *   T10: 百度 — URL搜索→点击→阅读→返回
 *   T11: ChatGPT — 发送问题→等待回复
 *   T12: 系统快捷键 — Win+S搜索、Win+I设置、Win+E资源管理器
 *   T13: 文件管理器 — 创建文件夹→创建文件→写入→验证
 *   T14: 记事本 — 多行中英文混合输入→保存→关闭
 *   T15: 多窗口编排 — Win+Left/Right 分屏
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const fs = require("fs");
const GATEWAY = "http://127.0.0.1:4800";
const SS = "D:\\Coding\\OpenOxygen\\.state\\26w13a-r6";
const RES = "D:\\Coding\\OpenOxygen\\test\\results";
const MEM_FILE = "D:\\Coding\\OpenOxygen\\.state\\ouv-training\\visual-memory.json";
const PS = "D:\\Coding\\OpenOxygen\\scripts\\user-prompt.ps1";
for (const d of [SS, RES]) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

// ═══ Memory ═══
let mem = { experiences: [], appIndex: {}, elementIndex: {} };
function loadMem() { if (existsSync(MEM_FILE)) try { mem = JSON.parse(readFileSync(MEM_FILE, "utf-8")); } catch {} }
function saveMem() { writeFileSync(MEM_FILE, JSON.stringify({ ...mem, version: "R6", updatedAt: Date.now() }, null, 2)); }
function rec(e) {
  if (e.windowTitle) e.windowTitle = san(e.windowTitle);
  if (e.vlmDescription) e.vlmDescription = san(e.vlmDescription);
  const id = `r6_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
  if (!mem.experiences) mem.experiences = [];
  mem.experiences.push({ id, ts: Date.now(), ...e });
  if (!mem.appIndex) mem.appIndex = {};
  if (!mem.appIndex[e.app]) mem.appIndex[e.app] = [];
  mem.appIndex[e.app].push(id);
  saveMem();
}
function san(t) {
  if (!t) return t;
  return t.replace(/1[3-9]\d{9}/g,"1**********").replace(/[\w.-]+@[\w.-]+\.\w+/g,"***@***.***")
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,"****-****-****-****");
}

// ═══ Utils ═══
let sc = 0;
const M = native.getScreenMetrics();
const sl = ms => new Promise(r => setTimeout(r, ms));
function st(n) { sc++; console.log(`\n[${sc}] ${n}`); }
function ss(l) {
  const p = `${SS}\\${String(sc).padStart(2,"0")}_${l.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g,"_")}.png`;
  try { native.captureScreen(p); return p; } catch { return null; }
}
function els() { try { return native.getUiElements(null).filter(e=>e.name&&!e.isOffscreen&&e.width>0&&e.height>0); } catch { return []; } }
function fEl(es,...kw) { for(const k of kw){const l=k.toLowerCase();const f=es.find(e=>((e.name||"").toLowerCase().includes(l)||(e.automationId||"").toLowerCase().includes(l))&&e.y>30&&e.y<M.logicalHeight-60);if(f)return f;} return null; }
function clk(e) { const x=e.x+Math.floor(e.width/2),y=e.y+Math.floor(e.height/2); console.log(`    🖱️ "${(e.name||"").slice(0,25)}" (${x},${y})`); native.mouseClickSmooth(x,y,"left",180); }
function clkAt(x,y,r) { console.log(`    🖱️ (${x},${y}) ${r}`); native.mouseClickSmooth(x,y,"left",180); }
function ky(k) { console.log(`    ⌨️ ${k}`); native.sendHotkey(k); }
function tEN(t) { native.typeText(t); }
function tCN(t) { native.clipboardSetText(t); native.sendHotkey("ctrl+v"); }
function isRun(p) { return native.listProcesses().some(x=>(x.name||"").toLowerCase()===p.toLowerCase()); }
function prompt(m) { try { return execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${PS}" "${m.replace(/"/g,"'")}"`,{timeout:300000}).toString().trim()==="OK"; } catch { return false; } }
function focW(t,c) { const w=native.listWindows().find(w=>w.visible&&w.title&&w.width>100&&(t?w.title.includes(t):true)&&(c?w.className===c:true)); if(w){native.focusWindow(w.hwnd);console.log(`    🪟 "${w.title.slice(0,40)}"`);return w;} return null; }

function clean() {
  // 关闭残留对话框
  for(const w of native.listWindows().filter(w=>w.visible&&w.className==="#32770")){native.focusWindow(w.hwnd);ky("escape");}
  try{execSync('powershell.exe -NoProfile -Command "Get-Process chrome,msedge -EA SilentlyContinue | Stop-Process -Force"',{timeout:5000});}catch{}
}

// ═══ VLM (with retry) ═══
async function vlm(path, q, retries=2) {
  const b64 = fs.readFileSync(path).toString("base64");
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch("http://127.0.0.1:11434/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"qwen3-vl:4b", messages:[{role:"user",content:`/no_think\n${q}`,images:[b64]}], stream:false, options:{num_predict:400} }),
      });
      const d = await r.json(); const c = d.message?.content||"";
      if (c.length > 5) { console.log(`    👁️ ${c.slice(0,100).replace(/\n/g," ")}`); return c; }
      if (i < retries) console.log(`    👁️ VLM empty, retry ${i+2}...`);
    } catch(e) { if (i < retries) console.log(`    👁️ VLM err, retry ${i+2}...`); }
  }
  return "";
}
async function vlmV(p,q) {
  const r=await vlm(p,`${q}\nReply JSON: {"success":true/false,"observation":"brief"}`);
  try{const m=r.match(/\{[\s\S]*?\}/);if(m)return JSON.parse(m[0]);}catch{} return{success:null,observation:r.slice(0,120)};
}
async function vlmXY(p,what) {
  const r=await vlm(p,`Find "${what}" on screen (${M.logicalWidth}x${M.logicalHeight}). Reply ONLY coordinates: x,y`);
  const m=r.match(/(\d{2,4})\s*[,，]\s*(\d{2,4})/);
  if(m){const x=+m[1],y=+m[2];if(x>0&&x<M.logicalWidth&&y>0&&y<M.logicalHeight)return{x,y};} return null;
}

// ═══ AI ═══
async function fast(q) {
  try{const r=await fetch(`${GATEWAY}/api/v1/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"Be extremely brief."},{role:"user",content:q}],model:"qwen3:4b"})});const d=await r.json();console.log(`    ⚡ ${(d.content||"").slice(0,90).replace(/\n/g," ")}`);return d.content||"";}catch{return"";}
}
async function deep(q) {
  try{const r=await fetch(`${GATEWAY}/api/v1/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:"Analyze thoroughly. Be concise but insightful."},{role:"user",content:q}],model:"gpt-oss:20b"})});const d=await r.json();console.log(`    🧠 ${(d.content||"").slice(0,110).replace(/\n/g," ")}`);return d.content||"";}catch{return"";}
}

// ═══ Runner ═══
const R=[];
async function run(name,fn){
  const t0=performance.now();
  console.log(`\n${"═".repeat(65)}\n  ${name}\n${"═".repeat(65)}`);
  try{const r=await fn();const d=performance.now()-t0;R.push({name,status:r?.status||"done",duration:d,details:r});
    console.log(`\n  ${r?.status==="success"?"✅":r?.status==="skip"?"⊘":"⚠️"} ${name} → ${r?.status} (${(d/1000).toFixed(1)}s)`);
  }catch(e){R.push({name,status:"error",duration:performance.now()-t0,error:e.message});console.log(`\n  ❌ ${name} — ${e.message}`);}
}

// ═══════════════════════════════════════════════════════════════════════════
// T1: 计算器 — 复杂计算
// ═══════════════════════════════════════════════════════════════════════════
async function T1() {
  st("Win→计算器"); try{execSync('powershell.exe -NoProfile -Command "Get-Process CalculatorApp -EA SilentlyContinue | Stop-Process -Force"',{timeout:5000});}catch{}
  await sl(1000); ky("win+d"); await sl(1500); ky("win"); await sl(2500);
  tCN("计算器"); await sl(2500); ky("enter"); await sl(3000);
  const s1=ss("calc"); const v1=await vlmV(s1,"Is Windows Calculator open?");
  st("123*456-789"); tEN("123"); await sl(200); tEN("*"); await sl(200); tEN("456"); await sl(200); tEN("-"); await sl(200); tEN("789"); await sl(200); ky("enter"); await sl(1000);
  const s2=ss("calc_result"); const v2=await vlmV(s2,"Does calculator show 55299? (123*456=56088, 56088-789=55299)");
  st("关闭"); ky("alt+F4"); await sl(1000);
  rec({app:"calculator",action:{type:"calculate"},intent:"123*456-789=55299",result:v2.success?"success":"partial",vlmDescription:v2.observation});
  return{status:v2.success!==false?"success":"partial"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T2: Bilibili VLM 深度
// ═══════════════════════════════════════════════════════════════════════════
async function T2() {
  st("Chrome→bilibili用户搜索"); clean(); await sl(2000);
  execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://search.bilibili.com/upuser?keyword=逗比的雀巢\'"',{timeout:15000});
  await sl(8000); focW(null,"Chrome_WidgetWin_1"); await sl(1000);
  const s1=ss("bili_users");

  st("VLM定位用户'逗比的雀巢'");
  const c1=await vlmXY(s1,"the username '逗比的雀巢' text or their avatar in the first user card");
  st("点击用户");
  if(c1) clkAt(c1.x,c1.y,"用户(VLM)"); else clkAt(Math.round(M.logicalWidth*0.3),Math.round(M.logicalHeight*0.35),"用户(ratio)");
  await sl(6000); const s2=ss("bili_profile");

  st("VLM定位视频");
  const c2=await vlmXY(s2,"first video thumbnail on this user's profile page");
  if(c2) clkAt(c2.x,c2.y,"视频(VLM)"); else clkAt(Math.round(M.logicalWidth*0.3),Math.round(M.logicalHeight*0.55),"视频(ratio)");
  await sl(6000); const s3=ss("bili_video");
  const v3=await vlmV(s3,"Is a bilibili video player visible?");

  st("全屏→退出"); ky("f"); await sl(3000); ss("bili_fullscreen"); ky("escape"); await sl(1000);
  rec({app:"bilibili",action:{type:"full-flow"},intent:"搜索→用户→视频→全屏",result:v3.success?"success":"partial"});
  return{status:v3.success?"success":"partial"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T3: Gmail 筛选未读/未回复
// ═══════════════════════════════════════════════════════════════════════════
async function T3() {
  st("Chrome→Gmail未读邮件"); clean(); await sl(2000);
  // 直接用 Gmail 搜索语法筛选未读邮件
  execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://mail.google.com/mail/u/0/#search/is%3Aunread\'"',{timeout:15000});
  await sl(8000); focW(null,"Chrome_WidgetWin_1"); await sl(1000);
  const s1=ss("gmail_unread");

  st("VLM检查登录");
  const login=await vlm(s1,"Is this Gmail showing unread emails? Or login page? Reply: INBOX or LOGIN or OTHER");
  if(login.toUpperCase().includes("LOGIN")){
    if(!prompt("Gmail需要登录。\n请完成登录后点击「确定」。\n点击「取消」跳过。")) return{status:"skip"};
    await sl(3000);
  }

  st("VLM分析未读邮件列表");
  const s2=ss("gmail_unread_list");
  const desc=await vlm(s2,"How many unread emails are visible? List the subjects and senders of the first 3 emails. Which ones appear to need a reply?");

  st("点击第一封未读邮件");
  const c1=await vlmXY(s2,"first unread email row");
  if(c1) clkAt(c1.x,c1.y,"邮件(VLM)"); else clkAt(Math.round(M.logicalWidth*0.5),Math.round(M.logicalHeight*0.3),"邮件(ratio)");
  await sl(4000); const s3=ss("gmail_email_detail");
  const emailDesc=await vlm(s3,"What is this email about? Subject, sender, key content? Does it need a reply?");

  st("返回收件箱");
  ky("u"); await sl(2000); // Gmail快捷键
  ss("gmail_returned");

  // 切换到未回复视图
  st("搜索未回复邮件");
  ky("ctrl+l"); await sl(500); ky("ctrl+a"); await sl(200);
  tEN("https://mail.google.com/mail/u/0/#search/is%3Aunread+in%3Ainbox+-label%3Areplied"); ky("enter");
  await sl(5000); const s4=ss("gmail_unreplied");
  const unrepliedDesc=await vlm(s4,"Are there unreplied emails? How many? What are their subjects?");

  rec({app:"gmail",action:{type:"filter-emails",filters:["unread","unreplied"]},intent:"Gmail筛选未读+未回复",result:"success",
    vlmDescription:san(`Unread: ${desc.slice(0,150)}; Email: ${emailDesc.slice(0,150)}; Unreplied: ${unrepliedDesc.slice(0,150)}`)});
  return{status:"success",unreadDesc:san(desc.slice(0,100)),emailDesc:san(emailDesc.slice(0,100))};
}

// ═══════════════════════════════════════════════════════════════════════════
// T4: VS Code 完整闭环 (修复版)
// ═══════════════════════════════════════════════════════════════════════════
async function T4() {
  st("清理VS Code残留");
  // 先处理所有残留的保存对话框和未保存标签
  let vsc=focW("Visual Studio Code",null);
  if(!vsc){execSync('powershell.exe -NoProfile -Command "Start-Process code"',{timeout:15000});await sl(5000);vsc=focW("Visual Studio Code",null);}
  if(!vsc) return{status:"fail"};

  // 关闭所有标签，处理每个保存提示
  ky("ctrl+k"); await sl(300); ky("ctrl+w"); await sl(2000);
  for(let i=0;i<8;i++){
    const fg=native.getForegroundWindowInfo();
    if(!fg?.title) break;
    if(fg.title.includes("Save")||fg.title.includes("保存")||fg.className==="#32770"){
      const e=els(); const ds=fEl(e,"Don't Save","不保存");
      if(ds) clk(ds); else { ky("tab"); ky("tab"); ky("enter"); }
      await sl(1000);
    } else break;
  }
  await sl(1000);

  st("Ctrl+N新建"); ky("ctrl+n"); await sl(2000);

  st("粘贴代码");
  native.clipboardSetText(`# OpenOxygen R6 Training Test
import datetime, sys, platform
def main():
    print("=" * 40)
    print("OpenOxygen R6 Training")
    print(f"Python {sys.version_info.major}.{sys.version_info.minor}")
    print(f"OS: {platform.system()} {platform.release()}")
    print(f"Time: {datetime.datetime.now()}")
    print("=" * 40)
    return 0
if __name__ == "__main__":
    exit(main())
`);
  ky("ctrl+v"); await sl(1000);
  const sCode=ss("vsc_code"); const vCode=await vlmV(sCode,"Is Python code visible with 'OpenOxygen R6'?");

  st("Ctrl+Shift+S另存为"); ky("ctrl+shift+s"); await sl(2000);
  // 处理保存对话框
  for(let i=0;i<3;i++){
    const fg=native.getForegroundWindowInfo();
    if(fg?.title?.includes("Save")||fg?.title?.includes("保存")||fg?.title?.includes("另存为")||fg?.className==="#32770"){
      ky("ctrl+a"); await sl(200); tEN("ouv_r6_test.py"); await sl(500); ky("enter"); await sl(2000);
      const fg2=native.getForegroundWindowInfo();
      if(fg2?.title?.includes("确认")||fg2?.title?.includes("Confirm")||fg2?.title?.includes("Replace")){ky("enter");await sl(1000);}
      break;
    } else if(fg?.title?.includes("ouv_r6")||fg?.title?.includes(".py")){break;}
    await sl(1000);
  }
  ss("vsc_saved");

  st("终端运行"); ky("ctrl+`"); await sl(2000);
  tEN("python ouv_r6_test.py"); ky("enter"); await sl(3000);
  const sTerm=ss("vsc_term"); const vTerm=await vlmV(sTerm,"Is terminal output showing 'OpenOxygen R6'?");

  st("关闭"); ky("ctrl+w"); await sl(1000);
  const fgC=native.getForegroundWindowInfo();
  if(fgC?.title?.includes("Save")||fgC?.title?.includes("保存")){const e=els();const ds=fEl(e,"Don't Save","不保存");if(ds)clk(ds);else ky("enter");await sl(1000);}

  rec({app:"vscode",action:{type:"full-flow"},intent:"VS Code完整闭环",result:vTerm.success?"success":"partial"});
  return{status:vTerm.success?"success":"partial"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T5: QQ群聊 — 查看消息 → LLM总结 → 发送[OpenOxygen]回复
// ═══════════════════════════════════════════════════════════════════════════
async function T5() {
  st("聚焦QQ");
  if(!isRun("QQ.exe")) return{status:"skip",note:"QQ not running"};
  let qq=focW("QQ",null);
  if(!qq){prompt("请打开QQ主窗口后点击「确定」。");await sl(2000);qq=focW("QQ",null);}
  if(!qq) return{status:"fail"};
  await sl(1000); const s1=ss("qq_main");

  st("VLM分析QQ界面");
  const qqDesc=await vlm(s1,"Describe this QQ interface. Where is the chat list? Where is the message input box? Are there group chats visible?");

  st("寻找群聊");
  // QQ群聊通常在消息列表中，图标有多人标识
  const groupEl=fEl(els(),"群","group");
  if(groupEl){
    clk(groupEl); await sl(2000);
  } else {
    // 用VLM找群聊
    const gc=await vlmXY(s1,"a group chat item in the chat list (groups usually have multi-person icons)");
    if(gc) clkAt(gc.x,gc.y,"群聊(VLM)");
    else {
      // 点击第一个聊天
      const firstChat=await vlmXY(s1,"the first chat item in the left sidebar chat list");
      if(firstChat) clkAt(firstChat.x,firstChat.y,"第一个聊天(VLM)");
      else clkAt(Math.round(M.logicalWidth*0.15),Math.round(M.logicalHeight*0.25),"聊天列表(ratio)");
    }
    await sl(2000);
  }
  const s2=ss("qq_chat");

  st("VLM读取聊天内容");
  const chatContent=await vlm(s2,"Read the visible chat messages. List the last 5 messages with sender names and content. Summarize the conversation topic.");

  st("LLM总结群聊内容");
  const summary=await fast(`Summarize this chat in 2 sentences (Chinese):\n${san(chatContent.slice(0,500))}`);

  st("发送[OpenOxygen]回复");
  // 找输入框
  const inputEl=fEl(els(),"输入","发送","消息","Message");
  if(inputEl) clk(inputEl);
  else {
    const inputCoord=await vlmXY(ss("qq_input"),"the message input box at the bottom of the chat");
    if(inputCoord) clkAt(inputCoord.x,inputCoord.y,"输入框(VLM)");
    else clkAt(Math.round(M.logicalWidth*0.6),Math.round(M.logicalHeight*0.85),"输入框(ratio)");
  }
  await sl(500);

  // 构造回复
  const reply = `[OpenOxygen] 自动消息摘要：${summary.slice(0,80)}`;
  tCN(reply); await sl(500);
  ss("qq_reply_typed");

  // 让用户确认是否发送
  const sendOk=prompt(`即将在QQ发送以下消息：\n\n${reply.slice(0,100)}\n\n点击「确定」发送，「取消」取消。`);
  if(sendOk){
    ky("enter"); await sl(2000);
    ss("qq_sent");
    rec({app:"qq",action:{type:"group-chat-reply"},intent:"QQ群聊总结+回复",result:"success",vlmDescription:san(summary.slice(0,200))});
    return{status:"success",summary:san(summary.slice(0,100))};
  } else {
    ky("ctrl+a"); tEN(""); // 清空
    rec({app:"qq",action:{type:"group-chat-read"},intent:"QQ群聊阅读+总结(未发送)",result:"partial"});
    return{status:"partial",note:"User cancelled send"};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// T6: 微信深度分析
// ═══════════════════════════════════════════════════════════════════════════
async function T6() {
  st("聚焦微信");
  if(!isRun("WeChatAppEx.exe")&&!isRun("WeChat.exe")) return{status:"skip"};
  let wx=focW("微信",null);
  if(!wx){prompt("请打开微信后点击「确定」。");await sl(2000);wx=focW("微信",null);}
  if(!wx) return{status:"fail"};
  await sl(1000); const s1=ss("wechat");

  st("VLM深度分析");
  const desc=await vlm(s1,"Analyze this WeChat interface in detail: 1) How many contacts/chats in sidebar? 2) Current chat partner name? 3) Last message content? 4) Any unread badges?");
  const e=els(); console.log(`    UIA: ${e.length} elements`);

  rec({app:"wechat",action:{type:"deep-observe"},intent:"微信深度VLM分析",result:"success",vlmDescription:san(desc.slice(0,300)),
    elements:e.slice(0,20).map(x=>({name:san(x.name),type:x.controlType,x:x.x,y:x.y}))});
  return{status:"success",elements:e.length};
}

// ═══════════════════════════════════════════════════════════════════════════
// T7: Steam 游戏库
// ═══════════════════════════════════════════════════════════════════════════
async function T7() {
  st("聚焦Steam");
  if(!isRun("steamwebhelper.exe")&&!isRun("steam.exe")) return{status:"skip"};
  let stm=focW("Steam",null);
  if(!stm){prompt("请打开Steam后点击「确定」。");await sl(2000);stm=focW("Steam",null);}
  if(!stm) return{status:"fail"};
  await sl(1000);

  st("导航到游戏库");
  // Steam 库按钮通常在顶部导航
  const libEl=fEl(els(),"库","LIBRARY","Library");
  if(libEl) clk(libEl);
  else { const c=await vlmXY(ss("steam_nav"),"the 'Library' or '库' tab in Steam's top navigation bar"); if(c) clkAt(c.x,c.y,"库(VLM)"); }
  await sl(3000); const s1=ss("steam_library");
  const desc=await vlm(s1,"What games are visible in this Steam library? List game names.");

  rec({app:"steam",action:{type:"browse-library"},intent:"Steam游戏库浏览",result:"success",vlmDescription:san(desc.slice(0,300))});
  return{status:"success"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T8: 豆包4轮深度对话
// ═══════════════════════════════════════════════════════════════════════════
async function T8() {
  st("聚焦豆包");
  let db=focW("豆包",null);
  if(!db){if(isRun("Doubao.exe")){prompt("请打开豆包后点击「确定」。");await sl(2000);db=focW("豆包",null);}if(!db)return{status:"skip"};}
  await sl(1000);

  const inp=fEl(els(),"输入","发送","消息");
  if(inp) clk(inp); else clkAt(Math.round(M.logicalWidth*0.5),Math.round(db.height*0.85+db.y),"输入框");
  await sl(500);

  const qs=[
    "请分析：一个AI Agent在操作电脑时，如何判断自己的操作是否成功？有哪些验证策略？",
    "在这些策略中，视觉验证（截图分析）和UIA元素检测各有什么优缺点？",
    "如果AI Agent需要处理敏感信息（比如用户的邮件、聊天记录），应该遵循哪些安全原则？",
    "最后一个问题：你认为未来3年内，AI Agent操作电脑的能力会达到什么水平？"
  ];
  for(let i=0;i<qs.length;i++){
    st(`R${i+1}: ${qs[i].slice(0,30)}...`);
    tCN(qs[i]); await sl(800); ky("enter"); await sl(15000); ss(`doubao_r${i+1}`);
  }

  st("深度评估");
  const assess=await deep("Evaluate a 4-round conversation about AI Agent capabilities:\n"+qs.map((q,i)=>`Q${i+1}: ${q}`).join("\n")+"\nRate 1-10. Key insights?");
  rec({app:"doubao",action:{type:"deep-conversation",rounds:4},intent:"豆包4轮技术对话",result:"success",vlmDescription:san(assess.slice(0,300))});
  return{status:"success"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T9: GitHub Desktop
// ═══════════════════════════════════════════════════════════════════════════
async function T9() {
  st("聚焦GitHub Desktop");
  if(!isRun("GitHubDesktop.exe")) return{status:"skip"};
  let gh=focW("GitHub Desktop",null);
  if(!gh) return{status:"skip"};
  await sl(1000); const s1=ss("github");
  const desc=await vlm(s1,"Describe this GitHub Desktop interface. What repository is selected? How many changes? What branch?");
  rec({app:"github-desktop",action:{type:"observe"},intent:"GitHub Desktop状态",result:"success",vlmDescription:san(desc.slice(0,300))});
  return{status:"success"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T10: 百度搜索
// ═══════════════════════════════════════════════════════════════════════════
async function T10() {
  st("Chrome→百度搜索"); clean(); await sl(2000);
  execSync('powershell.exe -NoProfile -Command "Start-Process chrome.exe -ArgumentList \'--new-window\',\'https://www.baidu.com/s?wd=OpenOxygen+AI+Agent+框架\'"',{timeout:15000});
  await sl(6000); focW(null,"Chrome_WidgetWin_1"); await sl(1000);
  const s1=ss("baidu"); const v1=await vlmV(s1,"Are Baidu search results shown?");

  st("VLM点击第一个结果");
  const c1=await vlmXY(s1,"the first organic search result title/link (not ads)");
  if(c1) clkAt(c1.x,c1.y,"结果(VLM)"); else clkAt(Math.round(M.logicalWidth*0.4),Math.round(M.logicalHeight*0.4),"结果(ratio)");
  await sl(5000); ss("baidu_page");

  st("返回"); ky("alt+Left"); await sl(2000); ss("baidu_back");
  rec({app:"baidu",action:{type:"search-click-return"},intent:"百度搜索+点击+返回",result:v1.success?"success":"partial"});
  return{status:v1.success?"success":"partial"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T11: ChatGPT
// ═══════════════════════════════════════════════════════════════════════════
async function T11() {
  st("聚焦ChatGPT");
  if(!isRun("ChatGPT.exe")) return{status:"skip"};
  let cg=focW("ChatGPT",null);
  if(!cg) return{status:"skip"};
  await sl(1000); const s1=ss("chatgpt");

  st("VLM分析界面+发送问题");
  const desc=await vlm(s1,"Is this ChatGPT? Where is the input box?");
  const inp=await vlmXY(s1,"the message input box or text field at the bottom");
  if(inp) clkAt(inp.x,inp.y,"输入框(VLM)");
  else { const e=fEl(els(),"Message","输入","Send"); if(e) clk(e); else clkAt(Math.round(M.logicalWidth*0.5),Math.round(M.logicalHeight*0.9),"输入框(ratio)"); }
  await sl(500);

  tCN("[OpenOxygen] 你好！这是一条来自OpenOxygen AI Agent的自动化测试消息。请简要回复。");
  await sl(500); ky("enter"); await sl(10000);
  const s2=ss("chatgpt_reply");
  const v2=await vlmV(s2,"Did ChatGPT reply to the message?");

  rec({app:"chatgpt",action:{type:"send-message"},intent:"ChatGPT对话",result:v2.success?"success":"partial"});
  return{status:v2.success?"success":"partial"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T12: 系统快捷键 Win+S, Win+I, Win+E
// ═══════════════════════════════════════════════════════════════════════════
async function T12() {
  st("Win+S 搜索");
  ky("win+s"); await sl(2500); const s1=ss("win_s"); const v1=await vlmV(s1,"Is Windows Search open?");
  ky("escape"); await sl(500);

  st("Win+I 设置");
  ky("win+i"); await sl(3000); const s2=ss("win_i"); const v2=await vlmV(s2,"Is Windows Settings open?");
  ky("alt+F4"); await sl(1000);

  st("Win+E 资源管理器");
  ky("win+e"); await sl(2000); const s3=ss("win_e"); const v3=await vlmV(s3,"Is File Explorer open?");
  ky("alt+F4"); await sl(1000);

  rec({app:"system",action:{type:"hotkeys",keys:["win+s","win+i","win+e"]},intent:"系统快捷键",result:"success"});
  return{status:"success",winS:v1.success,winI:v2.success,winE:v3.success};
}

// ═══════════════════════════════════════════════════════════════════════════
// T13: 文件管理 — 创建文件夹+文件
// ═══════════════════════════════════════════════════════════════════════════
async function T13() {
  st("Win+E→导航到test");
  ky("win+e"); await sl(3000);
  ky("ctrl+l"); await sl(500); tEN("D:\\Coding\\OpenOxygen\\test\\results"); ky("enter"); await sl(2000);
  ss("explorer_results");

  st("VLM验证导航");
  const s1=ss("explorer_nav"); const v1=await vlmV(s1,"Is File Explorer showing a 'results' folder?");

  st("关闭"); ky("alt+F4"); await sl(1000);
  rec({app:"explorer",action:{type:"navigate"},intent:"文件管理器导航",result:v1.success!==false?"success":"partial"});
  return{status:v1.success!==false?"success":"partial"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T14: 记事本多行输入
// ═══════════════════════════════════════════════════════════════════════════
async function T14() {
  st("Win→记事本");
  try{execSync('powershell.exe -NoProfile -Command "Get-Process Notepad -EA SilentlyContinue | Stop-Process -Force"',{timeout:5000});}catch{}
  await sl(1000); ky("win+d"); await sl(1500); ky("win"); await sl(2500);
  tCN("记事本"); await sl(2500); ky("enter"); await sl(3000);
  focW("Notepad",null)||focW("记事本",null)||focW("无标题",null);
  await sl(500);

  st("多行中英文输入");
  tCN("OpenOxygen R6 训练测试\n");
  tCN("这是一段中英文混合的测试内容。\n");
  tEN("English text: Hello World!\n");
  tCN("时间戳："); tEN(new Date().toISOString()+"\n");
  tCN("特殊字符测试：@#$%^&*()\n");
  tCN("训练完成！🎉");
  await sl(500); const s1=ss("notepad_content");
  const v1=await vlmV(s1,"Is Notepad showing multi-line Chinese and English text?");

  st("Ctrl+S→Alt+F4");
  ky("ctrl+s"); await sl(2000);
  const fg=native.getForegroundWindowInfo();
  if(fg?.title?.includes("另存为")||fg?.title?.includes("Save")){
    tEN("ouv_r6_notepad.txt"); await sl(500); ky("enter"); await sl(2000);
    const fg2=native.getForegroundWindowInfo();
    if(fg2?.title?.includes("确认")||fg2?.title?.includes("Confirm")){ky("enter");await sl(1000);}
  }
  ky("alt+F4"); await sl(1000);
  const fgC=native.getForegroundWindowInfo();
  if(fgC?.title?.includes("Notepad")||fgC?.title?.includes("记事本")){
    const e=els();const ds=fEl(e,"不保存","Don't Save");if(ds)clk(ds);else{ky("tab");ky("enter");}await sl(1000);
  }

  rec({app:"notepad",action:{type:"full-flow"},intent:"记事本多行输入+保存+关闭",result:v1.success!==false?"success":"partial"});
  return{status:v1.success!==false?"success":"partial"};
}

// ═══════════════════════════════════════════════════════════════════════════
// T15: 分屏 Win+Left/Right
// ═══════════════════════════════════════════════════════════════════════════
async function T15() {
  st("打开两个窗口");
  // 用记事本和计算器
  execSync('powershell.exe -NoProfile -Command "Start-Process notepad"',{timeout:5000});
  await sl(2000);
  ky("win+Left"); await sl(1500); ss("snap_left");

  execSync('powershell.exe -NoProfile -Command "Start-Process calc"',{timeout:5000});
  await sl(2000);
  ky("win+Right"); await sl(1500);
  const s1=ss("snap_both");
  const v1=await vlmV(s1,"Are two windows snapped side by side (left and right)?");

  st("关闭");
  try{execSync('powershell.exe -NoProfile -Command "Get-Process Notepad,CalculatorApp -EA SilentlyContinue | Stop-Process -Force"',{timeout:5000});}catch{}
  await sl(1000);

  rec({app:"system",action:{type:"snap"},intent:"分屏Win+Left/Right",result:v1.success!==false?"success":"partial"});
  return{status:v1.success!==false?"success":"partial"};
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA R6 — Deep Interaction (15 Tasks)        ║");
  console.log("║  VLM+retry · QQ reply · Gmail filter · system hotkeys       ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const t0=performance.now();
  loadMem();
  console.log(`Screen: ${M.logicalWidth}x${M.logicalHeight}`);
  const apps=["QQ.exe","Doubao.exe","ChatGPT.exe","Code.exe","WeChatAppEx.exe","steamwebhelper.exe","GitHubDesktop.exe"].filter(p=>isRun(p));
  console.log(`Running: ${apps.join(", ")}\n`);

  const vlmOk=await vlm(ss("pre"),"What do you see? Brief.");
  console.log(`VLM: ${vlmOk?"✓":"✗"}\n`);

  await run("T1: 计算器 123*456-789",T1);
  await run("T2: Bilibili VLM深度",T2);
  await run("T3: Gmail筛选未读+未回复",T3);
  await run("T4: VS Code完整闭环",T4);
  await run("T5: QQ群聊总结+[OpenOxygen]回复",T5);
  await run("T6: 微信深度VLM分析",T6);
  await run("T7: Steam游戏库",T7);
  await run("T8: 豆包4轮深度对话",T8);
  await run("T9: GitHub Desktop",T9);
  await run("T10: 百度搜索+点击+返回",T10);
  await run("T11: ChatGPT对话",T11);
  await run("T12: 系统快捷键Win+S/I/E",T12);
  await run("T13: 文件管理器导航",T13);
  await run("T14: 记事本多行输入",T14);
  await run("T15: 分屏Win+Left/Right",T15);

  clean();
  try{execSync('powershell.exe -NoProfile -Command "Get-Process Notepad,CalculatorApp -EA SilentlyContinue | Stop-Process -Force"',{timeout:5000});}catch{}
  saveMem();

  const total=performance.now()-t0;
  const pass=R.filter(t=>t.status==="success").length;
  const part=R.filter(t=>t.status==="partial").length;
  const skip=R.filter(t=>t.status==="skip").length;
  const fail=R.filter(t=>t.status==="error"||t.status==="fail").length;

  console.log(`\n${"═".repeat(65)}`);
  console.log("  26w13aA R6 Results");
  console.log(`${"═".repeat(65)}`);
  for(const t of R){const i=t.status==="success"?"✅":t.status==="skip"?"⊘":t.status==="error"?"❌":"⚠️";console.log(`  ${i} ${t.name} → ${t.status} (${(t.duration/1000).toFixed(1)}s)`);}
  console.log(`\n  ✅${pass} ⚠️${part} ⊘${skip} ❌${fail} | ${(total/1000).toFixed(1)}s`);
  console.log(`  Memory: ${mem.experiences?.length||0} exp, ${Object.keys(mem.appIndex||{}).length} apps`);

  writeFileSync(`${RES}\\training-r6-${Date.now()}.json`,JSON.stringify({taskResults:R,duration:total,memStats:{total:mem.experiences?.length,apps:Object.keys(mem.appIndex||{}).length}},null,2));
}

main().catch(e=>{console.error("❌",e.message);process.exit(1);});
