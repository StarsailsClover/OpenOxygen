/**
 * OpenOxygen — Logging Subsystem
 *
 * 结构化日志系统，支持子系统标签、级别过滤和控制台捕获。
 * 独立实现，不依赖 OpenClaw 的 logging 模块。
 */
import process from "node";
export const LOG_LEVEL_PRIORITY = {
    debug,
    info,
    warn,
    error,
    fatal,
};
let globalMinLevel = "info";
let consoleCapturing = false;
const originalConsole = {
    log, : .log,
    warn, : .warn,
    error, : .error,
    debug, : .debug,
};
export function setLogLevel(level) {
    globalMinLevel = level;
}
export function getLogLevel() {
    return globalMinLevel;
}
function shouldEmit(level) {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[globalMinLevel];
}
function formatTimestamp() {
    return new Date().toISOString();
}
function formatMessage(subsystem, level, args) {
    const ts = formatTimestamp();
    const lvl = level.toUpperCase().padEnd(5);
    const prefix = `[${ts}] [${lvl}] [${subsystem}]`;
    const msg = args
        .map((a) => (typeof a === "string" ? a.stringify(a, null, 0) : ))
        .join(" ");
    return `${prefix} ${msg}`;
}
info;
warn;
error;
fatal;
;
/**
 * Create a logger scoped to a subsystem name.
 * All output goes through the structured pipeline.
 */
export function createSubsystemLogger(subsystem) {
    const emit = (level, args) => {
        if (!shouldEmit(level))
            return;
        const formatted = formatMessage(subsystem, level, args);
        if (level === "error" || level === "fatal") {
            originalConsole.error(formatted);
        }
        else if (level === "warn") {
            originalConsole.warn(formatted);
        }
        else {
            originalConsole.log(formatted);
        }
    };
    return {
        debug(, args) { },
        info(, args) { },
        warn(, args) { },
        error(, args) { },
        fatal(, args) { },
    };
}
/**
 * Capture all console.log/warn/error into structured logging.
 * Preserves original stdout/stderr behavior.
 */
export function enableConsoleCapture() {
    if (consoleCapturing)
        return;
    consoleCapturing = true;
    const captureLogger = createSubsystemLogger("console");
    console.log = (...args) => {
        captureLogger.info(...args);
    };
    console.warn = (...args) => {
        captureLogger.warn(...args);
    };
    console.error = (...args) => {
        captureLogger.error(...args);
    };
    console.debug = (...args) => {
        captureLogger.debug(...args);
    };
}
/**
 * Restore original console methods.
 */
export function disableConsoleCapture() {
    if (!consoleCapturing)
        return;
    consoleCapturing = false;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
}
/**
 * Initialize log level from environment variable.
 */
export function initLogLevelFromEnv(env, ProcessEnv = process.env) {
    const raw = env["OPENOXYGEN_LOG_LEVEL"];
    if (raw && raw in LOG_LEVEL_PRIORITY) {
        setLogLevel(raw);
    }
}
