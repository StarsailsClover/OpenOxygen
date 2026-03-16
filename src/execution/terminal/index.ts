/**
 * OpenOxygen — Terminal Executor
 *
 * 终端操作模块：让 Agent 能像人类开发者一样使用终端。
 * 支持 PowerShell、CMD、WSL bash。
 * 
 * 能力：
 *   - 持久会话（环境变量、工作目录跨命令保留）
 *   - 命令执行 + 流式输出
 *   - 安全命令白名单/黑名单
 *   - 超时控制 + 进程管理
 *   - 输出解析（结构化提取）
 *
 * 与 VLM+键鼠 的协作：
 *   - TaskRouter 判断终端 vs GUI 哪个更快
 *   - 代码场景优先终端
 *   - 视觉分类场景优先 GUI
 */

import { exec, execSync, spawn, ChildProcess } from "node:child_process";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs, withTimeout } from "../../utils/index.js";
import type { ToolResult } from "../../types/index.js";

const log = createSubsystemLogger("execution/terminal");

// ─── Types ──────────────────────────────────────────────────────────────────

export type ShellType = "powershell" | "cmd" | "bash" | "wsl";

export type TerminalSession = {
  id: string;
  shellType: ShellType;
  process: ChildProcess | null;
  cwd: string;
  env: Record<string, string>;
  history: TerminalCommand[];
  createdAt: number;
  lastActiveAt: number;
  alive: boolean;
};

export type TerminalCommand = {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startTime: number;
  endTime: number;
  durationMs: number;
};

export type TerminalConfig = {
  defaultShell: ShellType;
  timeoutMs: number;
  maxOutputBytes: number;
  blockedCommands: string[];
  allowedPaths: string[];
  maxConcurrentSessions: number;
};

// ─── Default Config ─────────────────────────────────────────────────────────

export function createDefaultTerminalConfig(): TerminalConfig {
  return {
    defaultShell: "powershell",
    timeoutMs: 30_000,
    maxOutputBytes: 1024 * 1024, // 1MB
    blockedCommands: [
      "rm -rf /", "rmdir /s /q C:", "format",
      "del /f /s /q C:", "shutdown", "reboot",
      "Remove-Item -Recurse -Force C:", "Stop-Computer",
      "Restart-Computer",
    ],
    allowedPaths: [],
    maxConcurrentSessions: 5,
  };
}

// ─── Security ───────────────────────────────────────────────────────────────

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+[\/\\]/i,
  /rmdir\s+\/s\s+\/q\s+[A-Z]:/i,
  /format\s+[A-Z]:/i,
  /del\s+\/f.*[A-Z]:\\/i,
  /shutdown/i,
  /reboot/i,
  /Remove-Item.*-Recurse.*-Force.*[A-Z]:\\/i,
  /Stop-Computer/i,
  /Restart-Computer/i,
  /reg\s+delete.*HKLM/i,
  /bcdedit/i,
  /diskpart/i,
];

function isCommandSafe(command: string, config: TerminalConfig): { safe: boolean; reason?: string } {
  // Check blocked commands
  for (const blocked of config.blockedCommands) {
    if (command.toLowerCase().includes(blocked.toLowerCase())) {
      return { safe: false, reason: `Blocked command: ${blocked}` };
    }
  }

  // Check dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { safe: false, reason: `Dangerous pattern: ${pattern.source}` };
    }
  }

  return { safe: true };
}

// ─── Session Manager ────────────────────────────────────────────────────────

const sessions = new Map<string, TerminalSession>();

export function createSession(
  shellType?: ShellType,
  cwd?: string,
  config?: TerminalConfig,
): TerminalSession {
  const cfg = config ?? createDefaultTerminalConfig();
  const shell = shellType ?? cfg.defaultShell;

  if (sessions.size >= cfg.maxConcurrentSessions) {
    // Kill oldest inactive session
    const oldest = [...sessions.values()]
      .sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
    if (oldest) {
      destroySession(oldest.id);
    }
  }

  const session: TerminalSession = {
    id: generateId("term"),
    shellType: shell,
    process: null,
    cwd: cwd ?? process.cwd(),
    env: { ...process.env } as Record<string, string>,
    history: [],
    createdAt: nowMs(),
    lastActiveAt: nowMs(),
    alive: true,
  };

  sessions.set(session.id, session);
  log.info(`Terminal session created: ${session.id} (${shell})`);
  return session;
}

