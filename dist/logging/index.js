/**
 * OpenOxygen - Logging Subsystem
 *
 * 结构化日志系统，支持子系统标签、级别过滤和控制台捕获。
 * 独立实现，不依赖 OpenClaw 的 logging 模块。
 */
import process from "node:process";
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};
let globalMinLevel = "info";
let consoleCapturing = false;
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
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
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 0)))
        .join(" ");
    return `${prefix} ${msg}`;
}
/**
 * Create a logger scoped to a subsystem name.
 * All output goes through the structured pipeline.
 */
export function createSubsystemLogger(subsystem) {
    const emit = (level, args) => {
        if (!shouldEmit(level))
            return;
        const formatted = formatMessage(subsystem, level, args);
        switch (level) {
            case "debug":
                originalConsole.debug(formatted);
                break;
            case "info":
                originalConsole.log(formatted);
                break;
            case "warn":
                originalConsole.warn(formatted);
                break;
            case "error":
            case "fatal":
                originalConsole.error(formatted);
                break;
        }
    };
    return {
        debug: (...args) => emit("debug", args),
        info: (...args) => emit("info", args),
        warn: (...args) => emit("warn", args),
        error: (...args) => emit("error", args),
        fatal: (...args) => emit("fatal", args),
    };
}
/**
 * Enable capturing of console output
 */
export function enableConsoleCapture() {
    if (consoleCapturing)
        return;
    const mainLogger = createSubsystemLogger("console");
    console.log = (...args) => mainLogger.info(...args);
    console.warn = (...args) => mainLogger.warn(...args);
    console.error = (...args) => mainLogger.error(...args);
    console.debug = (...args) => mainLogger.debug(...args);
    consoleCapturing = true;
}
/**
 * Disable capturing and restore original console
 */
export function disableConsoleCapture() {
    if (!consoleCapturing)
        return;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    consoleCapturing = false;
}
/**
 * Initialize log level from environment
 */
export function initLogLevelFromEnv() {
    const envLevel = process.env.OPENOXYGEN_LOG_LEVEL?.toLowerCase();
    if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
        setLogLevel(envLevel);
    }
}
// Initialize on module load
initLogLevelFromEnv();
export default {
    setLevel: setLogLevel,
    getLevel: getLogLevel,
    create: createSubsystemLogger,
    enableCapture: enableConsoleCapture,
    disableCapture: disableConsoleCapture,
    initFromEnv: initLogLevelFromEnv,
};
