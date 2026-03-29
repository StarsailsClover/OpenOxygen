/**
 * OpenOxygen — Logging Subsystem
 *
 * 结构化日志系统，支持子系统标签、级别过滤和控制台捕获。
 * 独立实现，不依赖 OpenClaw 的 logging 模块。
 */

import process from "node:process";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

let globalMinLevel: LogLevel = "info";
let consoleCapturing = false;
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

export function setLogLevel(level: LogLevel): void {
  globalMinLevel = level;
}

export function getLogLevel(): LogLevel {
  return globalMinLevel;
}

function shouldEmit(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[globalMinLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(
  subsystem: string,
  level: LogLevel,
  args: unknown[],
): string {
  const ts = formatTimestamp();
  const lvl = level.toUpperCase().padEnd(5);
  const prefix = `[${ts}] [${lvl}] [${subsystem}]`;
  const msg = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 0)))
    .join(" ");
  return `${prefix} ${msg}`;
}

export type SubsystemLogger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  fatal: (...args: unknown[]) => void;
};

/**
 * Create a logger scoped to a subsystem name.
 * All output goes through the structured pipeline.
 */
export function createSubsystemLogger(subsystem: string): SubsystemLogger {
  const emit = (level: LogLevel, args: unknown[]) => {
    if (!shouldEmit(level)) return;
    const formatted = formatMessage(subsystem, level, args);
    if (level === "error" || level === "fatal") {
      originalConsole.error(formatted);
    } else if (level === "warn") {
      originalConsole.warn(formatted);
    } else {
      originalConsole.log(formatted);
    }
  };

  return {
    debug: (...args: unknown[]) => emit("debug", args),
    info: (...args: unknown[]) => emit("info", args),
    warn: (...args: unknown[]) => emit("warn", args),
    error: (...args: unknown[]) => emit("error", args),
    fatal: (...args: unknown[]) => emit("fatal", args),
  };
}

/**
 * Capture all console.log/warn/error into structured logging.
 * Preserves original stdout/stderr behavior.
 */
export function enableConsoleCapture(): void {
  if (consoleCapturing) return;
  consoleCapturing = true;

  const captureLogger = createSubsystemLogger("console");

  console.log = (...args: unknown[]) => {
    captureLogger.info(...args);
  };
  console.warn = (...args: unknown[]) => {
    captureLogger.warn(...args);
  };
  console.error = (...args: unknown[]) => {
    captureLogger.error(...args);
  };
  console.debug = (...args: unknown[]) => {
    captureLogger.debug(...args);
  };
}

/**
 * Restore original console methods.
 */
export function disableConsoleCapture(): void {
  if (!consoleCapturing) return;
  consoleCapturing = false;
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
}

/**
 * Initialize log level from environment variable.
 */
export function initLogLevelFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const raw = env["OPENOXYGEN_LOG_LEVEL"];
  if (raw && raw in LOG_LEVEL_PRIORITY) {
    setLogLevel(raw as LogLevel);
  }
}
