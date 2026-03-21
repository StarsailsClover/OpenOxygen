/**
 * OpenOxygen — Input Layer (26w15aD Phase 1)
 *
 * 请求链路革新 - 输入层
 * 全局快捷键、系统托盘、语音输入、剪贴板监听
 */
/**
 * Register global hotkey
 * @param keyCombination - Key combination (e.g., "Alt+Space", "Ctrl+Alt+O")
 * @param callback - Callback function when hotkey is pressed
 */
export declare function registerGlobalHotkey(keyCombination: string, callback: () => void): boolean;
/**
 * Unregister global hotkey
 */
export declare function unregisterGlobalHotkey(): boolean;
/**
 * System tray quick input
 * Shows a quick input dialog from system tray
 */
export declare function showSystemTrayInput(): void;
/**
 * Voice input handler
 * @param durationMs - Recording duration in milliseconds
 * @returns Transcribed text
 */
export declare function voiceInput(durationMs?: number): Promise<string>;
/**
 * Clipboard listener
 * Automatically detects clipboard changes and processes content
 * @param callback - Callback function when clipboard changes
 */
export declare function startClipboardListener(callback: (text: string) => void): void;
/**
 * Get current clipboard text
 * @returns Clipboard text content
 */
export declare function getClipboardText(): string;
/**
 * Set clipboard text
 * @param text - Text to set to clipboard
 */
export declare function setClipboardText(text: string): boolean;
/**
 * Check if clipboard contains text
 * @returns True if clipboard has text content
 */
export declare function hasClipboardText(): boolean;
/**
 * Clear clipboard
 */
export declare function clearClipboard(): boolean;
declare const _default: {
    registerGlobalHotkey: typeof registerGlobalHotkey;
    unregisterGlobalHotkey: typeof unregisterGlobalHotkey;
    showSystemTrayInput: typeof showSystemTrayInput;
    voiceInput: typeof voiceInput;
    startClipboardListener: typeof startClipboardListener;
    getClipboardText: typeof getClipboardText;
    setClipboardText: typeof setClipboardText;
    hasClipboardText: typeof hasClipboardText;
    clearClipboard: typeof clearClipboard;
};
export default _default;
//# sourceMappingURL=index.d.ts.map