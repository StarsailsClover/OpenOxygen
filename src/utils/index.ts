/**
 * OpenOxygen — Utility Functions
 *
 * 通用工具函数集，供全项目使用。
 */

import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";

// ─── ID Generation ──────────────────────────────────────────────────────────

export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

export function generateShortId(length = 8): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, length);
}

export function generateTimestampId(prefix: string): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
  const suffix = generateShortId();
  return `${prefix}-${ts}-${suffix}`;
}

// ─── Path Utilities ─────────────────────────────────────────────────────────

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
  // eslint-disable-next-line no-control-regex
  return s.replace(/\0/g, "");
}

// ─── Environment ────────────────────────────────────────────────────────────

export function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

// ─── Timing ─────────────────────────────────────────────────────────────────

export function nowMs(): number {
  return Date.now();
}

export function elapsed(startMs: number): number {
  return Date.now() - startMs;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Data ───────────────────────────────────────────────────────────────────

export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export function truncateString(s: string, maxLen: number, suffix = "..."): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - suffix.length) + suffix;
}

// ─── Platform ───────────────────────────────────────────────────────────────

export function isWindows(): boolean {
  return process.platform === "win32";
}

export function assertWindows(context: string): void {
  if (!isWindows()) {
    throw new Error(`[${context}] This feature requires Windows platform.`);
  }
}

export function getMachineDisplayName(): string {
  return os.hostname();
}

// ─── Async ──────────────────────────────────────────────────────────────────

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "operation",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ─── Event Emitter (lightweight typed) ──────────────────────────────────────

type Listener<T> = (data: T) => void | Promise<void>;

export class TypedEventBus<TEventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof TEventMap, Set<Listener<unknown>>>();

  on<K extends keyof TEventMap>(event: K, listener: Listener<TEventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<unknown>);
    return () => set.delete(listener as Listener<unknown>);
  }

  async emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): Promise<void> {
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
}
