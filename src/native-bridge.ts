/**
 * OpenOxygen — Native Bridge v2
 *
 * TypeScript ↔ Rust 绑定层。
 * 优先加载 Rust native 模块，加载失败时 fallback 到纯 TS 实现。
 * 覆盖全部 native 函数：系统信息、截图、输入(v2)、窗口、进程、
 * 剪贴板、注册表、向量检索、视觉、UI Automation、沙箱。
 */

import { createSubsystemLogger } from "./logging/index.js";

const log = createSubsystemLogger("native-bridge");

// ─── Result Types ───────────────────────────────────────────────────────────

type InputResult = { success: boolean; error?: string };
type CaptureResult = { success: boolean; path?: string; width: number; height: number; durationMs: number; error?: string };
type WindowInfo = { hwnd: number; title: string; className: string; x: number; y: number; width: number; height: number; visible: boolean; focused: boolean };
type ProcessInfo = { pid: number; name: string; memoryBytes: number };
type VectorSearchResult = { index: number; score: number };
type UiaElement = { automationId: string; name: string; controlType: string; className: string; x: number; y: number; width: number; height: number; isEnabled: boolean; isOffscreen: boolean; hasKeyboardFocus: boolean };
type DetectedRegion = { x: number; y: number; width: number; height: number; area: number; aspectRatio: number; label: string };
type TemplateMatch = { x: number; y: number; score: number };
type ScreenMetrics = { physicalWidth: number; physicalHeight: number; logicalWidth: number; logicalHeight: number; dpiX: number; dpiY: number; scaleFactor: number };
type PrivilegeInfo = { isAdmin: boolean; isSystem: boolean; integrityLevel: string; canInjectInput: boolean; canAccessUipi: boolean };
type InputAction = { actionType: string; x?: number; y?: number; button?: string; text?: string; keys?: string; delta?: number; delayMs?: number };
type SandboxResult = { success: boolean; exitCode?: number; stdout: string; stderr: string; durationMs: number; error?: string; timedOut: boolean };

// ─── Full Native Module Type ────────────────────────────────────────────────

export type NativeModule = {
  // System
  nativeVersion: () => string;
  getSystemInfo: () => { platform: string; arch: string; cpuCount: number; totalMemoryMb: number; freeMemoryMb: number };

  // Screen capture
  captureScreen: (outputPath: string) => CaptureResult;
  captureRegion: (x: number, y: number, width: number, height: number, outputPath: string) => CaptureResult;

  // Input v2 — basic
  mouseClick: (x: number, y: number, button: string) => InputResult;
  mouseDoubleClick: (x: number, y: number) => InputResult;
  mouseMove: (x: number, y: number) => InputResult;
  mouseScroll: (delta: number) => InputResult;
  typeText: (text: string) => InputResult;
  sendHotkey: (keys: string) => InputResult;

  // Input v2 — smooth
  mouseMoveSmooth: (x: number, y: number, durationMs?: number, curve?: string) => InputResult;
  mouseClickSmooth: (x: number, y: number, button?: string, moveDurationMs?: number) => InputResult;
  replayInputSequence: (actions: InputAction[]) => InputResult;

  // Input v2 — privilege
  isElevated: () => boolean;
  getPrivilegeInfo: () => PrivilegeInfo;
  requestElevation: () => InputResult;

  // Input v2 — DPI
  getScreenMetrics: () => ScreenMetrics;
  logicalToPhysical: (x: number, y: number) => number[];
  physicalToLogical: (x: number, y: number) => number[];

  // Input v2 — virtual driver
  sendMessageToWindow: (hwnd: number, message: string, keyCode?: number, text?: string) => InputResult;
  clickInWindow: (hwnd: number, x: number, y: number, button?: string) => InputResult;
  allowSetForeground: () => InputResult;

  // Window management
  listWindows: () => WindowInfo[];
  getForegroundWindowInfo: () => WindowInfo | null;
  focusWindow: (hwnd: number) => boolean;

  // Clipboard
  clipboardGetText: () => string | null;
  clipboardSetText: (text: string) => InputResult;

  // Process
  listProcesses: () => ProcessInfo[];
  killProcess: (pid: number) => boolean;

  // Registry
  registryReadString: (keyPath: string, valueName: string) => string | null;
  registryWriteString: (keyPath: string, valueName: string, value: string) => InputResult;

  // Vector search (SIMD)
  cosineSimilarity: (a: number[], b: number[]) => number;
  vectorSearch: (query: number[], documents: number[][], topK: number, minScore?: number) => VectorSearchResult[];
  normalizeVector: (v: number[]) => number[];

  // Vision — image processing
  getImageMeta: (path: string) => { width: number; height: number; channels: number; sizeBytes: number };
  cropImage: (inputPath: string, outputPath: string, x: number, y: number, width: number, height: number) => boolean;
  resizeImage: (inputPath: string, outputPath: string, width: number, height: number) => boolean;
  toGrayscale: (inputPath: string, outputPath: string) => boolean;
  imageDiffPercent: (pathA: string, pathB: string) => number;
  detectEdges: (inputPath: string, outputPath: string, threshold?: number) => boolean;
  detectConnectedRegions: (edgeImagePath: string, minArea?: number, maxRegions?: number) => DetectedRegion[];
  templateMatch: (screenshotPath: string, templatePath: string, threshold?: number) => TemplateMatch[];

  // Vision — UI Automation
  getUiElements: (hwnd: number | null) => UiaElement[];
  getElementAtPoint: (x: number, y: number) => UiaElement | null;
  getFocusedElement: () => UiaElement | null;

  // Sandbox
  sandboxExec: (command: string, args: string[], cwd: string | null, config: { timeoutMs: number; maxMemoryMb: number }) => SandboxResult;
};

// ─── Module Loading ─────────────────────────────────────────────────────────

let nativeModule: NativeModule | null = null;
let loadAttempted = false;

export function loadNativeModule(): NativeModule | null {
  if (loadAttempted) return nativeModule;
  loadAttempted = true;

  try {
    const { createRequire } = await_import_module();
    const req = createRequire(import.meta.url);
    const mod = req("@openoxygen/core-native") as NativeModule;
    nativeModule = mod;
    log.info(`Native module loaded: ${mod.nativeVersion()}`);
    return mod;
  } catch {
    try {
      // Fallback: try direct path
      const { createRequire } = await_import_module();
      const req = createRequire(import.meta.url);
      const mod = req("../packages/core-native/index.js") as NativeModule;
      nativeModule = mod;
      log.info(`Native module loaded (fallback path): ${mod.nativeVersion()}`);
      return mod;
    } catch {
      log.warn("Native module not available, using TypeScript fallback");
      return null;
    }
  }
}

function await_import_module(): { createRequire: (url: string) => (id: string) => unknown } {
  // Dynamic import workaround for ESM
  return require("node:module") as { createRequire: (url: string) => (id: string) => unknown };
}

export function isNativeAvailable(): boolean {
  return loadNativeModule() !== null;
}

export function requireNative(): NativeModule {
  const mod = loadNativeModule();
  if (!mod) {
    throw new Error("Native module required but not available. Run `npm run build:native` first.");
  }
  return mod;
}
