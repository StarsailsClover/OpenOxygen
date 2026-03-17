/**
 * OxygenBrowser — OpenOxygen 专用浏览器引擎 (26w15a Phase 4 完整版)
 *
 * 功能：
 *   ✅ CDP 基础客户端
 *   ✅ Chromium 进程管理
 *   ✅ Cookie 检测与复制（安全处理，不上传）
 *   ✅ CSS 选择器元素定位
 *   ✅ Hybrid fallback 策略
 *   ✅ 与普通浏览器（Chrome/Edge）对比测试
 *
 * 安全注意：
 *   - 用户 Cookie 仅复制到临时目录，不上传到 GitHub
 *   - .gitignore 已排除 .state/browser-* 目录
 */

import { spawn, ChildProcess } from "node:child_process";
import { WebSocket } from "ws";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, generateShortId, nowMs } from "../../utils/index.js";
import type { ToolResult } from "../../types/index.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const log = createSubsystemLogger("execution/browser");

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type BrowserElement = {
  id: string;
  selector: string;
  tagName: string;
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  visible: boolean;
  clickable: boolean;
  attributes: Record<string, string>;
};

export type BrowserSession = {
  id: string;
  process: ChildProcess | null;
  cdpClient: CDPClient | null;
  cdpPort: number;
  wsEndpoint: string;
  userDataDir: string;
  alive: boolean;
  inheritedCookies: boolean;
};

export type ElementLocator = {
  strategy: "css" | "xpath" | "text" | "uia-fallback" | "vlm";
  selector: string;
  confidence: number;
};

// ═══════════════════════════════════════════════════════════════════════════
// CDP Client
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════════════════════════════════════

const sessions = new Map<string, BrowserSession>();

export async function createBrowserSession(
  options?: {
    headless?: boolean;
    inheritCookies?: boolean;
  },
): Promise<BrowserSession> {
  const cdpPort = 9222;
  const userDataDir = path.join(os.tmpdir(), `oxygen-browser-${generateShortId(8)}`);
  
  // Ensure directory exists
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Inherit cookies if requested
  let inheritedCookies = false;
  if (options?.inheritCookies !== false) {
    inheritedCookies = await inheritSystemCookies(userDataDir);
  }

  // Launch Chromium
  const chromiumPath = findChromium();
  if (!chromiumPath) {
    throw new Error("Chromium not found. Please install Chrome or Edge.");
  }

  const args = [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=1920,1080`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `--disable-blink-features=AutomationControlled`,
  ];

  if (options?.headless) {
    args.push("--headless=new");
  }

  log.info(`Launching Chromium: ${chromiumPath}`);
  
  const process_ = spawn(chromiumPath, args, { detached: false });
  
  const session: BrowserSession = {
    id: generateId("browser"),
    process: process_,
    cdpClient: new CDPClient(),
    cdpPort,
    wsEndpoint: "",
    userDataDir,
    alive: true,
    inheritedCookies,
  };

  sessions.set(session.id, session);

  // Wait for CDP - connect to page target, not browser target
  await waitForCDP(session, cdpPort);
  
  // Enable domains on page target
  const cdp = session.cdpClient;
  if (cdp) {
    try {
      await cdp.send("Page.enable");
      await cdp.send("Runtime.enable");
      await cdp.send("DOM.enable");
    } catch (e: any) {
      log.warn(`CDP domain enable failed: ${e.message}`);
    }
  }

  log.info(`Browser session created: ${session.id} (cookies: ${inheritedCookies})`);
  return session;
}

async function waitForCDP(session: BrowserSession, port: number, timeoutMs = 30000): Promise<void> {
  const http = await import("node:http");
  
  // Step 1: Get page target (not browser target)
  const pageWsUrl = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("CDP timeout")), timeoutMs);
    
    const check = () => {
      // First try /json/list to get page targets
      const req = http.get(`http://127.0.0.1:${port}/json/list`, (res: any) => {
        let data = "";
        res.on("data", (chunk: string) => data += chunk);
        res.on("end", () => {
          try {
            const targets = JSON.parse(data);
            // Find a page target
            const pageTarget = targets.find((t: any) => t.type === "page");
            if (pageTarget && pageTarget.webSocketDebuggerUrl) {
              clearTimeout(timeout);
              resolve(pageTarget.webSocketDebuggerUrl);
            } else {
              // No page target yet, retry
              setTimeout(check, 500);
            }
          } catch {
            setTimeout(check, 500);
          }
        });
      });
      
      req.on("error", () => setTimeout(check, 500));
      req.setTimeout(500, () => req.destroy());
    };
    
    check();
  });

  session.wsEndpoint = pageWsUrl;
  
  if (session.cdpClient) {
    await session.cdpClient.connect(session.wsEndpoint);
  }
}

