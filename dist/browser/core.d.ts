/**
 * OpenOxygen — OxygenBrowser Core (26w15aD Phase 4)
 *
 * 基于 WebView2 的封闭浏览器
 * 与 Microsoft Edge 用户体验相同，但 Agent 视角完全不同
 */
export type BrowserState = "closed" | "opening" | "ready" | "navigating" | "error";
export interface BrowserOptions {
    headless?: boolean;
    width?: number;
    height?: number;
    userAgent?: string;
    proxy?: string;
}
export interface PageInfo {
    url: string;
    title: string;
    favicon?: string;
    loadTime?: number;
}
export interface BrowserInstance {
    id: string;
    state: BrowserState;
    options: BrowserOptions;
    currentPage?: PageInfo;
    history: PageInfo[];
    webview?: any;
}
/**
 * Launch OxygenBrowser
 * @param options - Browser options
 */
export declare function launchBrowser(options?: BrowserOptions): Promise<BrowserInstance>;
/**
 * Navigate to URL
 * @param browserId - Browser instance ID
 * @param url - URL to navigate to
 */
export declare function navigate(browserId: string, url: string): Promise<PageInfo>;
/**
 * Execute JavaScript in browser
 * @param browserId - Browser instance ID
 * @param script - JavaScript code
 */
export declare function executeScript(browserId: string, script: string): Promise<any>;
/**
 * Take screenshot
 * @param browserId - Browser instance ID
 */
export declare function takeScreenshot(browserId: string): Promise<string | null>;
/**
 * Go back in history
 * @param browserId - Browser instance ID
 */
export declare function goBack(browserId: string): Promise<PageInfo | null>;
/**
 * Refresh current page
 * @param browserId - Browser instance ID
 */
export declare function refresh(browserId: string): Promise<PageInfo>;
/**
 * Close browser
 * @param browserId - Browser instance ID
 */
export declare function closeBrowser(browserId: string): Promise<void>;
/**
 * Get browser instance
 * @param browserId - Browser instance ID
 */
export declare function getBrowser(browserId: string): BrowserInstance | undefined;
/**
 * List all active browsers
 */
export declare function listBrowsers(): BrowserInstance[];
/**
 * Wait for element to appear
 * @param browserId - Browser instance ID
 * @param selector - CSS selector
 * @param timeoutMs - Timeout
 */
export declare function waitForElement(browserId: string, selector: string, timeoutMs?: number): Promise<boolean>;
/**
 * Click element
 * @param browserId - Browser instance ID
 * @param selector - CSS selector
 */
export declare function clickElement(browserId: string, selector: string): Promise<void>;
/**
 * Input text to element
 * @param browserId - Browser instance ID
 * @param selector - CSS selector
 * @param text - Text to input
 */
export declare function inputText(browserId: string, selector: string, text: string): Promise<void>;
/**
 * Get element text
 * @param browserId - Browser instance ID
 * @param selector - CSS selector
 */
export declare function getElementText(browserId: string, selector: string): Promise<string>;
declare const _default: {
    launchBrowser: typeof launchBrowser;
    navigate: typeof navigate;
    executeScript: typeof executeScript;
    takeScreenshot: typeof takeScreenshot;
    goBack: typeof goBack;
    refresh: typeof refresh;
    closeBrowser: typeof closeBrowser;
    getBrowser: typeof getBrowser;
    listBrowsers: typeof listBrowsers;
    waitForElement: typeof waitForElement;
    clickElement: typeof clickElement;
    inputText: typeof inputText;
    getElementText: typeof getElementText;
};
export default _default;
//# sourceMappingURL=core.d.ts.map