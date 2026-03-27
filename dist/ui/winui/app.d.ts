/**
 * OpenOxygen — WinUI 3 Desktop Application (26w15aD Phase 6)
 *
 * 基于 WinUI 3 的桌面应用
 * 现代化 UI 设计，悬浮窗模式，聊天式交互
 */
export type AppState = "closed" | "opening" | "running" | "minimized" | "error";
export type WindowMode = "normal" | "compact" | "floating" | "fullscreen";
export interface WinUIAppConfig {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    mode?: WindowMode;
    alwaysOnTop?: boolean;
    opacity?: number;
}
export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    metadata?: {
        executionTime?: number;
        mode?: string;
        success?: boolean;
    };
}
export interface WinUIApp {
    id: string;
    state: AppState;
    config: WinUIAppConfig;
    messages: ChatMessage[];
    window?: any;
}
/**
 * Launch WinUI application
 * @param config - App configuration
 */
export declare function launchWinUI(config?: WinUIAppConfig): Promise<WinUIApp>;
/**
 * Add user message
 */
export declare function addUserMessage(app: WinUIApp, content: string): ChatMessage;
/**
 * Add assistant message
 */
export declare function addAssistantMessage(app: WinUIApp, content: string, metadata?: ChatMessage["metadata"]): ChatMessage;
/**
 * Add system message
 */
export declare function addSystemMessage(app: WinUIApp, content: string): ChatMessage;
/**
 * Show window
 */
export declare function showWindow(): void;
/**
 * Hide window
 */
export declare function hideWindow(): void;
/**
 * Minimize window
 */
export declare function minimizeWindow(): void;
/**
 * Close application
 */
export declare function closeWinUI(): void;
/**
 * Set window mode
 * @param mode - Window mode
 */
export declare function setWindowMode(mode: WindowMode): void;
/**
 * Register message handler
 */
export declare function onMessage(handler: (msg: ChatMessage) => void): void;
/**
 * Unregister message handler
 */
export declare function offMessage(handler: (msg: ChatMessage) => void): void;
/**
 * Get chat history
 */
export declare function getChatHistory(): ChatMessage[];
/**
 * Clear chat history
 */
export declare function clearChatHistory(): void;
/**
 * Get active app
 */
export declare function getActiveApp(): WinUIApp | null;
/**
 * Check if app is running
 */
export declare function isAppRunning(): boolean;
declare const _default: {
    launchWinUI: typeof launchWinUI;
    addUserMessage: typeof addUserMessage;
    addAssistantMessage: typeof addAssistantMessage;
    addSystemMessage: typeof addSystemMessage;
    showWindow: typeof showWindow;
    hideWindow: typeof hideWindow;
    minimizeWindow: typeof minimizeWindow;
    closeWinUI: typeof closeWinUI;
    setWindowMode: typeof setWindowMode;
    onMessage: typeof onMessage;
    offMessage: typeof offMessage;
    getChatHistory: typeof getChatHistory;
    clearChatHistory: typeof clearChatHistory;
    getActiveApp: typeof getActiveApp;
    isAppRunning: typeof isAppRunning;
};
export default _default;
//# sourceMappingURL=app.d.ts.map