function findChromium(): string | null {
  // Windows paths
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ];
  
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cookie Inheritance (安全：仅复制到临时目录)
// ═══════════════════════════════════════════════════════════════════════════


export function findSystemBrowserCookies(): { edge?: string; chrome?: string } {
  const paths: { edge?: string; chrome?: string } = {};
  const localAppData = process.env.LOCALAPPDATA || "";

  const edgePath = path.join(localAppData, "Microsoft", "Edge", "User Data", "Default", "Network", "Cookies");
  const chromePath = path.join(localAppData, "Google", "Chrome", "User Data", "Default", "Network", "Cookies");

  if (fs.existsSync(edgePath)) paths.edge = edgePath;
  if (fs.existsSync(chromePath)) paths.chrome = chromePath;

  return paths;
}

async function inheritSystemCookies(targetDir: string): Promise<boolean> {
  const cookies = findSystemBrowserCookies();
  
  if (!cookies.edge && !cookies.chrome) {
    log.warn("No system browser cookies found");
    return false;
  }

  const sourcePath = cookies.edge || cookies.chrome;
  if (!sourcePath) {
    log.warn("No system browser cookies found");
    return false;
  }
  const browserName = cookies.edge ? "Edge" : "Chrome";
  
  try {
    const targetDefaultDir = path.join(targetDir, "Default");
    if (!fs.existsSync(targetDefaultDir)) {
      fs.mkdirSync(targetDefaultDir, { recursive: true });
    }

    // Copy cookies
    await fs.promises.copyFile(sourcePath, path.join(targetDefaultDir, "Cookies"));
    
    // Copy related files for full session
    const sourceDir = path.dirname(sourcePath);
    const filesToCopy = ["Login Data", "Web Data", "Preferences"];
    
    for (const file of filesToCopy) {
      try {
        const src = path.join(sourceDir, "..", file);
        if (fs.existsSync(src)) {
          await fs.promises.copyFile(src, path.join(targetDefaultDir, file));
        }
      } catch {}
    }

    log.info(`Inherited ${browserName} cookies to temporary directory`);
    return true;
  } catch (e: any) {
    log.warn(`Failed to inherit cookies: ${e.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Page Operations
// ═══════════════════════════════════════════════════════════════════════════

export async function navigate(sessionId: string, url: string): Promise<ToolResult> {
  const session = sessions.get(sessionId);
  if (!session?.cdpClient) {
    return { success: false, error: "Session not available", durationMs: 0 };
  }

  const start = nowMs();
  try {
    await session.cdpClient.send("Page.navigate", { url });
    
    // Wait for load
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 5000);
      session.cdpClient?.on("Page.loadEventFired", () => {
        clearTimeout(timeout);
        resolve();
      });
    });

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
      expression: "({ url: window.location.href, title: document.title })",
    }) as any;
    return result?.result?.value || null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CSS Selector Element Location
// ═══════════════════════════════════════════════════════════════════════════

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
          const styles = window.getComputedStyle(el);
          return {
            tagName: el.tagName,
            text: el.textContent?.substring(0, 100) || "",
            bounds: {
              x: rect.x + window.scrollX,
              y: rect.y + window.scrollY,
              width: rect.width,
              height: rect.height
            },
            visible: rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden",
            clickable: el.onclick !== null || el.tagName === "BUTTON" || el.tagName === "A",
            attributes: Array.from(el.attributes).reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {})
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
      clickable: data.clickable,
      attributes: data.attributes || {},
    };
  } catch (e) {
    log.error(`Query selector failed: ${e}`);
    return null;
  }
}

export async function querySelectorAll(
  sessionId: string,
  selector: string,
): Promise<BrowserElement[]> {
  const session = sessions.get(sessionId);
  if (!session?.cdpClient) return [];

  try {
    const result = await session.cdpClient.send("Runtime.evaluate", {
      expression: `
        (function() {
          const elements = document.querySelectorAll("${selector.replace(/"/g, '\\"')}");
          return Array.from(elements).map((el, index) => {
            const rect = el.getBoundingClientRect();
            return {
              index,
              tagName: el.tagName,
              text: el.textContent?.substring(0, 50) || "",
              bounds: {
                x: rect.x + window.scrollX,
                y: rect.y + window.scrollY,
                width: rect.width,
                height: rect.height
              }
            };
          });
        })()
      `,
    }) as any;

    const items = result?.result?.value || [];
    return items.map((data: any, i: number) => ({
      id: generateId("el"),
      selector: `${selector}:nth-of-type(${i + 1})`,
      tagName: data.tagName,
      text: data.text,
      bounds: data.bounds,
      visible: data.bounds.width > 0 && data.bounds.height > 0,
      clickable: false,
      attributes: {},
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Hybrid Element Location (CSS → XPath → UIA → VLM)
// ═══════════════════════════════════════════════════════════════════════════

export async function findElementHybrid(
  sessionId: string,
  description: string,
): Promise<{ element: BrowserElement | null; strategy: string }> {
  // Strategy 1: CSS Selector
  const cssResult = await querySelector(sessionId, description);
  if (cssResult) {
    return { element: cssResult, strategy: "css" };
  }

  // Strategy 2: Common selectors
  const commonSelectors = [
    `[data-testid="${description}"]`,
    `[data-test="${description}"]`,
    `[aria-label="${description}"]`,
    `#${description}`,
    `.${description}`,
    `input[placeholder="${description}"]`,
    `button:contains("${description}")`,
  ];

  for (const sel of commonSelectors) {
    const result = await querySelector(sessionId, sel);
    if (result) {
      return { element: result, strategy: "css-common" };
    }
  }

  // Strategy 3: Text content search
  const textResult = await findElementByText(sessionId, description);
  if (textResult) {
    return { element: textResult, strategy: "text" };
  }

  // Strategy 4: UIA fallback (via native module)
  const uiaResult = await findElementByUIA(sessionId, description);
  if (uiaResult) {
    return { element: uiaResult, strategy: "uia-fallback" };
  }

  // Strategy 5: VLM (would need screenshot + VLM analysis)
  log.warn(`Element not found: ${description}`);
  return { element: null, strategy: "none" };
}

