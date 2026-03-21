/**
 * OpenOxygen — OxygenBrowser CDP Integration (26w15aD Phase 4)
 *
 * Chrome DevTools Protocol 集成
 * 用于高级浏览器控制
 */
export interface CDPClient {
    send: (method: string, params?: any) => Promise<any>;
    on: (event: string, callback: (params: any) => void) => void;
    close: () => void;
}
/**
 * Connect to browser via CDP
 * @param port - Debug port (default: 9222)
 */
export declare function connectCDP(port?: number): Promise<CDPClient>;
/**
 * Enable CDP domains
 * @param client - CDP client
 */
export declare function enableDomains(client: CDPClient): Promise<void>;
/**
 * Navigate to URL via CDP
 * @param client - CDP client
 * @param url - URL to navigate
 */
export declare function navigateCDP(client: CDPClient, url: string): Promise<void>;
/**
 * Execute script via CDP
 * @param client - CDP client
 * @param script - JavaScript code
 */
export declare function executeScriptCDP(client: CDPClient, script: string): Promise<any>;
/**
 * Query element via CDP
 * @param client - CDP client
 * @param selector - CSS selector
 */
export declare function queryElementCDP(client: CDPClient, selector: string): Promise<any>;
/**
 * Click element via CDP
 * @param client - CDP client
 * @param selector - CSS selector
 */
export declare function clickElementCDP(client: CDPClient, selector: string): Promise<void>;
/**
 * Take screenshot via CDP
 * @param client - CDP client
 */
export declare function takeScreenshotCDP(client: CDPClient): Promise<string>;
/**
 * Get page metrics via CDP
 * @param client - CDP client
 */
export declare function getMetricsCDP(client: CDPClient): Promise<any>;
/**
 * Disconnect CDP
 */
export declare function disconnectCDP(): void;
declare const _default: {
    connectCDP: typeof connectCDP;
    enableDomains: typeof enableDomains;
    navigateCDP: typeof navigateCDP;
    executeScriptCDP: typeof executeScriptCDP;
    queryElementCDP: typeof queryElementCDP;
    clickElementCDP: typeof clickElementCDP;
    takeScreenshotCDP: typeof takeScreenshotCDP;
    getMetricsCDP: typeof getMetricsCDP;
    disconnectCDP: typeof disconnectCDP;
};
export default _default;
//# sourceMappingURL=cdp.d.ts.map