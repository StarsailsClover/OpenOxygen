/**
 * OpenOxygen - Runtime Environment
 *
 * 运行时环境管理：进程生命周期、平台检测、终端状态恢复。
 * 独立实现，参考 OpenClaw runtime.ts 的接口合约但重写全部逻辑。
 */

import os from "node:os";
import process from "node:process";
import type { OxygenRuntimeEnv } from "../../types/index.js";
import { createSubsystemLogger } from "../../logging/index.js";

const log = createSubsystemLogger("runtime");

// === Platform Detection ===

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

// === Terminal State ===

let terminalRawMode = false;

export function setTerminalRawMode(enabled: boolean): void {
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(enabled);
      terminalRawMode = enabled;
    } catch {
      // Ignore - stdin may already be destroyed
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

// === Global Error Handlers ===

export function installGlobalErrorHandlers(): void {
  // Unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    log.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit - let the application handle it
  });

  // Uncaught exceptions
  process.on("uncaughtException", (error) => {
    log.error("Uncaught Exception:", error);
    restoreTerminalState("uncaught exception");
    process.exit(1);
  });

  // SIGINT (Ctrl+C)
  process.on("SIGINT", () => {
    log.info("Received SIGINT, shutting down gracefully...");
    restoreTerminalState("SIGINT");
    process.exit(0);
  });

  // SIGTERM
  process.on("SIGTERM", () => {
    log.info("Received SIGTERM, shutting down gracefully...");
    restoreTerminalState("SIGTERM");
    process.exit(0);
  });

  // Before exit
  process.on("beforeExit", () => {
    restoreTerminalState("beforeExit");
  });

  log.debug("Global error handlers installed");
}

// === Runtime Environment ===

export interface Runtime {
  platform: OxygenRuntimeEnv["platform"];
  nodeVersion: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  startTime: number;
}

export function createRuntime(): Runtime {
  return {
    platform: detectPlatform(),
    nodeVersion: process.versions.node,
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    startTime: Date.now(),
  };
}

export const defaultRuntime: OxygenRuntimeEnv = {
  log: (...args: unknown[]) => console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  exit: (code: number) => process.exit(code),
  platform: detectPlatform(),
};

// === Process Utilities ===

/**
 * Get process memory usage in MB
 */
export function getMemoryUsage(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
} {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
  };
}

/**
 * Get uptime in seconds
 */
export function getUptime(): number {
  return Math.round(process.uptime());
}

// === Exports ===

export {
  assertSupportedRuntime,
  setTerminalRawMode,
  restoreTerminalState,
  installGlobalErrorHandlers,
  createRuntime,
  getMemoryUsage,
  getUptime,
  defaultRuntime,
};

export default {
  assertSupported: assertSupportedRuntime,
  setTerminalRawMode,
  restoreTerminalState,
  installGlobalErrorHandlers,
  create: createRuntime,
  getMemoryUsage,
  getUptime,
  default: defaultRuntime,
};