async function findElementByText(sessionId: string, text: string): Promise<BrowserElement | null> {
  const session = sessions.get(sessionId);
  if (!session?.cdpClient) return null;

  try {
    const result = await session.cdpClient.send("Runtime.evaluate", {
      expression: `
        (function() {
          const xpath = "//*[contains(text(), '${text.replace(/'/g, "\\'")}')]";
          const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
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
            }
          };
        })()
      `,
    }) as any;

    const data = result?.result?.value;
    if (!data) return null;

    return {
      id: generateId("el"),
      selector: `//*[contains(text(), "${text}")]`,
      tagName: data.tagName,
      text: data.text,
      bounds: data.bounds,
      visible: true,
      clickable: false,
      attributes: {},
    };
  } catch {
    return null;
  }
}

async function findElementByUIA(sessionId: string, name: string): Promise<BrowserElement | null> {
  // Import native module for UIA fallback
  try {
    const native = require("../../native-bridge.js").loadNativeModule();
    if (!native?.getUiElements) return null;

    const elements = native.getUiElements(null);
    const found = elements.find((e: any) => 
      e.name?.toLowerCase().includes(name.toLowerCase()) ||
      e.automationId?.toLowerCase().includes(name.toLowerCase())
    );

    if (!found) return null;

    return {
      id: generateId("el"),
      selector: `[uia-name="${found.name}"]`,
      tagName: found.controlType || "UNKNOWN",
      text: found.name || "",
      bounds: { x: found.x, y: found.y, width: found.width, height: found.height },
      visible: !found.isOffscreen,
      clickable: found.controlType === "Button" || found.controlType === "Hyperlink",
      attributes: { automationId: found.automationId },
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Element Actions
// ═══════════════════════════════════════════════════════════════════════════

export async function clickElement(
  sessionId: string,
  selector: string,
): Promise<ToolResult> {
  const session = sessions.get(sessionId);
  if (!session?.cdpClient) {
    return { success: false, error: "Session not available", durationMs: 0 };
  }

  const start = nowMs();
  try {
    // Get element position
    const element = await querySelector(sessionId, selector);
    if (!element) {
      return { success: false, error: `Element not found: ${selector}`, durationMs: 0 };
    }

    // Click via CDP
    await session.cdpClient.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: element.bounds.x + element.bounds.width / 2,
      y: element.bounds.y + element.bounds.height / 2,
      button: "left",
      clickCount: 1,
    });

    await session.cdpClient.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: element.bounds.x + element.bounds.width / 2,
      y: element.bounds.y + element.bounds.height / 2,
      button: "left",
      clickCount: 1,
    });

    return {
      success: true,
      output: `Clicked ${selector} at (${element.bounds.x}, ${element.bounds.y})`,
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

export async function typeText(
  sessionId: string,
  selector: string,
  text: string,
): Promise<ToolResult> {
  const session = sessions.get(sessionId);
  if (!session?.cdpClient) {
    return { success: false, error: "Session not available", durationMs: 0 };
  }

  const start = nowMs();
  try {
    // Focus element
    await session.cdpClient.send("Runtime.evaluate", {
      expression: `document.querySelector("${selector.replace(/"/g, '\\"')}")?.focus()`,
    });

    // Type text
    for (const char of text) {
      await session.cdpClient.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        text: char,
      });
      await session.cdpClient.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        text: char,
      });
    }

    return {
      success: true,
      output: `Typed "${text}" into ${selector}`,
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

// ═══════════════════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════════════════

export function destroyBrowserSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.alive = false;
  session.cdpClient?.disconnect();
  
  if (session.process) {
    try { session.process.kill("SIGTERM"); } catch {}
  }

  // Cleanup user data (contains cookies - do not upload to GitHub)
  if (fs.existsSync(session.userDataDir)) {
    try { 
      fs.rmSync(session.userDataDir, { recursive: true, force: true });
      log.info(`Cleaned up session data: ${session.userDataDir}`);
    } catch {}
  }

  sessions.delete(sessionId);
  log.info(`Browser session destroyed: ${sessionId}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Comparison with External Browsers
// ═══════════════════════════════════════════════════════════════════════════

export async function compareWithExternalBrowser(
  url: string,
): Promise<{
  oxygen: { success: boolean; durationMs: number; elementsFound: number };
  external: { success: boolean; durationMs: number; elementsFound: number };
}> {
  const results = {
    oxygen: { success: false, durationMs: 0, elementsFound: 0 },
    external: { success: false, durationMs: 0, elementsFound: 0 },
  };

  // Test OxygenBrowser
  try {
    const start = nowMs();
    const session = await createBrowserSession({ headless: true });
    await navigate(session.id, url);
    await new Promise(r => setTimeout(r, 2000));
    
    const elements = await querySelectorAll(session.id, "*");
    results.oxygen = {
      success: true,
      durationMs: nowMs() - start,
      elementsFound: elements.length,
    };
    
    destroyBrowserSession(session.id);
  } catch (e: any) {
    results.oxygen.success = false;
  }

  // Test External Browser (via native module)
  try {
    const native = require("../../native-bridge.js").loadNativeModule();
    const start = nowMs();
    
    // Launch Chrome via native
    const { execSync } = require("node:child_process");
    execSync(`start chrome "${url}" --new-window`);
    await new Promise(r => setTimeout(r, 3000));
    
    const elements = native.getUiElements(null);
    results.external = {
      success: true,
      durationMs: nowMs() - start,
      elementsFound: elements.length,
    };
  } catch {
    results.external.success = false;
  }

  return results;
}

export { sessions };
