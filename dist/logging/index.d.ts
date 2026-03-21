/**
 * OpenOxygen — Logging Subsystem
 *
 * 结构化日志系统，支持子系统标签、级别过滤和控制台捕获。
 * 独立实现，不依赖 OpenClaw 的 logging 模块。
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export declare function setLogLevel(level: LogLevel): void;
export declare function getLogLevel(): LogLevel;
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
export declare function createSubsystemLogger(subsystem: string): SubsystemLogger;
/**
 * Capture all console.log/warn/error into structured logging.
 * Preserves original stdout/stderr behavior.
 */
export declare function enableConsoleCapture(): void;
/**
 * Restore original console methods.
 */
export declare function disableConsoleCapture(): void;
/**
 * Initialize log level from environment variable.
 */
export declare function initLogLevelFromEnv(env?: NodeJS.ProcessEnv): void;
//# sourceMappingURL=index.d.ts.map