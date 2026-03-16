/**
 * OxygenBrowser — OpenOxygen 专用浏览器引擎
 *
 * 26w14a Phase 2 实现：
 *   ✅ CDP 基础客户端
 *   ✅ Chromium 进程管理
 *   ✅ Cookie 检测
 *   ⏳ Cookie 复制实现
 *   ⏳ CSS 选择器元素定位
 *   ⏳ Hybrid fallback 策略
 *
 * 与外部浏览器的关系：
 *   - OxygenBrowser：首选，CSS 选择器精准定位（开发中）
 *   - 系统 Chrome/Edge：备选，UIA+VLM 混合定位
 */

import { spawn, ChildProcess } from "node:child_process";
import { WebSocket } from "ws";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, generateShortId, nowMs } from "../../utils/index.js";
import type { ToolResult } from "../../types/index.js";

const log = createSubsystemLogger("execution/browser");

// ─── Types ──────────────────────────────────────────────────────────────────

export type BrowserElement = {
  id: string;
  selector: string;
  tagName: string;
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  visible: boolean;
  clickable: boolean;
};

export type BrowserSession = {
  id: string;
  process: ChildProcess | null;
  cdpClient: CDPClient | null;
  cdpPort: number;
  wsEndpoint: string;
  userDataDir: string;
  alive: boolean;
};

// ─── CDP Client ─────────────────────────────────────────────────────────────

class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private eventHandlers = new Map<string, ((params: unknown) => void)[]>();

  async connect(wsEndpoint: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsEndpoint);
      
      this.ws.on("open", () => {
        log.info(`CDP connected: ${wsEndpoint}`);
        resolve();
      });
      
      this.ws.on("error", (err) => {
        log.error(`CDP connection error: ${err}`);
        reject(err);
      });
      
      this.ws.on("message", (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject } = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
          if (msg.method) {
            const handlers = this.eventHandlers.get(msg.method) || [];
            handlers.forEach(h => h(msg.params));
          }
        } catch (e) {
          log.error(`CDP message parse error: ${e}`);
        }
      });
    });
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("CDP not connected"));
        return;
      }
      const id = ++this.messageId;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event: string, handler: (params: unknown) => void): void {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, []);
    this.eventHandlers.get(event)!.push(handler);
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

// ─── Session Management ─────────────────────────────────────────────────────

const sessions = new Map<string, BrowserSession>();

export async function createBrowserSession(): Promise<BrowserSession> {
  const cdpPort = 9222;
  const userDataDir = "D:\\Coding\\OpenOxygen\\.state\\browser-" + generateShortId(8);
  
  // Launch Chromium
  const chromiumPath = process.env.OXYGEN_BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const args = [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=1920,1080`,
    `--no-first-run`,
    `--no-default-browser-check`,
  ];

  log.info(`Launching Chromium: ${chromiumPath} --remote-debugging-port=${cdpPort}`);
  
  const process_ = spawn(chromiumPath, args, { detached: false });
  
  const session: BrowserSession = {
    id: generateId("browser"),
    process: process_,
    cdpClient: new CDPClient(),
    cdpPort,
    wsEndpoint: ``,
    userDataDir,
    alive: true,
  };

  sessions.set(session.id, session);

  // Wait for CDP
  const http = await import("node:http");
  const cdpInfo = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("CDP timeout")), 30000);
    const check = () => {
      const req = http.get(`http://127.0.0.1:${cdpPort}/json/version`, (res: any) => {
        let data = "";
        res.on("data", (chunk: string) => data += chunk);
        res.on("end", () => {
          clearTimeout(timeout);
          try {
            resolve(JSON.parse(data));
          } catch { reject(new Error("Invalid CDP response")); }
        });
      });
      req.on("error", () => setTimeout(check, 500));
      req.setTimeout(500, () => req.destroy());
    };
    check();
  });

  const wsUrl = cdpInfo["webSocketDebuggerUrl"] || cdpInfo["WebSocket-Debugger-Url"] || `ws://127.0.0.1:${cdpPort}/devtools/browser`;
  session.wsEndpoint = wsUrl;
  if (session.cdpClient) {
    await session.cdpClient.connect(session.wsEndpoint);
  }
  
  // Enable page events
  const cdp = session.cdpClient;
  if (cdp) {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("DOM.enable");
  }

  log.info(`Browser session created: ${session.id} (CDP: ${cdpPort})`);
  return session;
}

