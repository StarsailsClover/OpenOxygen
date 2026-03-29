/**
 * OpenOxygen �?OxygenBrowser Core (26w15aD Phase 4)
 *
 * 基于 WebView2 的封闭浏览器
 * �?Microsoft Edge 用户体验相同，但 Agent 视角完全不同
 */
import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
const log = createSubsystemLogger("oxygen-browser/core");
// Active browser instances
const browsers = new Map();
/**
 * Launch OxygenBrowser
 * @param options - Browser options
 */
export async function launchBrowser(options = {}) {
    log.info("Launching OxygenBrowser");
    const id = generateId("browser");
    const browser = {
        id,
        state: "opening",
        options: {
            width: options.width || 1280,
            height: options.height || 720,
            headless: options.headless || false,
            ...options,
        },
        history: [],
    };
    browsers.set(id, browser);
    try {
        // Initialize WebView2
        await initializeWebView2(browser);
        browser.state = "ready";
        log.info(`OxygenBrowser launched: ${id}`);
        return browser;
    }
    catch (error) {
        browser.state = "error";
        log.error(`Failed to launch browser: ${error.message}`);
        throw error;
    }
}
/**
 * Initialize WebView2
 */
async function initializeWebView2(browser) {
    log.debug("Initializing WebView2");
    // This would use the WebView2 runtime
    // For now, we create a placeholder
    browser.webview = {
        id: browser.id,
        navigate: async (url) => {
            log.debug(`Navigating to: ${url}`);
            await sleep(1000);
        },
        executeScript: async (script) => {
            log.debug(`Executing script`);
            return null;
        },
        takeScreenshot: async () => {
            log.debug("Taking screenshot");
            return null;
        },
    };
    await sleep(500); // Simulate initialization
}
/**
 * Navigate to URL
 * @param browserId - Browser instance ID
 * @param url - URL to navigate to
 */
export async function navigate(browserId, url) {
    const browser = browsers.get(browserId);
    if (!browser) {
        throw new Error(`Browser not found: ${browserId}`);
    }
    if (browser.state !== "ready") {
        throw new Error(`Browser not ready: ${browser.state}`);
    }
    log.info(`Navigating to: ${url}`);
    browser.state = "navigating";
    const startTime = nowMs();
    try {
        // Navigate using WebView2
        await browser.webview.navigate(url);
        // Wait for page load
        await sleep(2000);
        // Get page info
        const pageInfo = {
            url,
            title: await getPageTitle(browser),
            loadTime: nowMs() - startTime,
        };
        browser.currentPage = pageInfo;
        browser.history.push(pageInfo);
        browser.state = "ready";
        log.info(`Navigation complete: ${pageInfo.title}`);
        return pageInfo;
    }
    catch (error) {
        browser.state = "error";
        throw error;
    }
}
/**
 * Get page title
 */
async function getPageTitle(browser) {
    try {
        const result = await browser.webview.executeScript("document.title");
        return result || "Untitled";
    }
    catch {
        return "Untitled";
    }
}
/**
 * Execute JavaScript in browser
 * @param browserId - Browser instance ID
 * @param script - JavaScript code
 */
export async function executeScript(browserId, script) {
    const browser = browsers.get(browserId);
    if (!browser) {
        throw new Error(`Browser not found: ${browserId}`);
    }
    log.debug(`Executing script in browser: ${browserId}`);
    return browser.webview.executeScript(script);
}
/**
 * Take screenshot
 * @param browserId - Browser instance ID
 */
export async function takeScreenshot(browserId) {
    const browser = browsers.get(browserId);
    if (!browser) {
        throw new Error(`Browser not found: ${browserId}`);
    }
    log.debug(`Taking screenshot: ${browserId}`);
    return browser.webview.takeScreenshot();
}
/**
 * Go back in history
 * @param browserId - Browser instance ID
 */
export async function goBack(browserId) {
    const browser = browsers.get(browserId);
    if (!browser || browser.history.length < 2) {
        return null;
    }
    // Remove current page
    browser.history.pop();
    // Navigate to previous page
    const previousPage = browser.history[browser.history.length - 1];
    return navigate(browserId, previousPage.url);
}
/**
 * Refresh current page
 * @param browserId - Browser instance ID
 */
export async function refresh(browserId) {
    const browser = browsers.get(browserId);
    if (!browser || !browser.currentPage) {
        throw new Error("No current page to refresh");
    }
    return navigate(browserId, browser.currentPage.url);
}
/**
 * Close browser
 * @param browserId - Browser instance ID
 */
export async function closeBrowser(browserId) {
    const browser = browsers.get(browserId);
    if (!browser) {
        return;
    }
    log.info(`Closing browser: ${browserId}`);
    // Cleanup WebView2
    if (browser.webview) {
        browser.webview = null;
    }
    browsers.delete(browserId);
    log.info(`Browser closed: ${browserId}`);
}
/**
 * Get browser instance
 * @param browserId - Browser instance ID
 */
export function getBrowser(browserId) {
    return browsers.get(browserId);
}
/**
 * List all active browsers
 */
export function listBrowsers() {
    return Array.from(browsers.values());
}
/**
 * Wait for element to appear
 * @param browserId - Browser instance ID
 * @param selector - CSS selector
 * @param timeoutMs - Timeout
 */
export async function waitForElement(browserId, selector, timeoutMs = 5000) {
    const browser = browsers.get(browserId);
    if (!browser) {
        throw new Error(`Browser not found: ${browserId}`);
    }
    const startTime = nowMs();
    while (nowMs() - startTime < timeoutMs) {
        const exists = await browser.webview.executeScript(`
      document.querySelector("${selector}") !== null
    `);
        if (exists) {
            return true;
        }
        await sleep(100);
    }
    return false;
}
/**
 * Click element
 * @param browserId - Browser instance ID
 * @param selector - CSS selector
 */
export async function clickElement(browserId, selector) {
    const browser = browsers.get(browserId);
    if (!browser) {
        throw new Error(`Browser not found: ${browserId}`);
    }
    log.debug(`Clicking element: ${selector}`);
    await browser.webview.executeScript(`
    const element = document.querySelector("${selector}");
    if (element) {
      element.click();
      return true;
    }
    return false;
  `);
}
/**
 * Input text to element
 * @param browserId - Browser instance ID
 * @param selector - CSS selector
 * @param text - Text to input
 */
export async function inputText(browserId, selector, text) {
    const browser = browsers.get(browserId);
    if (!browser) {
        throw new Error(`Browser not found: ${browserId}`);
    }
    log.debug(`Inputting text to: ${selector}`);
    const escapedText = text.replace(/"/g, '\\"');
    await browser.webview.executeScript(`
    const element = document.querySelector("${selector}");
    if (element) {
      element.value = "${escapedText}";
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  `);
}
/**
 * Get element text
 * @param browserId - Browser instance ID
 * @param selector - CSS selector
 */
export async function getElementText(browserId, selector) {
    const browser = browsers.get(browserId);
    if (!browser) {
        throw new Error(`Browser not found: ${browserId}`);
    }
    return browser.webview.executeScript(`
    const element = document.querySelector("${selector}");
    return element ? element.textContent : "";
  `);
}
// Export all functions
export default {
    launchBrowser,
    navigate,
    executeScript,
    takeScreenshot,
    goBack,
    refresh,
    closeBrowser,
    getBrowser,
    listBrowsers,
    waitForElement,
    clickElement,
    inputText,
    getElementText,
};
