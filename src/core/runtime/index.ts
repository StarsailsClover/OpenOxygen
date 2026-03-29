/**
 * OpenOxygen �?Runtime Environment
 *
 * 运行时环境管理：进程生命周期、平台检测、终端状态恢复�?
 * 独立实现，参�?OpenClaw runtime.ts 的接口契约但重写全部逻辑�?
 */

import os from "node:os";
import process from "node:process";
import type { OxygenRuntimeEnv } from "../../types/index.js";
import { createSubsystemLogger } from "../../logging/index.js";

const log = createSubsystemLogger("runtime");

// ─── Platform Detection ────────────────────────────────────────────────────

function detectPlatform(): OxygenRuntimeEnv["platform"] {
  const p = process.platform;
  if (p === "win32") return "win32";
  if (p === "darwin") return "darwin";
  return "linux";
}

const SUPPORTED_NODE_MAJOR = 22;

export function assertSupportedRuntime(): void {
  const major = parseInt(process.versions.node.split(".")[0]!, 10);
  if (major < SUPPORTED_NODE_MAJOR) {
    throw new Error(
      `OpenOxygen requires Node.js >= ${SUPPORTED_NODE_MAJOR}.x (current: ${process.versions.node})`,
    );
  }
}

// ─── Terminal State ─────────────────────────────────────────────────────────

let terminalRawMode = false;

export function setTerminalRawMode(enabled: boolean): void {
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(enabled);
      terminalRawMode = enabled;
    } catch {
      // Ignore �?stdin may already be destroyed
    }
  }
}

export function restoreTerminalState(reason: string): void {
  if (terminalRawMode) {
    log.debug(`Restoring terminal state: ${reason}`);
    setTerminalRawMode(false);
  }
  // Resume stdin if paused to prevent process hang
  if (process.stdin.isPaused?.()) {
    try {
      process.stdin.resume();
      process.stdin.unref();
    } catch {
      // Ignore
    }
  }
}

// ─── Runtime Factory ────────────────────────────────────────────────────────

function createRuntimeIO(): Pick<OxygenRuntimeEnv, "log" | "error" | "warn"> {
  const rtLog = createSubsystemLogger("oxygen");
  return {
    log: (...args: unknown[]) => rtLog.info(...args),
    error: (...args: unknown[]) => rtLog.error(...args),
    warn: (...args: unknown[]) => rtLog.warn(...args),
  };
}

/**
 * Default runtime �?used in production.
 * Restores terminal state before exit.
 */
export const defaultRuntime: OxygenRuntimeEnv = {
  ...createRuntimeIO(),
  platform: detectPlatform(),
  exit: (code: number) => {
    restoreTerminalState("runtime exit");
    process.exit(code);
  },
};

/**
 * Non-exiting runtime �?used in tests.
 * Throws instead of calling process.exit.
 */
export function createTestRuntime(): OxygenRuntimeEnv {
  return {
    ...createRuntimeIO(),
    platform: detectPlatform(),
    exit: (code: number) => {
      throw new Error(`exit ${code}`);
    },
  };
}

// ─── Global Error Handlers ──────────────────────────────────────────────────

export function installGlobalErrorHandlers(runtime: OxygenRuntimeEnv): void {
  process.on("uncaughtException", (err) => {
    runtime.error(
      "Uncaught exception:",
      err instanceof Error ? (err.stack ?? err.message) : err,
    );
    restoreTerminalState("uncaught exception");
    runtime.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    runtime.error("Unhandled rejection:", reason);
    // Don't exit �?log and continue, matching OpenClaw behavior
  });

  // Graceful shutdown on SIGINT / SIGTERM
  const shutdown = (signal: string) => {
    runtime.log(`Received ${signal}, shutting down...`);
    restoreTerminalState(signal);
    runtime.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// ─── System Info ────────────────────────────────────────────────────────────

export function getSystemInfo(): Record<string, string | number> {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    uptime: Math.round(os.uptime()),
  };
}