export function destroyBrowserSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.alive = false;
  session.cdpClient?.disconnect();
  
  if (session.process) {
    try { session.process.kill("SIGTERM"); } catch {}
  }

  // Cleanup
  const fs = require("node:fs");
  if (fs.existsSync(session.userDataDir)) {
    try { fs.rmSync(session.userDataDir, { recursive: true, force: true }); } catch {}
  }

  sessions.delete(sessionId);
  log.info(`Browser session destroyed: ${sessionId}`);
}

// ─── Page Operations ────────────────────────────────────────────────────────

export async function navigate(sessionId: string, url: string): Promise<ToolResult> {
  const session = sessions.get(sessionId);
  if (!session || !session.alive || !session.cdpClient) {
    return { success: false, error: "Session not available", durationMs: 0 };
  }

  const start = nowMs();
  try {
    await session.cdpClient.send("Page.navigate", { url });
    await new Promise(r => setTimeout(r, 2000)); // Wait for load
    
    return {
      success: true,
      output: `Navigated to ${url}`,
      durationMs: nowMs() - start,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message,
      durationMs: nowMs() - start,
    };
  }
}

export async function getPageInfo(sessionId: string): Promise<{ url: string; title: string } | null> {
  const session = sessions.get(sessionId);
  if (!session?.cdpClient) return null;

  try {
    const result = await session.cdpClient.send("Runtime.evaluate", {
      expression: "({ url: window.location.href, title: document.title })"
    }) as any;
    return result?.result?.value || null;
  } catch {
    return null;
  }
}

export async function querySelector(
  sessionId: string,
  selector: string,
): Promise<BrowserElement | null> {
  const session = sessions.get(sessionId);
  if (!session?.cdpClient) return null;

  try {
    const result = await session.cdpClient.send("Runtime.evaluate", {
      expression: `
        (function() {
          const el = document.querySelector("${selector.replace(/"/g, '\\"')}");
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            tagName: el.tagName,
            text: el.textContent?.substring(0, 100) || "",
            bounds: {
              x: rect.x + window.scrollX,
              y: rect.y + window.scrollY,
              width: rect.width,
              height: rect.height
            },
            visible: rect.width > 0 && rect.height > 0
          };
        })()
      `,
    }) as any;

    const data = result?.result?.value;
    if (!data) return null;

    return {
      id: generateId("el"),
      selector,
      tagName: data.tagName,
      text: data.text,
      bounds: data.bounds,
      visible: data.visible,
      clickable: data.visible,
    };
  } catch (e) {
    log.error(`Query selector failed: ${e}`);
    return null;
  }
}

// ─── Cookie Management ────────────────────────────────────────────────────

export function findSystemBrowserCookies(): { edge?: string; chrome?: string } {
  const paths: { edge?: string; chrome?: string } = {};
  const localAppData = process.env.LOCALAPPDATA || "";

  const edgePath = `${localAppData}\\Microsoft\\Edge\\User Data\\Default\\Cookies`;
  const chromePath = `${localAppData}\\Google\\Chrome\\User Data\\Default\\Cookies`;

  const fs = require("node:fs");
  if (fs.existsSync(edgePath)) paths.edge = edgePath;
  if (fs.existsSync(chromePath)) paths.chrome = chromePath;

  return paths;
}

export async function copyCookies(
  sourcePath: string,
  targetDir: string,
): Promise<boolean> {
  const fs = require("node:fs/promises");
  const path = require("node:path");
  
  try {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(sourcePath, path.join(targetDir, "Cookies"));
    log.info(`Copied cookies to ${targetDir}`);
    return true;
  } catch (e) {
    log.warn(`Failed to copy cookies: ${e}`);
    return false;
  }
}

export { sessions };
