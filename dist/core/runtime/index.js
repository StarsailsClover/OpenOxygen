/**
<<<<<<< HEAD
 * OpenOxygen �?Runtime Environment
 *
 * 运行时环境管理：进程生命周期、平台检测、终端状态恢复�?
 * 独立实现，参�?OpenClaw runtime.ts 的接口契约但重写全部逻辑�?
=======
 * OpenOxygen - Runtime Environment
 *
 * 运行时环境管理：进程生命周期、平台检测、终端状态恢复。
 * 独立实现，参考 OpenClaw runtime.ts 的接口合约但重写全部逻辑。
>>>>>>> dev
 */
import os from "node:os";
import process from "node:process";
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("runtime");
<<<<<<< HEAD
// ─── Platform Detection ────────────────────────────────────────────────────
=======
// === Platform Detection ===
>>>>>>> dev
function detectPlatform() {
    const p = process.platform;
    if (p === "win32")
        return "win32";
    if (p === "darwin")
        return "darwin";
    return "linux";
}
const SUPPORTED_NODE_MAJOR = 22;
export function assertSupportedRuntime() {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    if (major < SUPPORTED_NODE_MAJOR) {
        throw new Error(`OpenOxygen requires Node.js >= ${SUPPORTED_NODE_MAJOR}.x (current: ${process.versions.node})`);
    }
}
// === Terminal State ===
let terminalRawMode = false;
export function setTerminalRawMode(enabled) {
    if (process.stdin.isTTY && process.stdin.setRawMode) {
        try {
            process.stdin.setRawMode(enabled);
            terminalRawMode = enabled;
        }
        catch {
<<<<<<< HEAD
            // Ignore �?stdin may already be destroyed
=======
            // Ignore - stdin may already be destroyed
>>>>>>> dev
        }
    }
}
export function restoreTerminalState(reason) {
    if (terminalRawMode) {
        log.debug(`Restoring terminal state: ${reason}`);
        setTerminalRawMode(false);
    }
    // Resume stdin if paused to prevent process hang
    if (process.stdin.isPaused?.()) {
        try {
            process.stdin.resume();
            process.stdin.unref();
        }
        catch {
            // Ignore
        }
    }
}
<<<<<<< HEAD
// ─── Runtime Factory ────────────────────────────────────────────────────────
function createRuntimeIO() {
    const rtLog = createSubsystemLogger("oxygen");
    return {
        log: (...args) => rtLog.info(...args),
        error: (...args) => rtLog.error(...args),
        warn: (...args) => rtLog.warn(...args),
    };
}
/**
 * Default runtime �?used in production.
 * Restores terminal state before exit.
 */
export const defaultRuntime = {
    ...createRuntimeIO(),
    platform: detectPlatform(),
    exit: (code) => {
        restoreTerminalState("runtime exit");
        process.exit(code);
    },
};
/**
 * Non-exiting runtime �?used in tests.
 * Throws instead of calling process.exit.
 */
export function createTestRuntime() {
    return {
        ...createRuntimeIO(),
        platform: detectPlatform(),
        exit: (code) => {
            throw new Error(`exit ${code}`);
        },
    };
}
// ─── Global Error Handlers ──────────────────────────────────────────────────
export function installGlobalErrorHandlers(runtime) {
    process.on("uncaughtException", (err) => {
        runtime.error("Uncaught exception:", err instanceof Error ? (err.stack ?? err.message) : err);
=======
// === Global Error Handlers ===
export function installGlobalErrorHandlers() {
    // Unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
        log.error("Unhandled Rejection at:", promise, "reason:", reason);
        // Don't exit - let the application handle it
    });
    // Uncaught exceptions
    process.on("uncaughtException", (error) => {
        log.error("Uncaught Exception:", error);
>>>>>>> dev
        restoreTerminalState("uncaught exception");
        process.exit(1);
    });
<<<<<<< HEAD
    process.on("unhandledRejection", (reason) => {
        runtime.error("Unhandled rejection:", reason);
        // Don't exit �?log and continue, matching OpenClaw behavior
=======
    // SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
        log.info("Received SIGINT, shutting down gracefully...");
        restoreTerminalState("SIGINT");
        process.exit(0);
>>>>>>> dev
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
<<<<<<< HEAD
// ─── System Info ────────────────────────────────────────────────────────────
export function getSystemInfo() {
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
=======
export function createRuntime() {
    return {
        platform: detectPlatform(),
        nodeVersion: process.versions.node,
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        startTime: Date.now(),
    };
}
export const defaultRuntime = {
    log: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
    warn: (...args) => console.warn(...args),
    exit: (code) => process.exit(code),
    platform: detectPlatform(),
};
// === Process Utilities ===
/**
 * Get process memory usage in MB
 */
export function getMemoryUsage() {
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
export function getUptime() {
    return Math.round(process.uptime());
}
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
>>>>>>> dev
