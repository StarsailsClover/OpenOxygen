/**
 * OpenOxygen �?UI Module (26w15aD Phase 6)
 *
 * 统一导出 UI 功能
 */
export { launchWinUI, addUserMessage, addAssistantMessage, addSystemMessage, showWindow, hideWindow, minimizeWindow, closeWinUI, setWindowMode, onMessage, offMessage, getChatHistory, clearChatHistory, getActiveApp, isAppRunning, type AppState, type WindowMode, type WinUIAppConfig, type ChatMessage, type WinUIApp, } from "./winui/app.js";
export { registerHotkey, unregisterHotkey, isHotkeyRegistered, getRegisteredHotkeys, triggerHotkey, setupDefaultHotkeys, DEFAULT_HOTKEYS, } from "./hotkey.js";
export { createTray, setTrayTooltip, showTrayMenu, showQuickInput, updateTrayStatus, destroyTray, type TrayMenuItem, } from "./tray.js";
import * as winui from "./winui/app.js";
import * as hotkey from "./hotkey.js";
import * as tray from "./tray.js";
export declare const UI: {
    hotkey: typeof hotkey;
    tray: typeof tray;
    launchWinUI(config?: winui.WinUIAppConfig): Promise<winui.WinUIApp>;
    addUserMessage(app: winui.WinUIApp, content: string): winui.ChatMessage;
    addAssistantMessage(app: winui.WinUIApp, content: string, metadata?: winui.ChatMessage["metadata"]): winui.ChatMessage;
    addSystemMessage(app: winui.WinUIApp, content: string): winui.ChatMessage;
    showWindow(): void;
    hideWindow(): void;
    minimizeWindow(): void;
    closeWinUI(): void;
    setWindowMode(mode: winui.WindowMode): void;
    onMessage(handler: (msg: winui.ChatMessage) => void): void;
    offMessage(handler: (msg: winui.ChatMessage) => void): void;
    getChatHistory(): winui.ChatMessage[];
    clearChatHistory(): void;
    getActiveApp(): winui.WinUIApp | null;
    isAppRunning(): boolean;
    default: {
        launchWinUI: typeof winui.launchWinUI;
        addUserMessage: typeof winui.addUserMessage;
        addAssistantMessage: typeof winui.addAssistantMessage;
        addSystemMessage: typeof winui.addSystemMessage;
        showWindow: typeof winui.showWindow;
        hideWindow: typeof winui.hideWindow;
        minimizeWindow: typeof winui.minimizeWindow;
        closeWinUI: typeof winui.closeWinUI;
        setWindowMode: typeof winui.setWindowMode;
        onMessage: typeof winui.onMessage;
        offMessage: typeof winui.offMessage;
        getChatHistory: typeof winui.getChatHistory;
        clearChatHistory: typeof winui.clearChatHistory;
        getActiveApp: typeof winui.getActiveApp;
        isAppRunning: typeof winui.isAppRunning;
    };
};
export default UI;
//# sourceMappingURL=index.d.ts.map
