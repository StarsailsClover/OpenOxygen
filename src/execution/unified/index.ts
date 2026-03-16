/**
 * OpenOxygen — Unified Task Executor (Simplified v1)
 *
 * 当前实现状态：框架搭建，核心功能待实现
 * TODO:
 * - [ ] Task Router LLM integration
 * - [ ] Strategy execution with real Terminal/Browser modules
 * - [ ] Automatic fallback mechanism
 * - [ ] Performance metrics collection
 */

import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type { ToolResult, ExecutionMode } from "../../types/index.js";
import type { TerminalSession, ShellType } from "../terminal/index.js";

const log = createSubsystemLogger("execution/unified");

// ─── Types ──────────────────────────────────────────────────────────────────

export type TaskStrategy = {
  mode: ExecutionMode;
  confidence: number;
  reason: string;
  fallback?: ExecutionMode;
};

export type ExecutionResult = ToolResult & {
  mode: ExecutionMode;
  strategy: TaskStrategy;
  durationMs: number;
};

// ─── Keyword-Based Task Router ───────────────────────────────────────────

const TERMINAL_KEYWORDS = [
  "npm", "yarn", "pnpm", "node", "npx", "git", "python", "pip", "cargo", "rustc",
  "mkdir", "cd", "ls", "dir", "copy", "move", "del", "rmdir",
  "curl", "wget", "ssh", "scp", "tar", "zip", "unzip",
  "docker", "kubectl", "terraform",
  "编译", "构建", "安装", "运行脚本",
  ".py", ".js", ".ts", ".rs", ".sh", ".bat",
];

const BROWSER_KEYWORDS = [
  "chrome", "edge", "browser", "网页", "网站",
  "https", "www", "navigate", "browse",
  "bilibili", "youtube", "github", "google", "baidu", "zhihu",
  "搜索", "search", "登录", "login",
];

const GUI_KEYWORDS = [
  "点击", "click", "拖动", "drag", "滚动", "scroll",
  "截图", "screenshot", "查看", "view",
  "微信", "qq", "steam", "vscode", "记事本",
  "按钮", "button", "菜单", "menu",
];

/**
 * Analyze task and recommend execution strategy
 */
export function analyzeTask(instruction: string): TaskStrategy {
  const lower = instruction.toLowerCase();

  let terminalScore = 0;
  let browserScore = 0;
  let guiScore = 0;

  for (const kw of TERMINAL_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) terminalScore++;
  }

  for (const kw of BROWSER_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) browserScore++;
  }

  for (const kw of GUI_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) guiScore++;
  }

  // Code patterns boost terminal
  if (/\.(py|js|ts|rs|go|java|cpp|sh)\b/.test(lower)) terminalScore += 5;

  const total = terminalScore + browserScore + guiScore;
  if (total === 0) {
    return { mode: "gui", confidence: 0.5, reason: "No clear pattern, default to GUI" };
  }

  const max = Math.max(terminalScore, browserScore, guiScore);
  
  if (max === terminalScore) {
    return { mode: "terminal", confidence: max / total, reason: "Terminal keywords detected" };
  } else if (max === browserScore) {
    return { mode: "browser", confidence: max / total, reason: "Browser keywords detected" };
  } else {
    return { mode: "gui", confidence: max / total, reason: "GUI keywords detected" };
  }
}

// ─── Placeholder Executors ──────────────────────────────────────────────────

async function executeTerminalTask(instruction: string): Promise<ToolResult> {
  // TODO: Integrate with Terminal module
  return {
    success: false,
    error: "Terminal executor not fully implemented. Use native module for now.",
    durationMs: 0,
  };
}

async function executeBrowserTask(instruction: string): Promise<ToolResult> {
  // TODO: Integrate with Browser module
  return {
    success: false,
    error: "Browser executor not fully implemented. Use native module for now.",
    durationMs: 0,
  };
}

async function executeGUITask(instruction: string): Promise<ToolResult> {
  // Use existing native module
  const native = require("../native-bridge.js");
  const path = require("node:path");
  const ssPath = path.join(process.cwd(), ".state", `task-${generateId()}.png`);
  
  try {
    const capture = native.captureScreen(ssPath);
    return {
      success: capture.success,
      output: `Screenshot: ${ssPath}`,
      durationMs: capture.durationMs ?? 0,
    };
  } catch (e: any) {
    return { success: false, error: e.message, durationMs: 0 };
  }
}

// ─── Main Execution ────────────────────────────────────────────────────

export async function executeWithStrategy(
  instruction: string,
  strategy?: TaskStrategy,
): Promise<ExecutionResult> {
  const start = nowMs();
  const actualStrategy = strategy ?? analyzeTask(instruction);

  log.info(`Executing with strategy: ${actualStrategy.mode} (${actualStrategy.reason})`);

  let result: ToolResult;

  try {
    switch (actualStrategy.mode) {
      case "terminal":
        result = await executeTerminalTask(instruction);
        if (!result.success && actualStrategy.fallback) {
          log.info(`Terminal failed, falling back to ${actualStrategy.fallback}`);
          result = await executeGUITask(instruction);
        }
        break;

      case "browser":
        result = await executeBrowserTask(instruction);
        if (!result.success && actualStrategy.fallback) {
          result = await executeGUITask(instruction);
        }
        break;

      case "hybrid":
        // Try terminal first, then GUI
        result = await executeTerminalTask(instruction);
        if (!result.success) {
          result = await executeGUITask(instruction);
        }
        break;

      case "gui":
      default:
        result = await executeGUITask(instruction);
        break;
    }
  } catch (e: any) {
    result = { success: false, error: e.message, durationMs: nowMs() - start };
  }

  const duration = nowMs() - start;

  return {
    ...result,
    mode: actualStrategy.mode,
    strategy: actualStrategy,
    durationMs: duration,
  };
}
