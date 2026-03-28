/**
 * OpenOxygen Agent 训练 R13-R20 v3
 *
 * 修复：
 *   1. 单步硬超时 45s（含LLM调用）
 *   2. 决策prompt极简化（<300 token）
 *   3. 反思仅在连续失败3次时触发（不每5步触发）
 *   4. VLM调用移除（太慢，用UIA替代）
 *   5. 每轮最多15步，不重试
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { getGlobalMemory } from "../dist/memory/global/index.js";
import { createSession, executeCommand, destroySession } from "../dist/execution/terminal/index.js";

const native = require("../packages/core-native/index.js");
const fs = require("node:fs");

const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\training-r13-20-v3";
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

const memory = getGlobalMemory();
let roundNum = 0, stepNum = 0, totalSteps = 0;

function log(level, msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] [R${roundNum}:S${stepNum}] [${level}] ${msg}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function screenshot(label) {
  const p = `${SS_DIR}\\r${roundNum}_s${String(stepNum).padStart(2, "0")}_${label.replace(/[^a-z0-9]/gi, "_")}.png`;
  try { native.captureScreen(p); return p; } catch { return null; }
}

// ═══ LLM: 单次调用硬超时 20s ═══

async function llmJSON(prompt, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3:4b",
        prompt,
        stream: false,
        format: "json",
        options: { num_predict: 200, temperature: 0.3 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    const text = data.response || data.thinking || "";

    // Balanced brace extraction
    const s = text.indexOf("{");
    if (s < 0) return null;
    let d = 0, e = -1;
    for (let i = s; i < text.length; i++) {
      if (text.charAt(i) === "{") d++;
      if (text.charAt(i) === "}") { d--; if (d === 0) { e = i; break; } }
    }
    if (e < 0) return null;
    try { return JSON.parse(text.substring(s, e + 1)); } catch { return null; }
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ═══ Agent Decision: 极简 prompt ═══

async function decide(task, history) {
  const fg = native.getForegroundWindowInfo();
  const els = native.getUiElements(null)
    .filter(e => e.name && !e.isOffscreen && e.width > 0)
    .slice(0, 8);
  
  // Build a natural-language hint about what to do next
  const hist = history.slice(-2).map(h => `${h.a}(${(h.t || "").substring(0, 10)})→${h.ok ? "ok" : "fail"}`).join(", ");
  const elStr = els.map(e => `${e.name.substring(0, 12)}(${e.x},${e.y})`).join(", ");
  
  // Strategy F: Direct instruction + filled example
  // Pick the most likely first element as default target
  const firstClickable = els.find(e => e.controlType === "Button" || e.controlType === "Edit" || e.controlType === "ListItem");
  const defaultTarget = firstClickable ? firstClickable.name.substring(0, 15) : "target";
  const defaultX = firstClickable ? firstClickable.x : 960;
  const defaultY = firstClickable ? firstClickable.y : 540;

  const prompt = `I need to: ${task.substring(0, 100)}. Window: "${(fg?.title || "?").substring(0, 20)}". Elements: ${elStr.substring(0, 250)}. Previous: ${hist || "none"}.
I should interact with "${defaultTarget}" at (${defaultX},${defaultY}).
{"action":"click","target":"${defaultTarget}","x":${defaultX},"y":${defaultY},"reason":"next step of the task"}`;

  const d = await llmJSON(prompt);
  if (d && d.action) {
    // Validate action is a single word
    const validActions = ["click", "type", "hotkey", "cmd", "done"];
    if (!validActions.includes(d.action)) {
      // Try to extract first valid action
      for (const va of validActions) {
        if ((d.action || "").toLowerCase().includes(va)) {
          d.action = va;
          break;
        }
      }
    }
    return d;
  }
  return null;
}

// ═══ Agent Reflect: 极简 ═══

async function reflect(task, history) {
  const last3 = history.slice(-3).map(h => `${h.a}(${(h.t || "").substring(0, 10)})→${h.ok ? "ok" : "fail"}`).join(", ");
  const prompt = `Tried: ${last3}. Task: ${task.substring(0, 80)}. What went wrong? JSON: {"issue":"problem","fix":"solution","next":"action"}`;
  return await llmJSON(prompt, 15000);
}

// ═══ Execute Action ═══

async function exec(d) {
  const a = d.action || d.a || "";
  let x = parseInt(d.x) || 0;
  let y = parseInt(d.y) || 0;
  const text = d.text || "";
  const keys = d.keys || "";
  const cmd = d.cmd || d.command || "";
  const target = d.target || d.t || "";

  // If click has no coords but has target name, look up from UIA
  if (a === "click" && x === 0 && y === 0 && target) {
    try {
      const els = native.getUiElements(null).filter(e => e.name && !e.isOffscreen && e.width > 0);
      const targetLower = target.toLowerCase().substring(0, 8);
      const match = els.find(e => e.name.toLowerCase().includes(targetLower) || targetLower.includes(e.name.toLowerCase().substring(0, 8)));
      if (match && typeof match.x === "number" && typeof match.y === "number") {
        x = Math.round(match.x + (match.width || 20) / 2);
        y = Math.round(match.y + (match.height || 20) / 2);
        log("RESOLVE", `"${target}" → "${match.name.substring(0, 15)}" at (${x},${y})`);
      } else {
        log("WARN", `"${target}" not found in UIA`);
      }
    } catch (uiaErr) {
      log("WARN", `UIA lookup error: ${uiaErr.message.substring(0, 30)}`);
    }
  }

  try {
    switch (a) {
      case "click":
        if (x === 0 && y === 0) return { ok: false, out: `no coords for "${target}"` };
        try {
          native.mouseClick(x, y, "left");
        } catch (clickErr) {
          return { ok: false, out: `mouseClick error: ${clickErr.message.substring(0, 40)}` };
        }
        await sleep(600);
        return { ok: true, out: `click(${x},${y}) "${target}"` };

      case "type": {
        const typeText = text || target || "";
        if (!typeText) return { ok: false, out: "no text" };
        if (/[\u4e00-\u9fff]/.test(typeText)) {
          native.clipboardSetText(typeText);
          native.sendHotkey("ctrl+v");
        } else {
          native.typeText(typeText);
        }
        await sleep(400);
        return { ok: true, out: `type(${typeText.substring(0, 20)})` };
      }

      case "hotkey": {
        const hk = keys || target || "";
        if (!hk) return { ok: false, out: "no keys" };
        native.sendHotkey(hk);
        await sleep(600);
        return { ok: true, out: `hotkey(${hk})` };
      }

      case "cmd": {
        const command = cmd || target || "";
        if (!command) return { ok: false, out: "no cmd" };
        const session = createSession("powershell");
        const result = await executeCommand(session.id, command);
        destroySession(session.id);
        return { ok: result.success, out: (result.output || result.error || "").substring(0, 60) };
      }

      case "done":
        return { ok: true, out: "done" };

      default:
        return { ok: false, out: `unknown: ${a}` };
    }
  } catch (e) {
    return { ok: false, out: e.message.substring(0, 40) };
  }
}

// ═══ Training Round ═══

async function runRound(rn, task) {
  roundNum = rn;
  stepNum = 0;
  log("ROUND", `══════════════════════════════════════════`);
  log("ROUND", `R${rn}: ${task.substring(0, 60)}...`);
  log("ROUND", `══════════════════════════════════════════`);

  const history = [];
  let consecutiveFails = 0;

  for (let step = 1; step <= 15; step++) {
    stepNum = step;
    totalSteps++;

    // Hard timeout per step: 45s
    const stepResult = await Promise.race([
      (async () => {
        // Decide
        const d = await decide(task, history);
        if (!d) {
          log("WARN", "LLM returned null → screenshot fallback");
          screenshot("null_decision");
          return { a: "screenshot", t: "", ok: true, out: "fallback" };
        }

        log("DECIDE", `${d.action}(${(d.target || "").substring(0, 15)}) x=${d.x || 0} y=${d.y || 0} keys=${d.keys || ""} | ${(d.reason || "").substring(0, 35)}`);

        // Execute
        const r = await exec(d);
        log("EXEC", `${r.ok ? "✅" : "❌"} ${r.out}`);

        return { a: d.action, t: d.target || "", ok: r.ok, out: r.out, prediction: d.reason || "" };
      })(),
      sleep(45000).then(() => {
        log("TIMEOUT", "Step timeout 45s");
        return { a: "timeout", t: "", ok: false, out: "step timeout" };
      }),
    ]);

    history.push(stepResult);

    // Reflect only on 3 consecutive failures
    if (!stepResult.ok) {
      consecutiveFails++;
      if (consecutiveFails >= 3) {
        log("REFLECT", "3 fails → reflecting...");
        const ref = await Promise.race([
          reflect(task, history),
          sleep(15000).then(() => null),
        ]);
        if (ref) {
          log("REFLECT", `Issue: ${(ref.issue || "").substring(0, 40)} | Fix: ${(ref.fix || "").substring(0, 40)}`);
        }
        consecutiveFails = 0;
        screenshot("after_reflect");
      }
    } else {
      consecutiveFails = 0;
    }

    // Record to memory
    memory.recordTask({
      instruction: `R${rn}S${step}: ${stepResult.a}(${(stepResult.t || "").substring(0, 15)})`,
      mode: stepResult.a === "cmd" ? "terminal" : "gui",
      success: stepResult.ok,
      durationMs: 0,
      metadata: { app: "training-v3", keywords: [stepResult.a, `r${rn}`] },
    });

    if (stepResult.a === "done") {
      log("DONE", `Completed at step ${step}`);
      break;
    }
  }

  const real = history.filter(h => h.a !== "screenshot" && h.a !== "timeout" && h.a !== "null_decision");
  const realOk = real.filter(h => h.ok).length;
  log("SUMMARY", `R${rn}: ${realOk}/${real.length} real actions succeeded (${history.length} total steps)`);

  fs.writeFileSync(`${SS_DIR}\\r${rn}_result.json`, JSON.stringify({
    round: rn, task, total: history.length,
    realActions: real.length, realSuccess: realOk,
    history,
  }, null, 2));

  return { round: rn, real: real.length, realOk, total: history.length };
}

// ═══ Plan ═══

const PLAN = [
  { r: 13, task: "打开VS Code → Ctrl+N新建 → 输入Python代码 → Ctrl+S保存 → 打开终端 → 运行代码 → 验证输出 → 关闭" },
  { r: 14, task: "打开任务管理器 → 性能标签 → 进程标签 → 内存排序 → 记录前5进程 → 关闭" },
  { r: 15, task: "打开Edge → 访问GitHub → 搜索OpenOxygen → 查看README → 返回 → 关闭" },
  { r: 16, task: "打开微信 → 打开文件传输助手 → 发送[OpenOxygen R16]消息 → 返回 → 最小化" },
  { r: 17, task: "终端创建test_project文件夹 → 创建index.js → npm init -y → 验证 → 清理" },
  { r: 18, task: "打开画图 → 画矩形 → 输入文字OpenOxygen → Ctrl+S保存 → 关闭" },
  { r: 19, task: "打开计算器 → 科学模式 → sin(30) → 标准模式 → 123*456 → 关闭" },
  { r: 20, task: "Chrome访问百度 → 搜索AI Agent → 打开记事本 → 粘贴标题 → 保存 → 关闭" },
];

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen Agent Training R13-R20 v3 (4B optimized)        ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const results = [];
  for (const p of PLAN) {
    results.push(await runRound(p.r, p.task));
  }

  console.log("\n╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  训练总结 R13-R20 v3                                         ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  let tr = 0, tok = 0;
  for (const r of results) {
    const pct = r.real > 0 ? ((r.realOk / r.real) * 100).toFixed(0) : "0";
    const icon = r.real > 5 ? "✅" : r.real > 2 ? "⚠️" : "❌";
    console.log(`  ${icon} R${r.round}: ${r.realOk}/${r.real} real actions (${r.total} steps, ${pct}% success)`);
    tr += r.real;
    tok += r.realOk;
  }

  const overallPct = tr > 0 ? ((tok / tr) * 100).toFixed(1) : "0";
  console.log(`\n  总计: ${tok}/${tr} real actions (${overallPct}%) | 总步数: ${totalSteps}`);

  fs.writeFileSync(`${SS_DIR}\\report.json`, JSON.stringify({ results, totalReal: tr, totalRealOk: tok, totalSteps }, null, 2));
  console.log(`\n  报告: ${SS_DIR}\\report.json`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