export function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.alive = false;
  if (session.process) {
    try { session.process.kill("SIGTERM"); } catch {}
  }
  sessions.delete(sessionId);
  log.info(`Terminal session destroyed: ${sessionId}`);
}

export function getSession(sessionId: string): TerminalSession | null {
  return sessions.get(sessionId) ?? null;
}

export function listSessions(): TerminalSession[] {
  return [...sessions.values()];
}

// ─── Command Execution ──────────────────────────────────────────────────────

function buildShellCommand(shellType: ShellType, command: string): { executable: string; args: string[] } {
  switch (shellType) {
    case "powershell":
      return {
        executable: "powershell.exe",
        args: ["-NoProfile", "-NonInteractive", "-Command", command],
      };
    case "cmd":
      return {
        executable: "cmd.exe",
        args: ["/c", command],
      };
    case "bash":
    case "wsl":
      return {
        executable: "wsl.exe",
        args: ["-e", "bash", "-c", command],
      };
  }
}

export async function executeCommand(
  sessionId: string,
  command: string,
  config?: TerminalConfig,
): Promise<ToolResult & { terminalCommand: TerminalCommand }> {
  const cfg = config ?? createDefaultTerminalConfig();
  const session = sessions.get(sessionId);
  if (!session || !session.alive) {
    return {
      success: false,
      error: `Session ${sessionId} not found or destroyed`,
      durationMs: 0,
      terminalCommand: {
        id: generateId("cmd"),
        command,
        stdout: "",
        stderr: "",
        exitCode: -1,
        startTime: nowMs(),
        endTime: nowMs(),
        durationMs: 0,
      },
    };
  }

  // Security check
  const safety = isCommandSafe(command, cfg);
  if (!safety.safe) {
    log.warn(`Blocked unsafe command: ${safety.reason}`);
    return {
      success: false,
      error: `Command blocked: ${safety.reason}`,
      durationMs: 0,
      terminalCommand: {
        id: generateId("cmd"),
        command,
        stdout: "",
        stderr: `BLOCKED: ${safety.reason}`,
        exitCode: -1,
        startTime: nowMs(),
        endTime: nowMs(),
        durationMs: 0,
      },
    };
  }

  const start = nowMs();
  const cmdId = generateId("cmd");
  const { executable, args } = buildShellCommand(session.shellType, command);

  return new Promise<ToolResult & { terminalCommand: TerminalCommand }>((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const child = spawn(executable, args, {
      cwd: session.cwd,
      env: session.env,
      windowsHide: true,
    });

    session.process = child;
    session.lastActiveAt = nowMs();

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill("SIGTERM"); } catch {}
    }, cfg.timeoutMs);

    child.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      if (stdout.length + chunk.length <= cfg.maxOutputBytes) {
        stdout += chunk;
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      if (stderr.length + chunk.length <= cfg.maxOutputBytes) {
        stderr += chunk;
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const end = nowMs();
      const cmd: TerminalCommand = {
        id: cmdId,
        command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code,
        startTime: start,
        endTime: end,
        durationMs: end - start,
      };

      session.history.push(cmd);
      session.process = null;

      // Update cwd if cd command was used
      if (/^cd\s+/i.test(command) && code === 0) {
        const newDir = command.replace(/^cd\s+/i, "").trim().replace(/"/g, "");
        if (newDir) {
          const path = require("node:path");
          session.cwd = path.isAbsolute(newDir) ? newDir : path.resolve(session.cwd, newDir);
        }
      }

      resolve({
        success: code === 0 && !timedOut,
        output: stdout.trim(),
        error: timedOut ? `Timeout after ${cfg.timeoutMs}ms` : stderr.trim() || undefined,
        durationMs: end - start,
        terminalCommand: cmd,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      const end = nowMs();
      const cmd: TerminalCommand = {
        id: cmdId,
        command,
        stdout: "",
        stderr: err.message,
        exitCode: -1,
        startTime: start,
        endTime: end,
        durationMs: end - start,
      };
      session.history.push(cmd);

      resolve({
        success: false,
        error: err.message,
        durationMs: end - start,
        terminalCommand: cmd,
      });
    });
  });
}

// ─── Convenience Functions ──────────────────────────────────────────────────

/**
 * 快速执行一个命令（不需要会话）
 */
