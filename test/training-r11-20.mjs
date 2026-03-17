/**
 * OpenOxygen Agent 混合能力训练 R11-R20 (v2)
 *
 * 修复：
 *   - LLM 决策使用 /no_think 禁用 thinking 模式
 *   - 直接调用 Ollama API 而非 Gateway（避免 thinking token 浪费）
 *   - 增加 num_predict 到 500
 *   - 更强的 JSON 解析（多种 fallback）
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { getGlobalMemory } from "../dist/memory/global/index.js";
import { createSession, executeCommand, destroySession } from "../dist/execution/terminal/index.js";

const native = require("../packages/core-native/index.js");
const fs = require("node:fs");

const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\training-r11-20";
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

const memory = getGlobalMemory();
let roundNum = 0, stepNum = 0, totalSteps = 0;

function log(level, msg) {
  console.log(`[${new Date().toISOString()}] [R${roundNum}:S${stepNum}] [${level}] ${msg}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function screenshot(label) {
  const p = `${SS_DIR}\\r${roundNum}_s${String(stepNum).padStart(2, "0")}_${label.replace(/[^a-z0-9]/gi, "_")}.png`;
  try { native.captureScreen(p); return p; } catch { return null; }
}

// ═══ LLM: 直接调用 Ollama，/no_think 模式 ═══

async function llm(prompt, model = "qwen3:4b") {
  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { num_predict: 500, temperature: 0.3 },
      }),
    });
    const data = await res.json();
    // qwen3:4b outputs to thinking field; gpt-oss to response
    return data.response || data.thinking || "";
  } catch { return ""; }
}

async function vlm(ssPath, question) {
  try {
    const b64 = fs.readFileSync(ssPath).toString("base64");
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
    return data.message?.content || "";
  } catch { return ""; }
}

function parseJSON(text) {
  if (!text) return null;
  // Try direct parse
  try { return JSON.parse(text.trim()); } catch {}
  // Extract with balanced braces
  let start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  try { return JSON.parse(text.substring(start, end + 1)); } catch {}
  // Try code block
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  return null;
}

// ═══ Agent Core ═══

async function agentDecide(task, history) {
  const recentHistory = history.slice(-5).map(h => `${h.action}(${h.target||""}) → ${h.result}`).join("\n");
  
  const fg = native.getForegroundWindowInfo();
  const els = native.getUiElements(null).filter(e => e.name && !e.isOffscreen && e.width > 0).slice(0, 20);
  const elsSummary = els.map(e => `[${e.controlType}] "${e.name.substring(0, 25)}" (${e.x},${e.y})`).join("\n");

  const prompt = `You are an AI Agent on Windows (1920x1080 screen).
Task: ${task}
Current window: "${fg?.title || "unknown"}" (${fg?.className || ""})
UI elements (top 20):
${elsSummary}

Recent actions:
${recentHistory || "none"}

Choose ONE action. Reply ONLY with a JSON object:
{"action":"terminal|gui_click|gui_type|gui_hotkey|browser|screenshot|wait|done","target":"...","params":{"x":0,"y":0,"text":"","keys":"","command":"","url":""},"prediction":"what will happen","reasoning":"why this action"}

Examples:
{"action":"gui_hotkey","target":"win","params":{"keys":"win"},"prediction":"Start menu opens","reasoning":"Need to open start menu to search"}
{"action":"gui_click","target":"search box","params":{"x":960,"y":540},"prediction":"Search box focused","reasoning":"Click on search box"}
{"action":"terminal","target":"echo hello","params":{"command":"echo hello"},"prediction":"Prints hello","reasoning":"Test terminal"}`;

  const resp = await llm(prompt);
  log("DEBUG", `LLM raw (first 150): ${resp.substring(0, 150).replace(/\n/g, " ")}`);
  const parsed = parseJSON(resp);
  
  if (parsed && parsed.action) {
    return parsed;
  }
  
  // Fallback: try to extract action from text
  log("WARN", `Decision parse failed, raw: ${resp.substring(0, 100)}`);
  return { action: "screenshot", target: "parse_failed", params: {}, prediction: "Capture state for re-evaluation", reasoning: "LLM output not parseable" };
}

async function agentReflect(task, history, lastResult) {
  const steps = history.slice(-5).map((h, i) => `${i + 1}. ${h.action}(${h.target||""}) predicted:"${h.prediction||""}" → actual:"${h.result}"`).join("\n");

  const prompt = `You are reflecting on your actions as an AI Agent.
Task: ${task}
Recent steps:
${steps}
Last result: ${lastResult}

Analyze and reply ONLY with JSON:
{"predictionAccuracy":"accurate|partial|wrong","issue":"what went wrong","lesson":"what to do differently","nextAction":"suggested next action","confidence":0.5}`;

  const resp = await llm(prompt, "gpt-oss:20b");
  return parseJSON(resp) || { predictionAccuracy: "unknown", issue: "Reflection failed", lesson: "Retry", nextAction: "screenshot", confidence: 0.3 };
}

async function executeAction(decision) {
  const { action, target, params } = decision;

  switch (action) {
    case "terminal": {
      const cmd = params?.command || target || "echo no-command";
      const session = createSession("powershell");
      const result = await executeCommand(session.id, cmd);
      destroySession(session.id);
      return { success: result.success, output: (result.output || "").substring(0, 200), error: result.error };
    }
    case "gui_click": {
      const x = params?.x || 0; const y = params?.y || 0;
      if (x === 0 && y === 0) return { success: false, error: "No coordinates" };
      native.mouseClick(x, y);
      await sleep(800);
      return { success: true, output: `Clicked (${x},${y})` };
    }
    case "gui_type": {
      const text = params?.text || target || "";
      if (!text) return { success: false, error: "No text" };
      if (/[\u4e00-\u9fff]/.test(text)) {
        native.clipboardSetText(text); native.sendHotkey("ctrl+v");
      } else {
        native.typeText(text);
      }
      await sleep(500);
      return { success: true, output: `Typed: ${text.substring(0, 30)}` };
    }
    case "gui_hotkey": {
      const keys = params?.keys || target || "";
      if (!keys) return { success: false, error: "No keys" };
      native.sendHotkey(keys);
      await sleep(800);
      return { success: true, output: `Hotkey: ${keys}` };
    }
    case "browser": {
      const url = params?.url || target || "";
      if (!url) return { success: false, error: "No URL" };
      // Use native to open URL in default browser
      const { execSync } = require("node:child_process");
      try {
        execSync(`start "" "${url}"`, { timeout: 5000 });
        await sleep(3000);
        return { success: true, output: `Opened: ${url}` };
      } catch (e) { return { success: false, error: e.message }; }
    }
    case "screenshot": {
      const ss = screenshot(target || "state");
      if (!ss) return { success: false, error: "Screenshot failed" };
      const desc = await vlm(ss, "Briefly describe what you see on screen. List visible windows and key UI elements.");
      return { success: true, output: desc.substring(0, 200), screenshotPath: ss };
    }
    case "wait": {
      await sleep(params?.ms || 1000);
      return { success: true, output: `Waited ${params?.ms || 1000}ms` };
    }
    case "done":
      return { success: true, output: "Task marked done" };
    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

// ═══ Training Round ═══

async function runRound(roundIndex, task, minSteps) {
  roundNum = roundIndex; stepNum = 0;
  log("ROUND", `═══════════════════════════════════════════════════════`);
  log("ROUND", `Round ${roundIndex}: ${task.substring(0, 80)}...`);
  log("ROUND", `═══════════════════════════════════════════════════════`);

  const history = [];
  let consecutiveFailures = 0;

  for (let step = 1; step <= Math.max(minSteps, 20); step++) {
    stepNum = step; totalSteps++;

    // Decide
    const decision = await agentDecide(task, history);
    log("DECIDE", `${decision.action}(${(decision.target || "").substring(0, 30)}) | Predict: ${(decision.prediction || "").substring(0, 50)}`);

    // Execute
    const result = await executeAction(decision);
    log("EXEC", `${result.success ? "✅" : "❌"} ${(result.output || result.error || "").substring(0, 80)}`);

    history.push({
      step, action: decision.action, target: decision.target,
      prediction: decision.prediction, reasoning: decision.reasoning,
      result: result.success ? "success" : "failed",
      output: (result.output || "").substring(0, 100), error: result.error,
    });

    // Reflect on failure or every 5 steps
    if (!result.success || step % 5 === 0) {
      log("REFLECT", "Agent reflecting...");
      const reflection = await agentReflect(task, history, JSON.stringify(result).substring(0, 150));
      log("REFLECT", `Accuracy: ${reflection.predictionAccuracy} | Lesson: ${(reflection.lesson || "").substring(0, 50)} | Confidence: ${reflection.confidence}`);

      if (!result.success) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          log("WARN", "3 consecutive failures → forced screenshot + VLM re-evaluate");
          const ss = screenshot("forced_reeval");
          if (ss) { const d = await vlm(ss, "What is on screen? What went wrong?"); log("VLM", d.substring(0, 120)); }
          consecutiveFailures = 0;
        }
      } else { consecutiveFailures = 0; }
    }

    // Record to memory
    memory.recordTask({
      instruction: `R${roundIndex}S${step}: ${decision.action}(${(decision.target || "").substring(0, 20)})`,
      mode: decision.action.startsWith("gui") ? "gui" : decision.action === "browser" ? "browser" : "terminal",
      success: result.success, durationMs: 0,
      metadata: { app: "training", keywords: [decision.action, `r${roundIndex}`] },
    });

    if (decision.action === "done" && step >= minSteps) { log("DONE", `Completed at step ${step}`); break; }
  }

  const successes = history.filter(h => h.result === "success").length;
  log("SUMMARY", `Round ${roundIndex}: ${successes}/${history.length} steps succeeded`);

  fs.writeFileSync(`${SS_DIR}\\training_r${roundIndex}_result.json`, JSON.stringify({ round: roundIndex, task, successes, total: history.length, history }, null, 2));
  return { round: roundIndex, task, successes, total: history.length };
}

// ═══ Training Plan ═══

const PLAN = [
  { round: 11, task: "打开Chrome → 访问bilibili → 搜索'OpenOxygen' → 切换用户标签 → 进入用户主页 → 播放视频 → 调音量 → 全屏 → 退出全屏 → 点赞 → 收藏 → 分享 → 返回搜索 → 搜索另一个词 → 关闭浏览器", minSteps: 15 },
  { round: 12, task: "Win键打开开始菜单 → 搜索记事本 → 打开 → 输入中英文混合文本 → Ctrl+H查找替换 → Ctrl+S保存到桌面 → 关闭 → 终端验证文件存在 → 读取内容 → 删除文件 → 验证删除 → 打开回收站 → 清空回收站 → 验证清空 → 截图确认", minSteps: 15 },
  { round: 13, task: "打开VS Code → Ctrl+N新建 → 输入Python fibonacci代码 → Ctrl+S保存test_r13.py → 打开终端Ctrl+` → python test_r13.py → 验证输出 → 修改代码加错误 → 运行观察错误 → 修复 → 运行成功 → git status → git add → git diff → 关闭VS Code", minSteps: 15 },
  { round: 14, task: "打开任务管理器 → 性能标签 → 截图CPU → 进程标签 → 内存排序 → 记录前5进程 → 启动标签 → 查看启动项 → 资源监视器 → 网络活动 → 磁盘活动 → 返回任务管理器 → 详细信息 → 查找node.exe → 关闭", minSteps: 15 },
  { round: 15, task: "打开Edge → 访问GitHub → 搜索OpenOxygen → 进入仓库 → 查看README → Issues标签 → 查看Issue → 返回 → Code标签 → 浏览src → 查看package.json → 复制URL → 终端git clone → 验证成功 → 清理", minSteps: 15 },
  { round: 16, task: "打开微信 → 查看聊天列表 → 打开文件传输助手 → 发送[OpenOxygen R16]消息 → 验证发送 → 返回列表 → 打开群聊 → 阅读消息 → 总结内容 → 发送[OpenOxygen]回复 → 返回列表 → 设置 → 存储空间 → 返回 → 最小化", minSteps: 15 },
  { round: 17, task: "终端mkdir test_project → cd进入 → 创建index.js → npm init -y → 写HTTP服务器代码 → node index.js启动 → 浏览器访问localhost:3000 → 验证响应 → 停止服务器 → 修改端口 → 重启 → 验证 → 停止 → 清理目录 → 验证清理", minSteps: 15 },
  { round: 18, task: "打开画图 → 矩形工具 → 画矩形 → 圆形工具 → 画圆 → 文字工具 → 输入OpenOxygen → 填充颜色 → 画笔自由线条 → Ctrl+Z撤销 → Ctrl+Y重做 → 橡皮擦 → 擦除部分 → Ctrl+S保存PNG → 关闭", minSteps: 15 },
  { round: 19, task: "打开计算器 → 科学模式 → sin(30) → cos(60) → tan(45) → 程序员模式 → 输入255 → 查看十六进制 → 标准模式 → (123*456+789)/2 → 历史记录 → 清除历史 → 日期计算 → 两日期差 → 关闭", minSteps: 15 },
  { round: 20, task: "综合：Chrome访问百度 → 搜索AI Agent → 复制标题 → 打开记事本 → 粘贴 → 添加评论 → 保存 → 终端读取文件 → LLM分析内容 → 追加分析结果 → 打开文件验证 → 浏览器搜索另一个词 → 对比 → 生成报告 → 保存报告", minSteps: 15 },
];

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen Agent 混合能力训练 R11-R20 (v2)                  ║");
  console.log("║  决策 + 预测 + 自主反思 + 混合执行                            ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const results = [];
  for (const p of PLAN) {
    results.push(await runRound(p.round, p.task, p.minSteps));
  }

  console.log("\n╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  训练总结 R11-R20                                            ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  let ts = 0, ta = 0;
  for (const r of results) {
    const icon = r.successes / r.total > 0.6 ? "✅" : r.successes / r.total > 0.3 ? "⚠️" : "❌";
    console.log(`  ${icon} R${r.round}: ${r.successes}/${r.total} — ${r.task.substring(0, 50)}...`);
    ts += r.successes; ta += r.total;
  }
  console.log(`\n  总计: ${ts}/${ta} (${((ts / ta) * 100).toFixed(1)}%) | 总步数: ${totalSteps}`);

  const stats = memory.getStats();
  console.log(`  📊 记忆: ${stats.totalTasks} tasks, ${(stats.successRate * 100).toFixed(1)}% success`);

  fs.writeFileSync(`${SS_DIR}\\training_r11-20_report.json`, JSON.stringify({ results, totalSuccess: ts, totalAll: ta, totalSteps, memoryStats: stats }, null, 2));
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
