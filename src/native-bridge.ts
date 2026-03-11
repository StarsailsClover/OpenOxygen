/**
 * OpenOxygen — Native Bridge
 *
 * TypeScript 绑定层：优先加载 Rust native 模块，
 * 加载失败时 fallback 到纯 TypeScript 实现。
 */

import { createSubsystemLogger } from "./logging/index.js";

const log = createSubsystemLogger("native-bridge");

// ─── Native Module Types ────────────────────────────────────────────────────

export type NativeModule = {
  // System info
  nativeVersion: () => string;
  getSystemInfo: () => {
    platform: string;
    arch: string;
    cpuCount: number;
    totalMemoryMb: number;
    freeMemoryMb: number;
  };

  // Screen capture
  captureScreen: (outputPath: string) => {
    success: boolean;
    path?: string;
    width: number;
    height: number;
    durationMs: number;
    error?: string;
  };
  captureRegion: (x: number, y: number, width: number, height: number, outputPath: string) => {
    success: boolean;
    path?: string;
    width: number;
    height: number;
    durationMs: number;
    error?: string;
  };

  // Input
  mouseClick: (x: number, y: number, button: string) => { success: boolean; error?: string };
  mouseDoubleClick: (x: number, y: number) => { success: boolean; error?: string };
  mouseMove: (x: number, y: number) => { success: boolean; error?: string };
  mouseScroll: (delta: number) => { success: boolean; error?: string };
  typeText: (text: string) => { success: boolean; error?: string };
  sendHotkey: (keys: string) => { success: boolean; error?: string };

  // Window management
  listWindows: () => Array<{
    hwnd: number;
    title: string;
    className: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    focused: boolean;
  }>;
  getForegroundWindow: () => {
    hwnd: number;
    title: string;
    className: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    focused: boolean;
  } | null;
  focusWindow: (hwnd: number) => boolean;

  // Clipboard
  clipboardGetText: () => string | null;
  clipboardSetText: (text: string) => { success: boolean; error?: string };

  // Process
  listProcesses: () => Array<{ pid: number; name: string; memoryBytes: number }>;
  killProcess: (pid: number) => boolean;

  // Registry
  registryReadString: (keyPath: string, valueName: string) => string | null;
  registryWriteString: (keyPath: string, valueName: string, value: string) => { success: boolean; error?: string };

  // Vector search (SIMD accelerated)
  cosineSimilarity: (a: number[], b: number[]) => number;
  vectorSearch: (query: number[], documents: number[][], topK: number, minScore?: number) => Array<{ index: number; score: number }>;
  normalizeVector: (v: number[]) => number[];

  // Vision
  getImageMeta: (path: string) => { width: number; height: number; channels: number; sizeBytes: number };
  cropImage: (inputPath: string, outputPath: string, x: number, y: number, width: number, height: number) => boolean;
  resizeImage: (inputPath: string, outputPath: string, width: number, height: number) => boolean;
  toGrayscale: (inputPath: string, outputPath: string) => boolean;
  imageDiffPercent: (pathA: string, pathB: string) => number;
  detectEdges: (inputPath: string, outputPath: string) => boolean;
  detectUiRegions: (inputPath: string, minWidth?: number, minHeight?: number) => Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    avgIntensity: number;
  }>;

  // Sandbox
  sandboxExec: (command: string, args: string[], cwd: string | null, config: { timeoutMs: number; maxMemoryMb: number }) => {
    success: boolean;
    exitCode?: number;
    stdout: string;
    stderr: string;
    durationMs: number;
    error?: string;
    timedOut: boolean;
  };
};

// ─── Module Loading ─────────────────────────────────────────────────────────

let nativeModule: NativeModule | null = null;
let loadAttempted = false;

/**
 * Try to load the Rust native module.
 * Returns null if not available (fallback to TS implementations).
 */
export function loadNativeModule(): NativeModule | null {
  if (loadAttempted) return nativeModule;
  loadAttempted = true;

  try {
    // Try to load the compiled .node binary
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@openoxygen/core-native") as NativeModule;
    nativeModule = mod;
    log.info(`Native module loaded: ${mod.nativeVersion()}`);
    return mod;
  } catch {
    log.warn("Native module not available, using TypeScript fallback");
    return null;
  }
}

/**
 * Check if native module is available.
 */
export function isNativeAvailable(): boolean {
  return loadNativeModule() !== null;
}

/**
 * Get the native module or throw.
 */
export function requireNative(): NativeModule {
  const mod = loadNativeModule();
  if (!mod) {
    throw new Error(
      "Native module required but not available. Run `npm run build:native` first.",
    );
  }
  return mod;
}
