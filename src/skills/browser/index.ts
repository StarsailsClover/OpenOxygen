/**
 * OpenOxygen - Browser Automation Skills
 *
 * High-frequency browser automation using CDP
 * Supports Chrome/Edge automation
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type { ToolResult } from "../../types/index.js";
import { spawn, ChildProcess } from "node:child_process";
import { WebSocket } from "ws";

const log = createSubsystemLogger("skills/browser");

// ============================================================================
// Types
// ============================================================================

export interface BrowserConfig {
  headless?: boolean;
  userDataDir?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
  executablePath?: string;
}

export interface NavigationOptions {
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  timeout?: number;
}

export interface ElementSelector {
  type: "css" | "xpath" | "text" | "id";
  value: string;
}

export interface BrowserSession {
  id: string;
  process: ChildProcess | null;
  wsClient: WebSocket | null;
  cdpPort: number;
  wsEndpoint: string;
  userDataDir: string;
  alive: boolean;
}

// ============================================================================
// Browser Management
// ============================================================================

const activeBrowsers = new Map<string, BrowserSession>();
let portCounter = 9222;

export async function launchBrowser(
  config?: BrowserConfig,
): Promise<ToolResult> {
  log.info("Launching browser");

  try {
    const browserId = `browser-${Date.now()}`;
    const cdpPort = portCounter++;
    const userDataDir = config?.userDataDir || `./.state/browser-${browserId}`;

    // Find Chrome/Edge executable
    const executablePath = config?.executablePath || await findBrowserExecutable();
    
    if (!executablePath) {
      return {
        success: false,
        error: "Could not find Chrome or Edge executable. Please install Chrome or Edge.",
      };
    }

    // Launch browser with CDP
    const args = [
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-default-apps",
      "--disable-popup-blocking",
    ];

    if (config?.headless) {
      args.push("--headless");
    }

    if (config?.viewport) {
      args.push(`--window-size=${config.viewport.width},${config.viewport.height}`);
    }

    const browserProcess = spawn(executablePath, args, {
      detached: false,
    });

    // Wait for CDP to be ready
    await waitForCdp(cdpPort, 10000);

    // Get WebSocket endpoint
    const wsEndpoint = await getWsEndpoint(cdpPort);

    // Connect via WebSocket
    const wsClient = new WebSocket(wsEndpoint);
    
    await new Promise<void>((resolve, reject) => {
      wsClient.on("open", resolve);
      wsClient.on("error", reject);
    });

    // Enable required CDP domains
    await sendCdpCommand(wsClient, "Runtime.enable");
    await sendCdpCommand(wsClient, "Page.enable");
    await sendCdpCommand(wsClient, "DOM.enable");

    const session: BrowserSession = {
      id: browserId,
      process: browserProcess,
      wsClient,
      cdpPort,
      wsEndpoint,
      userDataDir,
      alive: true,
    };

    activeBrowsers.set(browserId, session);

    log.info(`Browser launched: ${browserId} on port ${cdpPort}`);

    return {
      success: true,
      data: {
        browserId,
        pid: browserProcess.pid,
        wsEndpoint,
        cdpPort,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to launch browser: ${error}`,
    };
  }
}

export async function closeBrowser(browserId: string): Promise<ToolResult> {
  log.info(`Closing browser: ${browserId}`);

  const session = activeBrowsers.get(browserId);
  if (!session) {
    return {
      success: false,
      error: `Browser not found: ${browserId}`,
    };
  }

  try {
    // Close WebSocket connection
    if (session.wsClient) {
      session.wsClient.close();
    }

    // Kill browser process
    if (session.process) {
      session.process.kill();
    }

    session.alive = false;
    activeBrowsers.delete(browserId);

    return {
      success: true,
      data: { browserId, closed: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to close browser: ${error}`,
    };
  }
}

// ============================================================================
// Navigation
// ============================================================================

export async function navigate(
  browserId: string,
  url: string,
  options?: NavigationOptions,
): Promise<ToolResult> {
  log.info(`Navigating to: ${url}`);

  const session = activeBrowsers.get(browserId);
  if (!session) {
    return {
      success: false,
      error: `Browser not found: ${browserId}`,
    };
  }

  try {
    await sendCdpCommand(session.wsClient!, "Page.navigate", { url });

    // Wait for load event if requested
    if (options?.waitUntil) {
      const timeout = options.timeout || 30000;
      await waitForLoadEvent(session.wsClient!, options.waitUntil, timeout);
    }

    return {
      success: true,
      data: { url, loaded: true },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to navigate: ${error}`,
    };
  }
}

export async function goBack(browserId: string): Promise<ToolResult> {
  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    await sendCdpCommand(session.wsClient!, "Page.goBack");
    return { success: true, data: { action: "back" } };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function goForward(browserId: string): Promise<ToolResult> {
  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    await sendCdpCommand(session.wsClient!, "Page.goForward");
    return { success: true, data: { action: "forward" } };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function reload(browserId: string): Promise<ToolResult> {
  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    await sendCdpCommand(session.wsClient!, "Page.reload");
    return { success: true, data: { action: "reload" } };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getCurrentUrl(browserId: string): Promise<ToolResult> {
  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    const result = await sendCdpCommand(session.wsClient!, "Runtime.evaluate", {
      expression: "window.location.href",
    });

    return {
      success: true,
      data: { url: result.result?.value },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Element Interaction
// ============================================================================

export async function clickElement(
  browserId: string,
  selector: ElementSelector,
): Promise<ToolResult> {
  log.info(`Clicking element: ${selector.type}=${selector.value}`);

  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    const selectorStr = buildSelector(selector);
    const script = `
      (function() {
        const el = document.querySelector(${JSON.stringify(selectorStr)});
        if (el) {
          el.click();
          return { success: true };
        }
        return { success: false, error: "Element not found" };
      })()
    `;

    const result = await sendCdpCommand(session.wsClient!, "Runtime.evaluate", {
      expression: script,
      awaitPromise: true,
    });

    if (result.result?.value?.success) {
      return { success: true, data: { clicked: true } };
    } else {
      return { success: false, error: result.result?.value?.error || "Click failed" };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function typeText(
  browserId: string,
  selector: ElementSelector,
  text: string,
): Promise<ToolResult> {
  log.info(`Typing text into element: ${selector.type}=${selector.value}`);

  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    const selectorStr = buildSelector(selector);
    const script = `
      (function() {
        const el = document.querySelector(${JSON.stringify(selectorStr)});
        if (el) {
          el.focus();
          el.value = ${JSON.stringify(text)};
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true };
        }
        return { success: false, error: "Element not found" };
      })()
    `;

    const result = await sendCdpCommand(session.wsClient!, "Runtime.evaluate", {
      expression: script,
      awaitPromise: true,
    });

    if (result.result?.value?.success) {
      return { success: true, data: { typed: true } };
    } else {
      return { success: false, error: result.result?.value?.error || "Type failed" };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getElementText(
  browserId: string,
  selector: ElementSelector,
): Promise<ToolResult> {
  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    const selectorStr = buildSelector(selector);
    const script = `
      (function() {
        const el = document.querySelector(${JSON.stringify(selectorStr)});
        return el ? el.textContent : null;
      })()
    `;

    const result = await sendCdpCommand(session.wsClient!, "Runtime.evaluate", {
      expression: script,
    });

    return {
      success: true,
      data: { text: result.result?.value },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getElementAttribute(
  browserId: string,
  selector: ElementSelector,
  attribute: string,
): Promise<ToolResult> {
  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    const selectorStr = buildSelector(selector);
    const script = `
      (function() {
        const el = document.querySelector(${JSON.stringify(selectorStr)});
        return el ? el.getAttribute(${JSON.stringify(attribute)}) : null;
      })()
    `;

    const result = await sendCdpCommand(session.wsClient!, "Runtime.evaluate", {
      expression: script,
    });

    return {
      success: true,
      data: { attribute, value: result.result?.value },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function waitForElement(
  browserId: string,
  selector: ElementSelector,
  timeout: number = 10000,
): Promise<ToolResult> {
  log.info(`Waiting for element: ${selector.type}=${selector.value}`);

  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    const selectorStr = buildSelector(selector);
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const script = `
        (function() {
          return document.querySelector(${JSON.stringify(selectorStr)}) !== null;
        })()
      `;

      const result = await sendCdpCommand(session.wsClient!, "Runtime.evaluate", {
        expression: script,
      });

      if (result.result?.value) {
        return { success: true, data: { found: true } };
      }

      await new Promise(r => setTimeout(r, 100));
    }

    return { success: false, error: "Timeout waiting for element" };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Screenshot
// ============================================================================

export async function takeScreenshot(browserId: string): Promise<ToolResult> {
  log.info(`Taking screenshot: ${browserId}`);

  const session = activeBrowsers.get(browserId);
  if (!session) {
    return { success: false, error: `Browser not found: ${browserId}` };
  }

  try {
    const result = await sendCdpCommand(session.wsClient!, "Page.captureScreenshot");
    
    return {
      success: true,
      data: {
        screenshot: result.data,
        format: "base64",
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// CDP Utilities
// ============================================================================

async function findBrowserExecutable(): Promise<string | null> {
  const { execSync } = await import("node:child_process");
  
  const possiblePaths = [
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ];

  for (const path of possiblePaths) {
    try {
      const fs = await import("node:fs");
      if (fs.existsSync(path)) {
        return path;
      }
    } catch {
      // Continue to next path
    }
  }

  // Try to find via command
  try {
    if (process.platform === "win32") {
      const result = execSync("where chrome", { encoding: "utf-8" });
      return result.trim().split("\n")[0] || null;
    } else {
      const result = execSync("which google-chrome || which chromium", { encoding: "utf-8" });
      return result.trim() || null;
    }
  } catch {
    return null;
  }
}

async function waitForCdp(port: number, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      // Not ready yet
    }
    await new Promise(r => setTimeout(r, 100));
  }
  
  throw new Error("Timeout waiting for CDP");
}

async function getWsEndpoint(port: number): Promise<string> {
  const response = await fetch(`http://localhost:${port}/json/version`);
  const data = await response.json();
  return data.webSocketDebuggerUrl;
}

function sendCdpCommand(
  ws: WebSocket,
  method: string,
  params?: Record<string, unknown>,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    
    const message = JSON.stringify({ id, method, params });
    
    const handler = (data: WebSocket.RawData) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id === id) {
          ws.off("message", handler);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    ws.on("message", handler);
    ws.send(message);
  });
}

async function waitForLoadEvent(
  ws: WebSocket,
  event: string,
  timeout: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeout);

    const handler = (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.method === "Page.loadEventFired") {
          clearTimeout(timeoutId);
          ws.off("message", handler);
          resolve();
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.on("message", handler);
  });
}

function buildSelector(selector: ElementSelector): string {
  switch (selector.type) {
    case "css":
      return selector.value;
    case "id":
      return `#${selector.value}`;
    case "xpath":
      // Convert XPath to CSS (simplified)
      return selector.value;
    case "text":
      // Use attribute selector for text content
      return `[data-text="${selector.value}"]`;
    default:
      return selector.value;
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  launchBrowser,
  closeBrowser,
  navigate,
  goBack,
  goForward,
  reload,
  getCurrentUrl,
  clickElement,
  typeText,
  getElementText,
  getElementAttribute,
  waitForElement,
  takeScreenshot,
};

export const BrowserSkills = {
  browser: {
    launch: launchBrowser,
    close: closeBrowser,
  },
  navigation: {
    navigate,
    goBack,
    goForward,
    reload,
    getCurrentUrl,
  },
  element: {
    click: clickElement,
    type: typeText,
    getText: getElementText,
    getAttribute: getElementAttribute,
    waitFor: waitForElement,
  },
  screenshot: {
    take: takeScreenshot,
  },
};

export default BrowserSkills;
