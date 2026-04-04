/**
 * OpenOxygen - Utility Functions
 *
 * 通用工具函数，供全项目使用。
 */
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
// === ID Generation ===
export function generateId(prefix) {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
}
export function generateShortId(length = 8) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, length);
}
export function generateTimestampId(prefix) {
    const now = new Date();
    const ts = now
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .replace("Z", "");
    const suffix = generateShortId();
    return `${prefix}-${ts}-${suffix}`;
}
// === Path Utilities ===
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
    return s.replace(/\0/g, "");
}
// === Environment ===
export function isWindows() {
    return process.platform === "win32";
}
export function isMacOS() {
    return process.platform === "darwin";
}
export function isLinux() {
    return process.platform === "linux";
}
// === Time ===
export function nowMs() {
    return Date.now();
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000)
        return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
}
export function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
}
// === Async ===
export async function withTimeout(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs)),
    ]);
}
export async function retry(fn, options = {}) {
    const { attempts = 3, delay = 1000, backoff = 2 } = options;
    let lastError;
    let currentDelay = delay;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (i < attempts - 1) {
                await sleep(currentDelay);
                currentDelay *= backoff;
            }
        }
    }
    throw lastError;
}
// === Validation ===
export function isValidUrl(s) {
    try {
        new URL(s);
        return true;
    }
    catch {
        return false;
    }
}
export function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
export function isValidPath(s) {
    if (s.includes("\0"))
        return false;
    if (s.includes("..") && !s.startsWith(".."))
        return false;
    return true;
}
// === String ===
export function truncate(s, maxLength, suffix = "...") {
    if (s.length <= maxLength)
        return s;
    return s.slice(0, maxLength - suffix.length) + suffix;
}
export function slugify(s) {
    return s
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 100);
}
export function camelCase(s) {
    return s
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, (_, c) => c.toLowerCase());
}
export function snakeCase(s) {
    return s
        .replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
        .replace(/^_/, "");
}
// === Object ===
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
export function pick(obj, keys) {
    const result = {};
    for (const key of keys) {
        result[key] = obj[key];
    }
    return result;
}
export function omit(obj, keys) {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
}
// === Default Export ===
export default {
    generateId,
    generateShortId,
    generateTimestampId,
    resolveUserPath,
    ensureWindowsPath,
    normalizePathSeparators,
    sanitizePath,
    isWindows,
    isMacOS,
    isLinux,
    nowMs,
    sleep,
    formatDuration,
    formatTimestamp,
    withTimeout,
    retry,
    isValidUrl,
    isValidEmail,
    isValidPath,
    truncate,
    slugify,
    camelCase,
    snakeCase,
    deepClone,
    pick,
    omit,
};