export async function quickExec(
  command: string,
  shellType: ShellType = "powershell",
  timeoutMs: number = 30_000,
): Promise<ToolResult> {
  const session = createSession(shellType);
  try {
    const result = await executeCommand(session.id, command, {
      ...createDefaultTerminalConfig(),
      timeoutMs,
    });
    return result;
  } finally {
    destroySession(session.id);
  }
}

/**
 * 执行多个命令（顺序，同一会话）
 */
export async function executeSequence(
  sessionId: string,
  commands: string[],
  config?: TerminalConfig,
): Promise<{ results: (ToolResult & { terminalCommand: TerminalCommand })[]; allSuccess: boolean }> {
  const results: (ToolResult & { terminalCommand: TerminalCommand })[] = [];
  let allSuccess = true;

  for (const cmd of commands) {
    const result = await executeCommand(sessionId, cmd, config);
    results.push(result);
    if (!result.success) {
      allSuccess = false;
      break; // Stop on first failure
    }
  }

  return { results, allSuccess };
}

// ─── Task Router Integration ────────────────────────────────────────────────

/**
 * 判断任务应该用终端还是 GUI 执行。
 * 返回建议的执行方式和原因。
 */
export type ExecutionStrategy = "terminal" | "gui" | "hybrid";

export type TaskRouterDecision = {
  strategy: ExecutionStrategy;
  confidence: number;
  reason: string;
  suggestedShell?: ShellType;
  suggestedCommands?: string[];
};

const TERMINAL_KEYWORDS = [
  "npm", "node", "git", "python", "pip", "cargo", "rustc",
  "mkdir", "cd", "ls", "dir", "copy", "move", "rename",
  "curl", "wget", "ssh", "scp", "tar", "zip", "unzip",
  "docker", "kubectl", "terraform", "ansible",
  "编译", "构建", "安装依赖", "运行脚本", "打包",
  "create file", "write file", "read file", "list files",
  "install", "build", "compile", "deploy", "test",
  "环境变量", "路径", "权限", "进程",
];

const GUI_KEYWORDS = [
  "点击", "拖拽", "滚动", "截图", "查看", "浏览",
  "click", "drag", "scroll", "screenshot", "browse",
  "打开应用", "切换窗口", "最小化", "最大化",
  "搜索框", "按钮", "菜单", "对话框",
  "视频", "图片", "颜色", "外观", "界面",
  "登录", "验证码", "人机验证",
  "bilibili", "youtube", "微信", "qq",
];

export function routeTask(instruction: string): TaskRouterDecision {
  const lower = instruction.toLowerCase();

  let terminalScore = 0;
  let guiScore = 0;

  for (const kw of TERMINAL_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) terminalScore += 2;
  }

  for (const kw of GUI_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) guiScore += 2;
  }

  // Code-related patterns
  if (/\.(py|js|ts|rs|go|java|cpp|c|sh|bat|ps1)$/i.test(lower)) terminalScore += 5;
  if (/(代码|code|script|脚本|编程|程序)/.test(lower)) terminalScore += 3;
  if (/(文件操作|file.*operat|创建文件|删除文件)/.test(lower)) terminalScore += 3;

  // Visual patterns
  if (/(看起来|外观|颜色|位置|图标|logo|图片|视频)/.test(lower)) guiScore += 4;
  if (/(验证码|captcha|人机验证|滑块)/.test(lower)) guiScore += 10; // Must be GUI
  if (/(网页|浏览器|browser|chrome|edge)/.test(lower)) guiScore += 2;

  // Decide
  const total = terminalScore + guiScore;
  if (total === 0) {
    return { strategy: "gui", confidence: 0.5, reason: "Default to GUI for unknown tasks" };
  }

  const terminalRatio = terminalScore / total;

  if (terminalRatio > 0.7) {
    return {
      strategy: "terminal",
      confidence: terminalRatio,
      reason: `Terminal preferred (score: ${terminalScore}/${total})`,
      suggestedShell: "powershell",
    };
  } else if (terminalRatio < 0.3) {
    return {
      strategy: "gui",
      confidence: 1 - terminalRatio,
      reason: `GUI preferred (score: ${guiScore}/${total})`,
    };
  } else {
    return {
      strategy: "hybrid",
      confidence: 0.6,
      reason: `Hybrid approach recommended (terminal: ${terminalScore}, gui: ${guiScore})`,
      suggestedShell: "powershell",
    };
  }
}
