/**
 * OpenOxygen �?UI Module (26w15aD Phase 6)
 *
 * 统一导出 UI 功能
 */
// WinUI App
export { launchWinUI, addUserMessage, addAssistantMessage, addSystemMessage, showWindow, hideWindow, minimizeWindow, closeWinUI, setWindowMode, onMessage, offMessage, getChatHistory, clearChatHistory, getActiveApp, isAppRunning, } from "./winui/app.js";
// Hotkey
export { registerHotkey, unregisterHotkey, isHotkeyRegistered, getRegisteredHotkeys, triggerHotkey, setupDefaultHotkeys, DEFAULT_HOTKEYS, } from "./hotkey.js";
// System Tray
export { createTray, setTrayTooltip, showTrayMenu, showQuickInput, updateTrayStatus, destroyTray, } from "./tray.js";
// Default export
import * as winui from "./winui/app.js";
import * as hotkey from "./hotkey.js";
import * as tray from "./tray.js";
export const UI = {
    ...winui,
    hotkey,
    tray,
};
export default UI;
