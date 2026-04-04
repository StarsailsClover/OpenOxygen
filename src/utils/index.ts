/**
 * OpenOxygen - Utility Functions
 *
 * é€šç”¨å·¥å…·å‡½æ•°ï¼Œä¾›å…¨é¡¹ç›®ä½¿ç”¨ã€‚
 */

import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";

<<<<<<< HEAD
// ï¿?ï¿?ï¿? ID Generation ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?
=======
// === ID Generation ===
>>>>>>> dev

export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

export function generateShortId(length = 8): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, length);
}

export function generateTimestampId(prefix: string): string {
  const now = new Date();
  const ts = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  const suffix = generateShortId();
  return `${prefix}-${ts}-${suffix}`;
}

<<<<<<< HEAD
// ï¿?ï¿?ï¿? Path Utilities ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?
=======
// === Path Utilities ===
>>>>>>> dev

export function resolveUserPath(input: string): string {
  if (input.startsWith("~")) {
    return path.join(os.homedir(), input.slice(1));
  }
  return path.resolve(input);
}

export function ensureWindowsPath(p: string): string {
  return p.replace(/\//g, "\\");
}

export function normalizePathSeparators(p: string): string {
  if (process.platform === "win32") {
    return ensureWindowsPath(p);
  }
  return p.replace(/\\/g, "/");
}

/** Strip null bytes from paths to prevent ENOTDIR errors. */
export function sanitizePath(s: string): string {
  return s.replace(/\0/g, "");
}

<<<<<<< HEAD
// ï¿?ï¿?ï¿? Environment ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?

export function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

// ï¿?ï¿?ï¿? Timing ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?

export function nowMs(): number {
  return Date.now();
}

export function elapsed(startMs: number): number {
  return Date.now() - startMs;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ï¿?ï¿?ï¿? Data ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?

export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export function truncateString(
  s: string,
  maxLen: number,
  suffix = "...",
): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - suffix.length) + suffix;
}

// ï¿?ï¿?ï¿? Platform ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?
=======
// === Environment ===
>>>>>>> dev

export function isWindows(): boolean {
  return process.platform === "win32";
}

export function isMacOS(): boolean {
  return process.platform === "darwin";
}

export function isLinux(): boolean {
  return process.platform === "linux";
}

<<<<<<< HEAD
// ï¿?ï¿?ï¿? Async ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?
=======
// === Time ===

export function nowMs(): number {
  return Date.now();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

// === Async ===
>>>>>>> dev

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs),
    ),
  ]);
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    delay?: number;
    backoff?: number;
  } = {},
): Promise<T> {
  const { attempts = 3, delay = 1000, backoff = 2 } = options;

  let lastError: Error;
  let currentDelay = delay;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < attempts - 1) {
        await sleep(currentDelay);
        currentDelay *= backoff;
      }
    }
  }

  throw lastError!;
}

// === Validation ===

export function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

<<<<<<< HEAD
// ï¿?ï¿?ï¿? Event Emitter (lightweight typed) ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?ï¿?

type Listener<T> = (data: T) => void | Promise<void>;

export class TypedEventBus<TEventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof TEventMap, Set<Listener<unknown>>>();

  on<K extends keyof TEventMap>(
    event: K,
    listener: Listener<TEventMap[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<unknown>);
    return () => set.delete(listener as Listener<unknown>);
  }

  async emit<K extends keyof TEventMap>(
    event: K,
    data: TEventMap[K],
  ): Promise<void> {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      await listener(data);
    }
  }

  removeAllListeners(event?: keyof TEventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
=======
export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
>>>>>>> dev
}

export function isValidPath(s: string): boolean {
  // Basic path validation
  if (s.includes("\0")) return false;
  if (s.includes("..") && !s.startsWith("..")) return false;
  return true;
}

// === String ===

export function truncate(s: string, maxLength: number, suffix = "..."): string {
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength - suffix.length) + suffix;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export function camelCase(s: string): string {
  return s
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

export function snakeCase(s: string): string {
  return s
    .replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
    .replace(/^_/, "");
}

// === Object ===

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete (result as any)[key];
  }
  return result;
}

// === Exports ===

export {
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
