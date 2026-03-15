/**
 * OpenOxygen — 26w13aA P2: Software Compatibility Test
 *
 * 模式：脚本化流程 + UIA 元素检测 + LLM 关键决策辅助
 * 参照 real-agent-task.mjs 的成功模式
 *
 * 测试矩阵：
 *   - Microsoft Office (Word, Excel, PowerPoint)
 *   - VS Code
 *   - 微信 / QQ (如果已安装)
 *   - Steam / 网易云音乐 (如果已安装)
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const GATEWAY = "http://127.0.0.1:4800";
const SS_DIR = "D:\\Coding\\OpenOxygen\\.state\\26w13a-p2";
const RESULTS_DIR = "D:\\Coding\\OpenOxygen\\test\\results";

if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════════════
// Utilities (same pattern as P1)
// ═══════════════════════════════════════════════════════════════════════════

let stepCount = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function step(name) {
  stepCount++;
  console.log(`\n[Step ${stepCount}] ${name}`);
}

function screenshot(label) {
  const path = `${SS_DIR}\\step${stepCount}_${label}.png`;
  try {
    const r = native.captureScreen(path);
    console.log(`    📸 ${label} (${r.durationMs?.toFixed(0) || "?"}ms)`);
    return path;
  } catch (e) { console.log(`    ⚠ SS fail: ${e.message}`); return null; }
}

function getUIElements() {
  try {
    return native.getUiElements(null).filter(e => e.name && !e.isOffscreen && e.width > 0 && e.height > 0);
  } catch { return []; }
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

function pressKey(keys) {
  console.log(`    ⌨️ Key: ${keys}`);
  native.sendHotkey(keys);
}

function typeText(text) {
  console.log(`    ⌨️ Type: "${text}"`);
  native.typeText(text);
}

async function askLLM(question) {
  try {
    const res = await fetch(`${GATEWAY}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a Windows automation assistant. Be extremely brief." },
          { role: "user", content: question },
        ],
        mode: "fast",
      }),
    });
    const data = await res.json();
    console.log(`    🧠 LLM: ${data.content?.slice(0, 100)}`);
    return data.content || "";
  } catch (e) { console.log(`    ⚠ LLM err: ${e.message}`); return ""; }
}

// ═══════════════════════════════════════════════════════════════════════════
// Software helpers
// ═══════════════════════════════════════════════════════════════════════════

function isInstalled(exeName) {
  try {
    const result = execSync(
      `powershell.exe -NoProfile -Command "(Get-Process '${exeName}' -EA SilentlyContinue) -ne $null -or (Get-Command '${exeName}' -EA SilentlyContinue) -ne $null"`,
      { timeout: 5000 }
    ).toString().trim();
    return result === "True";
  } catch { return false; }
}

function launchApp(command, waitMs = 5000) {
  try {
    execSync(`powershell.exe -NoProfile -Command "${command}"`, { timeout: 15000 });
    console.log(`    ✅ Launch command sent`);
    return true;
  } catch (e) {
    console.log(`    ❌ Launch failed: ${e.message.slice(0, 100)}`);
    return false;
  }
}

function closeApp(processName) {
  try {
    execSync(`powershell.exe -NoProfile -Command "Get-Process '${processName}' -EA SilentlyContinue | Stop-Process -Force"`, { timeout: 10000 });
    console.log(`    ✅ ${processName} closed`);
  } catch { console.log(`    ℹ ${processName} was not running`); }
}

function focusWindowByTitle(titlePart) {
  const wins = native.listWindows();
  const found = wins.find(w => w.visible && w.title && w.title.includes(titlePart) && w.width > 100);
  if (found) {
    native.focusWindow(found.hwnd);
    console.log(`    🪟 Focused: "${found.title.slice(0, 60)}"`);
    return found;
  }
  console.log(`    ⚠ Window with "${titlePart}" not found`);
  return null;
}

const results = { version: "26w13aA-P2", tests: [], startedAt: Date.now() };

function recordTest(app, status, details = {}) {
  results.tests.push({ app, status, details, step: stepCount, time: Date.now() });
  const icon = status === "pass" ? "✅" : status === "partial" ? "⚠️" : status === "skip" ? "⊘" : "❌";
  console.log(`    ${icon} Result: ${app} → ${status}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  OpenOxygen 26w13aA — P2: Software Compatibility Test       ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝\n");

  const taskStart = performance.now();
  const metrics = native.getScreenMetrics();
  console.log(`Screen: ${metrics.logicalWidth}x${metrics.logicalHeight}`);

  // ─── Notepad (baseline test — always available) ───────────────
  step("Notepad: Launch, type, UIA detection");
  launchApp("Start-Process notepad.exe");
  await sleep(3000);
  {
    const win = focusWindowByTitle("记事本") || focusWindowByTitle("Notepad") || focusWindowByTitle("无标题");
    await sleep(500);
    screenshot("notepad_launched");

    if (win) {
      typeText("Hello from OpenOxygen 26w13aA!");
      await sleep(500);
      screenshot("notepad_typed");

      const elements = getUIElements();
      console.log(`    UIA elements: ${elements.length}`);
      const editBox = findElement(elements, "文本编辑器", "Text Editor", "Edit");
      console.log(`    Edit control found: ${!!editBox}`);

      recordTest("Notepad", "pass", { uiaCount: elements.length, hasEditBox: !!editBox });

      // Close without saving
      pressKey("alt+F4");
      await sleep(500);
      pressKey("tab"); // Focus "Don't Save"
      await sleep(200);
      pressKey("enter");
      await sleep(500);
    } else {
      recordTest("Notepad", "fail", { reason: "Window not found" });
    }
  }

  // ─── VS Code ──────────────────────────────────────────────────
  step("VS Code: Launch and UIA detection");
  {
    let launched = false;
    try {
      execSync('powershell.exe -NoProfile -Command "Start-Process code"', { timeout: 15000 });
      launched = true;
    } catch {
      try {
        execSync('powershell.exe -NoProfile -Command "Start-Process \\"C:\\Users\\Sails\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe\\""', { timeout: 15000 });
        launched = true;
      } catch { launched = false; }
    }

    if (launched) {
      console.log("    ✅ VS Code launch command sent");
      await sleep(6000);
      const win = focusWindowByTitle("Visual Studio Code") || focusWindowByTitle("VS Code");
      screenshot("vscode_launched");

      if (win) {
        const elements = getUIElements();
        console.log(`    UIA elements: ${elements.length}`);
        recordTest("VS Code", elements.length > 10 ? "pass" : "partial", {
          title: win.title, uiaCount: elements.length
        });
      } else {
        recordTest("VS Code", "partial", { reason: "Window not focused" });
      }
      closeApp("Code");
      await sleep(2000);
    } else {
      recordTest("VS Code", "skip", { reason: "Not installed or not found" });
    }
  }

  // ─── Microsoft Word ───────────────────────────────────────────
  step("Microsoft Word: Launch and UIA detection");
  {
    let launched = launchApp("Start-Process winword.exe -ErrorAction Stop");
    if (!launched) {
      // Try alternative path
      launched = launchApp("Start-Process 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE' -ErrorAction Stop");
    }

    if (launched) {
      await sleep(8000);
      const win = focusWindowByTitle("Word") || focusWindowByTitle("文档");
      screenshot("word_launched");

      if (win) {
        const elements = getUIElements();
        console.log(`    UIA elements: ${elements.length}`);

        // Try to create new blank document
        pressKey("escape"); // Close any startup dialog
        await sleep(1000);

        typeText("OpenOxygen P2 Test - Word");
        await sleep(500);
        screenshot("word_typed");

        recordTest("Microsoft Word", "pass", {
          title: win.title, uiaCount: elements.length
        });
      } else {
        recordTest("Microsoft Word", "partial", { reason: "Window not focused" });
      }
      closeApp("WINWORD");
      await sleep(2000);
    } else {
      recordTest("Microsoft Word", "skip", { reason: "Not installed" });
    }
  }

  // ─── Microsoft Excel ──────────────────────────────────────────
  step("Microsoft Excel: Launch and UIA detection");
  {
    let launched = launchApp("Start-Process excel.exe -ErrorAction Stop");
    if (!launched) {
      launched = launchApp("Start-Process 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE' -ErrorAction Stop");
    }

    if (launched) {
      await sleep(8000);
      const win = focusWindowByTitle("Excel") || focusWindowByTitle("工作簿");
      screenshot("excel_launched");

      if (win) {
        const elements = getUIElements();
        console.log(`    UIA elements: ${elements.length}`);

        pressKey("escape");
        await sleep(1000);

        typeText("OpenOxygen");
        pressKey("tab");
        typeText("P2 Test");
        await sleep(500);
        screenshot("excel_typed");

        recordTest("Microsoft Excel", "pass", {
          title: win.title, uiaCount: elements.length
        });
      } else {
        recordTest("Microsoft Excel", "partial", { reason: "Window not focused" });
      }
      closeApp("EXCEL");
      await sleep(2000);
    } else {
      recordTest("Microsoft Excel", "skip", { reason: "Not installed" });
    }
  }

  // ─── Microsoft PowerPoint ────────────────────────────────────
  step("Microsoft PowerPoint: Launch and UIA detection");
  {
    let launched = launchApp("Start-Process powerpnt.exe -ErrorAction Stop");
    if (!launched) {
      launched = launchApp("Start-Process 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE' -ErrorAction Stop");
    }

    if (launched) {
      await sleep(8000);
      const win = focusWindowByTitle("PowerPoint") || focusWindowByTitle("演示文稿");
      screenshot("powerpoint_launched");

      if (win) {
        const elements = getUIElements();
        console.log(`    UIA elements: ${elements.length}`);
        recordTest("Microsoft PowerPoint", "pass", {
          title: win.title, uiaCount: elements.length
        });
      } else {
        recordTest("Microsoft PowerPoint", "partial", { reason: "Window not focused" });
      }
      closeApp("POWERPNT");
      await sleep(2000);
    } else {
      recordTest("Microsoft PowerPoint", "skip", { reason: "Not installed" });
    }
  }

  // ─── WeChat ───────────────────────────────────────────────────
  step("WeChat: Detect if running, UIA elements");
  {
    const wins = native.listWindows();
    const wechatWin = wins.find(w => w.visible && w.title && (w.title.includes("微信") || w.title.includes("WeChat")));

    if (wechatWin) {
      native.focusWindow(wechatWin.hwnd);
      await sleep(1000);
      screenshot("wechat");
      const elements = getUIElements();
      console.log(`    UIA elements: ${elements.length}`);
      recordTest("WeChat", "pass", { title: wechatWin.title, uiaCount: elements.length });
    } else {
      // Try to launch
      let launched = false;
      try {
        execSync('powershell.exe -NoProfile -Command "Start-Process \\"C:\\Program Files (x86)\\Tencent\\WeChat\\WeChat.exe\\" -ErrorAction Stop"', { timeout: 10000 });
        launched = true;
      } catch {
        try {
          execSync('powershell.exe -NoProfile -Command "Start-Process WeChat -ErrorAction Stop"', { timeout: 10000 });
          launched = true;
        } catch {}
      }

      if (launched) {
        await sleep(5000);
        screenshot("wechat_launched");
        const elements = getUIElements();
        recordTest("WeChat", elements.length > 5 ? "pass" : "partial", { uiaCount: elements.length });
        closeApp("WeChat");
      } else {
        recordTest("WeChat", "skip", { reason: "Not installed" });
      }
    }
  }

  // ─── Steam ────────────────────────────────────────────────────
  step("Steam: Detect if installed");
  {
    const wins = native.listWindows();
    const steamWin = wins.find(w => w.visible && w.title && w.title.includes("Steam"));

    if (steamWin) {
      native.focusWindow(steamWin.hwnd);
      await sleep(1000);
      screenshot("steam");
      const elements = getUIElements();
      recordTest("Steam", "pass", { title: steamWin.title, uiaCount: elements.length });
    } else {
      recordTest("Steam", "skip", { reason: "Not running / not installed" });
    }
  }

  // ─── 网易云音乐 ──────────────────────────────────────────────
  step("NetEase Music: Detect if installed");
  {
    const wins = native.listWindows();
    const neteaseWin = wins.find(w => w.visible && w.title && (w.title.includes("网易云") || w.title.includes("NetEase")));

    if (neteaseWin) {
      native.focusWindow(neteaseWin.hwnd);
      await sleep(1000);
      screenshot("netease_music");
      const elements = getUIElements();
      recordTest("NetEase Music", "pass", { title: neteaseWin.title, uiaCount: elements.length });
    } else {
      recordTest("NetEase Music", "skip", { reason: "Not running / not installed" });
    }
  }

  // ─── LLM Assessment ──────────────────────────────────────────
  step("LLM assessment of software compatibility");
  {
    const summary = results.tests.map(t => `${t.app}: ${t.status}`).join(", ");
    await askLLM(`Software compat results: ${summary}. Rate 1-10 and note issues.`);
  }

  // ═══════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════

  const totalTime = performance.now() - taskStart;
  results.completedAt = Date.now();
  results.durationMs = totalTime;

  const passed = results.tests.filter(t => t.status === "pass").length;
  const partial = results.tests.filter(t => t.status === "partial").length;
  const skipped = results.tests.filter(t => t.status === "skip").length;
  const failed = results.tests.filter(t => t.status === "fail").length;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  26w13aA P2 — Software Compatibility Results");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ⚠️ Partial: ${partial}`);
  console.log(`  ⊘ Skipped: ${skipped}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  Duration:  ${(totalTime / 1000).toFixed(1)}s`);
  console.log("═══════════════════════════════════════════════════════════════");

  for (const t of results.tests) {
    const icon = t.status === "pass" ? "✅" : t.status === "partial" ? "⚠️" : t.status === "skip" ? "⊘" : "❌";
    console.log(`  ${icon} ${t.app.padEnd(25)} ${t.details?.title?.slice(0, 40) || t.details?.reason || ""}`);
  }

  const resultsPath = `${RESULTS_DIR}\\p2-software-compat-${Date.now()}.json`;
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n  Results: ${resultsPath}`);
}

main().catch(err => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
