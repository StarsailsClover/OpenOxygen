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
import { ChildProcess } from "node:child_process";
import type { ToolResult } from "../../types/index.js";
export type BrowserElement = {
    id: string;
    selector: string;
    tagName: string;
    text: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
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
declare class CDPClient {
    private ws;
    private messageId;
    private pending;
    private eventHandlers;
    connect(wsEndpoint: string): Promise<void>;
    send(method: string, params?: Record<string, unknown>): Promise<unknown>;
    on(event: string, handler: (params: unknown) => void): void;
    disconnect(): void;
}
declare const sessions: Map<string, BrowserSession>;
export declare function createBrowserSession(options?: {
    headless?: boolean;
    inheritCookies?: boolean;
}): Promise<BrowserSession>;
export declare function findSystemBrowserCookies(): {
    edge?: string;
    chrome?: string;
};
export declare function navigate(sessionId: string, url: string): Promise<ToolResult>;
export declare function getPageInfo(sessionId: string): Promise<{
    url: string;
    title: string;
} | null>;
export declare function querySelector(sessionId: string, selector: string): Promise<BrowserElement | null>;
export declare function querySelectorAll(sessionId: string, selector: string): Promise<BrowserElement[]>;
export declare function findElementHybrid(sessionId: string, description: string): Promise<{
    element: BrowserElement | null;
    strategy: string;
}>;
export declare function clickElement(sessionId: string, selector: string): Promise<ToolResult>;
export declare function typeText(sessionId: string, selector: string, text: string): Promise<ToolResult>;
export declare function destroyBrowserSession(sessionId: string): void;
export declare function compareWithExternalBrowser(url: string): Promise<{
    oxygen: {
        success: boolean;
        durationMs: number;
        elementsFound: number;
    };
    external: {
        success: boolean;
        durationMs: number;
        elementsFound: number;
    };
}>;
export { sessions };
//# sourceMappingURL=index.d.ts.map