/**
 * OpenOxygen — OxygenBrowser Module (26w15aD Phase 4)
 *
 * 统一导出浏览器功能
 */
export { launchBrowser, navigate, executeScript, takeScreenshot, goBack, refresh, closeBrowser, getBrowser, listBrowsers, waitForElement, clickElement, inputText, getElementText, type BrowserState, type BrowserOptions, type PageInfo, type BrowserInstance, } from "./core.js";
export { connectCDP, enableDomains, navigateCDP, executeScriptCDP, queryElementCDP, clickElementCDP, takeScreenshotCDP, getMetricsCDP, disconnectCDP, type CDPClient, } from "./cdp.js";
export { OUVBrowserIntegration, type VisualElement, } from "./ouv-integration.js";
import * as core from "./core.js";
export declare const Browser: {
    cdp: any;
    OUVBrowserIntegration: any;
    launchBrowser(options?: core.BrowserOptions): Promise<core.BrowserInstance>;
    navigate(browserId: string, url: string): Promise<core.PageInfo>;
    executeScript(browserId: string, script: string): Promise<any>;
    takeScreenshot(browserId: string): Promise<string | null>;
    goBack(browserId: string): Promise<core.PageInfo | null>;
    refresh(browserId: string): Promise<core.PageInfo>;
    closeBrowser(browserId: string): Promise<void>;
    getBrowser(browserId: string): core.BrowserInstance | undefined;
    listBrowsers(): core.BrowserInstance[];
    waitForElement(browserId: string, selector: string, timeoutMs?: number): Promise<boolean>;
    clickElement(browserId: string, selector: string): Promise<void>;
    inputText(browserId: string, selector: string, text: string): Promise<void>;
    getElementText(browserId: string, selector: string): Promise<string>;
    default: {
        launchBrowser: typeof core.launchBrowser;
        navigate: typeof core.navigate;
        executeScript: typeof core.executeScript;
        takeScreenshot: typeof core.takeScreenshot;
        goBack: typeof core.goBack;
        refresh: typeof core.refresh;
        closeBrowser: typeof core.closeBrowser;
        getBrowser: typeof core.getBrowser;
        listBrowsers: typeof core.listBrowsers;
        waitForElement: typeof core.waitForElement;
        clickElement: typeof core.clickElement;
        inputText: typeof core.inputText;
        getElementText: typeof core.getElementText;
    };
};
export default Browser;
//# sourceMappingURL=index.d.ts.map