/**
 * OpenOxygen — OxygenBrowser CDP Integration (26w15aD Phase 4)
 *
 * Chrome DevTools Protocol 集成
 * 用于高级浏览器控制
 */
import { createSubsystemLogger } from "../logging/index.js";
import { sleep } from "../utils/index.js";
const log = createSubsystemLogger("oxygen-browser/cdp");
// CDP Session
let cdpSession = null;
/**
 * Connect to browser via CDP
 * @param port - Debug port (default: 9222)
 */
export async function connectCDP(port = 9222) {
    log.info(`Connecting to CDP on port ${port}`);
    try {
        // Fetch WebSocket URL from http://localhost:9222/json/version
        const response = await fetch(`http://localhost:${port}/json/version`);
        const version = await response.json();
        log.debug(`Browser version: ${version.Browser}`);
        // Fetch available targets
        const targetsResponse = await fetch(`http://localhost:${port}/json/list`);
        const targets = await targetsResponse.json();
        // Find page target
        const pageTarget = targets.find((t) => t.type === "page");
        if (!pageTarget) {
            throw new Error("No page target found");
        }
        // Connect to WebSocket
        const wsUrl = pageTarget.webSocketDebuggerUrl;
        log.debug(`Connecting to: ${wsUrl}`);
        // Create CDP client
        cdpSession = createCDPClient(wsUrl);
        log.info("CDP connected successfully");
        return cdpSession;
    }
    catch (error) {
        log.error(`Failed to connect CDP: ${error.message}`);
        throw error;
    }
}
/**
 * Create CDP WebSocket client
 */
function createCDPClient(wsUrl) {
    const WebSocket = require("ws");
    const ws = new WebSocket(wsUrl);
    let messageId = 0;
    const pendingMessages = new Map();
    const eventHandlers = new Map();
    ws.on("open", () => {
        log.debug("CDP WebSocket connected");
    });
    ws.on("message", (data) => {
        const message = JSON.parse(data);
        if (message.id !== undefined) {
            // Response to a command
            const pending = pendingMessages.get(message.id);
            if (pending) {
                if (message.error) {
                    pending.reject(new Error(message.error.message));
                }
                else {
                    pending.resolve(message.result);
                }
                pendingMessages.delete(message.id);
            }
        }
        else if (message.method) {
            // Event
            const handlers = eventHandlers.get(message.method) || [];
            for (const handler of handlers) {
                handler(message.params);
            }
        }
    });
    ws.on("error", (error) => {
        log.error(`CDP WebSocket error: ${error.message}`);
    });
    ws.on("close", () => {
        log.debug("CDP WebSocket closed");
        cdpSession = null;
    });
    return {
        send: async (method, params) => {
            const id = ++messageId;
            const message = { id, method, params };
            return new Promise((resolve, reject) => {
                pendingMessages.set(id, { resolve, reject });
                ws.send(JSON.stringify(message));
            });
        },
        on: (event, callback) => {
            const handlers = eventHandlers.get(event) || [];
            handlers.push(callback);
            eventHandlers.set(event, handlers);
        },
        close: () => {
            ws.close();
        },
    };
}
/**
 * Enable CDP domains
 * @param client - CDP client
 */
export async function enableDomains(client) {
    log.debug("Enabling CDP domains");
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");
    await client.send("Network.enable");
    log.debug("CDP domains enabled");
}
/**
 * Navigate to URL via CDP
 * @param client - CDP client
 * @param url - URL to navigate
 */
export async function navigateCDP(client, url) {
    log.debug(`Navigating via CDP: ${url}`);
    await client.send("Page.navigate", { url });
    // Wait for load event
    await new Promise((resolve) => {
        client.on("Page.loadEventFired", () => {
            resolve();
        });
    });
    log.debug("Navigation complete");
}
/**
 * Execute script via CDP
 * @param client - CDP client
 * @param script - JavaScript code
 */
export async function executeScriptCDP(client, script) {
    log.debug("Executing script via CDP");
    const result = await client.send("Runtime.evaluate", {
        expression: script,
        returnByValue: true,
    });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || "Script error");
    }
    return result.result?.value;
}
/**
 * Query element via CDP
 * @param client - CDP client
 * @param selector - CSS selector
 */
export async function queryElementCDP(client, selector) {
    log.debug(`Querying element: ${selector}`);
    // Get document root
    const document = await client.send("DOM.getDocument");
    const rootNodeId = document.root.nodeId;
    // Query selector
    const result = await client.send("DOM.querySelector", {
        nodeId: rootNodeId,
        selector,
    });
    return result.nodeId;
}
/**
 * Click element via CDP
 * @param client - CDP client
 * @param selector - CSS selector
 */
export async function clickElementCDP(client, selector) {
    log.debug(`Clicking element via CDP: ${selector}`);
    // Get element position
    const box = await executeScriptCDP(client, `
    const element = document.querySelector("${selector}");
    if (element) {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return null;
  `);
    if (!box) {
        throw new Error(`Element not found: ${selector}`);
    }
    // Dispatch click event
    await executeScriptCDP(client, `
    const element = document.querySelector("${selector}");
    if (element) {
      element.click();
    }
  `);
}
/**
 * Take screenshot via CDP
 * @param client - CDP client
 */
export async function takeScreenshotCDP(client) {
    log.debug("Taking screenshot via CDP");
    const result = await client.send("Page.captureScreenshot", {
        format: "png",
        fullPage: false,
    });
    return result.data; // Base64 encoded
}
/**
 * Get page metrics via CDP
 * @param client - CDP client
 */
export async function getMetricsCDP(client) {
    log.debug("Getting page metrics");
    const metrics = await client.send("Performance.getMetrics");
    return metrics.metrics;
}
/**
 * Disconnect CDP
 */
export function disconnectCDP() {
    if (cdpSession) {
        cdpSession.close();
        cdpSession = null;
        log.info("CDP disconnected");
    }
}
// Export all functions
export default {
    connectCDP,
    enableDomains,
    navigateCDP,
    executeScriptCDP,
    queryElementCDP,
    clickElementCDP,
    takeScreenshotCDP,
    getMetricsCDP,
    disconnectCDP,
};
//# sourceMappingURL=cdp.js.map