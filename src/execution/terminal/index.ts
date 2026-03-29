/**
 * OpenOxygen �?Terminal Executor (Simplified v1)
 *
 * 当前实现状态：框架搭建，核心功能待实现
 * TODO:
 * - [ ] 持久会话状态管�?(SQLite)
 * - [ ] 命令安全过滤完整实现
 * - [ ] 流式输出捕获
 * - [ ] �?Gateway API 集成
 */

import { exec, spawn } from "node:child_process";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type { ToolResult } from "../../types/index.js";
import * as path from "node:path";

const log = createSubsystemLogger("execution/terminal");

// ─── Types ──────────────────────────────────────────────────────────────────

export type ShellType = "powershell" | "cmd" | "bash" | "wsl";

export type TerminalSession = {
  id: string;
  shellType: ShellType;
  cwd: string;
  env: Record<string, string>;
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
  durationMs: number;
};

// ─── Default Config ─────────────────────────────────────────────────────────

export function createDefaultTerminalConfig() {
  return {
    defaultShell: "powershell" as ShellType,
    timeoutMs: 30_000,
    maxOutputBytes: 1024 * 1024,
    blockedCommands: [
      "rm -rf /",
      "rmdir /s /q C:",
      "format",
      "del /f /s /q C:",
      "shutdown",
      "reboot",
      "Stop-Computer",
      "Restart-Computer",
    ],
  };
}

// ─── Security ───────────────────────────────────────────────────────────────

function isCommandSafe(
  command: string,
  blocked: string[],
): { safe: boolean; reason?: string } {
  for (const blockedCmd of blocked) {
    if (command.toLowerCase().includes(blockedCmd.toLowerCase())) {
      return { safe: false, reason: `Blocked command pattern: ${blockedCmd}` };
    }
  }
  return { safe: true };
}

// ─── Session Manager (In-Memory) ────────────────────────────────────────────

const sessions = new Map<string, TerminalSession>();

export function createSession(
  shellType?: ShellType,
  cwd?: string,
): TerminalSession {
  const session: TerminalSession = {
    id: generateId("term"),
    shellType: shellType ?? "powershell",
    cwd: cwd ?? process.cwd(),
    env: { ...process.env } as Record<string, string>,
    createdAt: nowMs(),
    lastActiveAt: nowMs(),
    alive: true,
  };

  sessions.set(session.id, session);
  log.info(`Terminal session created: ${session.id} (${session.shellType})`);
  return session;
}

export function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.alive = false;
  sessions.delete(sessionId);
  log.info(`Terminal session destroyed: ${sessionId}`);
}

export function getSession(sessionId: string): TerminalSession | null {
  return sessions.get(sessionId) ?? null;
}

// ─── Command Execution ──────────────────────────────────────────────────────

export async function executeCommand(
  sessionId: string,
  command: string,
): Promise<ToolResult & { terminalCommand: TerminalCommand }> {
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
        durationMs: 0,
      },
    };
  }

  // Security check
  const cfg = createDefaultTerminalConfig();
  const safety = isCommandSafe(command, cfg.blockedCommands);
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
        durationMs: 0,
      },
    };
  }

  const start = nowMs();
  const cmdId = generateId("cmd");

  // Build shell command
  let executable: string;
  let args: string[];

  switch (session.shellType) {
    case "powershell":
      executable = "powershell.exe";
      args = ["-NoProfile", "-NonInteractive", "-Command", command];
      break;
    case "cmd":
      executable = "cmd.exe";
      args = ["/c", command];
      break;
    case "bash":
    case "wsl":
      executable = "wsl.exe";
      args = ["-e", "bash", "-c", command];
      break;
    default:
      executable = "powershell.exe";
      args = ["-Command", command];
  }

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const child = spawn(executable, args, {
      cwd: session.cwd,
      env: session.env,
      windowsHide: true,
    });

    session.lastActiveAt = nowMs();

    // Timeout
    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
    }, cfg.timeoutMs);

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
      if (stdout.length > cfg.maxOutputBytes) {
        stdout = stdout.slice(0, cfg.maxOutputBytes) + "\n[truncated]";
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const duration = nowMs() - start;

      // Update cwd if cd command
      if (/^cd\s+/i.test(command) && code === 0) {
        const newDir = command
          .replace(/^cd\s+/i, "")
          .trim()
          .replace(/"/g, "");
        if (newDir) {
          session.cwd = path.isAbsolute(newDir)
            ? newDir
            : path.resolve(session.cwd, newDir);
        }
      }

      resolve({
        success: code === 0,
        output: stdout.trim(),
        error: stderr.trim() || undefined,
        durationMs: duration,
        terminalCommand: {
          id: cmdId,
          command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          durationMs: duration,
        },
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      const duration = nowMs() - start;
      resolve({
        success: false,
        error: err.message,
        durationMs: duration,
        terminalCommand: {
          id: cmdId,
          command,
          stdout: "",
          stderr: err.message,
          exitCode: -1,
          durationMs: duration,
        },
      });
    });
  });
}

// ─── Convenience Functions ──────────────────────────────────────────────────

export async function quickExec(
  command: string,
  shellType: ShellType = "powershell",
): Promise<ToolResult> {
  const session = createSession(shellType);
  try {
    const result = await executeCommand(session.id, command);
    return result;
  } finally {
    destroySession(session.id);
  }
}

export { sessions };
