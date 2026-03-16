/**
 * OxygenBrowser — OpenOxygen 专用浏览器引擎 (Simplified v1)
 *
 * 当前实现状态：框架搭建，核心功能待实现
 * TODO:
 * - [ ] Chromium 进程管理
 * - [ ] CDP 客户端完整封装
 * - [ ] Cookie 继承实现
 * - [ ] CSS 选择器元素定位
 */

import type { ToolResult } from "../../types/index.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type BrowserEngine = "chromium" | "webkit" | "firefox";

export type BrowserElement = {
  id: string;
  selector: string;
  tagName: string;
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  visible: boolean;
  clickable: boolean;
  inputType?: string;
  attributes: Record<string, string>;
  computedStyle: Record<string, string>;
};

export type BrowserConfig = {
  engine: BrowserEngine;
  headless: boolean;
  windowSize: { width: number; height: number };
};

// ─── Default Config ─────────────────────────────────────────────────────────

export function createDefaultBrowserConfig(): BrowserConfig {
  return {
    engine: "chromium",
    headless: false,
    windowSize: { width: 1920, height: 1080 },
  };
}

// ─── Session Manager (Planned) ─────────────────────────────────────────────

export async function createBrowserSession(
  config?: Partial<BrowserConfig>,
): Promise<{ id: string; alive: boolean }> {
  // TODO: Launch Chromium with CDP
  console.log("[OxygenBrowser] Session creation not yet implemented");
  return { id: "browser-dummy", alive: true };
}

export function destroyBrowserSession(sessionId: string): void {
  console.log(`[OxygenBrowser] Destroy session: ${sessionId}`);
}

// ─── Page Operations (Planned) ───────────────────────────────────────────────

export async function navigate(sessionId: string, url: string): Promise<ToolResult> {
  // TODO: CDP Page.navigate
  return {
    success: false,
    error: "OxygenBrowser not fully implemented. Use external browser via native module.",
    durationMs: 0,
  };
}

export async function findElement(
  sessionId: string,
  selector: string,
): Promise<BrowserElement | null> {
  // TODO: CDP Runtime.evaluate + DOM query
  return null;
}

export async function clickElement(sessionId: string, selector: string): Promise<ToolResult> {
  // TODO: CDP Input.dispatchMouseEvent
  return { success: false, error: "Not implemented", durationMs: 0 };
}

export async function typeText(
  sessionId: string,
  selector: string,
  text: string,
): Promise<ToolResult> {
  // TODO: CDP Input.insertText
  return { success: false, error: "Not implemented", durationMs: 0 };
}

// ─── Cookie Inheritance (Planned) ───────────────────────────────────────────

export function findSystemBrowserCookies(): { edge?: string; chrome?: string } {
  const paths: { edge?: string; chrome?: string } = {};

  const edgePath = `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\User Data\\Default\\Network\\Cookies`;
  const chromePath = `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data\\Default\\Network\\Cookies`;

  const fs = require("node:fs");
  if (fs.existsSync(edgePath)) paths.edge = edgePath;
  if (fs.existsSync(chromePath)) paths.chrome = chromePath;

  return paths;
}

export async function copyCookiesToSession(
  sourcePath: string,
  targetDir: string,
): Promise<boolean> {
  // TODO: Copy cookies database
  console.log(`[OxygenBrowser] Copy cookies from ${sourcePath} to ${targetDir}`);
  return false;
}
