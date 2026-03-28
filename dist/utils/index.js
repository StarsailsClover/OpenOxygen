/**
 * OpenOxygen -Utility Functions
 *
 * ͨ�ù��ߺ���������ȫ��Ŀʹ��?
 */
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
// �-�-�- ID Generation �-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-
export function generateId(prefix) {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
}
export function generateShortId(length = 8) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, length);
}
export function generateTimestampId(prefix) {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
    const suffix = generateShortId();
    return `${prefix}-${ts}-${suffix}`;
}
// �-�-�- Path Utilities �-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-
export function resolveUserPath(input) {
    if (input.startsWith("~")) {
        return path.join(os.homedir(), input.slice(1));
    }
    return path.resolve(input);
}
export function ensureWindowsPath(p) {
    return p.replace(/\//g, "\\");
}
export function normalizePathSeparators(p) {
    if (process.platform === "win32") {
        return ensureWindowsPath(p);
    }
    return p.replace(/\\/g, "/");
}
/** Strip null bytes from paths to prevent ENOTDIR errors. */
export function sanitizePath(s) {
    // eslint-disable-next-line no-control-regex
    return s.replace(/\0/g, "");
}
// �-�-�- Environment �-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-
export function isTruthyEnv(value) {
    if (!value)
        return false;
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
export function getEnvOrDefault(key, defaultValue) {
    return process.env[key] ?? defaultValue;
}
// �-�-�- Timing �-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-
export function nowMs() {
    return Date.now();
}
export function elapsed(startMs) {
    return Date.now() - startMs;
}
export async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// �-�-�- Data �-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-
export function deepClone(obj) {
    return structuredClone(obj);
}
export function truncateString(s, maxLen, suffix = "...") {
    if (s.length <= maxLen)
        return s;
    return s.slice(0, maxLen - suffix.length) + suffix;
}
// �-�-�- Platform �-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-
export function isWindows() {
    return process.platform === "win32";
}
export function assertWindows(context) {
    if (!isWindows()) {
        throw new Error(`[${context}] This feature requires Windows platform.`);
    }
}
export function getMachineDisplayName() {
    return os.hostname();
}
// �-�-�- Async �-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-�-
export async function withTimeout(promise, timeoutMs, label = "operation") {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
        return await Promise.race([promise, timeout]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
export class TypedEventBus {
    listeners = new Map();
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const set = this.listeners.get(event);
        set.add(listener);
        return () => set.delete(listener);
    }
    async emit(event, data) {
        const set = this.listeners.get(event);
        if (!set)
            return;
        for (const listener of set) {
            await listener(data);
        }
    }
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
        }
        else {
            this.listeners.clear();
        }
    }
}
