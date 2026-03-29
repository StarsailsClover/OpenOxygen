/**
 * OpenOxygen -Global Hotkey (26w15aD Phase 6)
 *
 * 鍏ㄥ眬蹇嵎閿敜璧? * Alt+Space / Ctrl+Alt+O 蹇-熷敜�? */
export declare const DEFAULT_HOTKEYS: {
    readonly QUICK_INPUT: "Alt+Space";
    readonly SHOW_APP: "Ctrl+Alt+O";
    readonly HIDE_APP: "Escape";
    readonly SCREENSHOT: "Ctrl+Shift+S";
};
/**
 * Register global hotkey
 * @param combination - Key combination (e.g., "Alt+Space")
 * @param callback - Callback function
 */
export declare function registerHotkey(combination: string, callback: () => void): boolean;
/**
 * Unregister hotkey
 * @param combination - Key combination
 */
export declare function unregisterHotkey(combination: string): boolean;
/**
 * Check if hotkey is registered
 */
export declare function isHotkeyRegistered(combination: string): boolean;
/**
 * Get all registered hotkeys
 */
export declare function getRegisteredHotkeys(): string[];
/**
 * Trigger hotkey manually
 * @param combination - Key combination
 */
export declare function triggerHotkey(combination: string): boolean;
/**
 * Setup default hotkeys
 * @param handlers - Handler functions
 */
export declare function setupDefaultHotkeys(handlers: {
    onQuickInput?: () => void;
    onShowApp?: () => void;
    onHideApp?: () => void;
    onScreenshot?: () => void;
}): void;
declare const _default: {
    registerHotkey: typeof registerHotkey;
    unregisterHotkey: typeof unregisterHotkey;
    isHotkeyRegistered: typeof isHotkeyRegistered;
    getRegisteredHotkeys: typeof getRegisteredHotkeys;
    triggerHotkey: typeof triggerHotkey;
    setupDefaultHotkeys: typeof setupDefaultHotkeys;
    DEFAULT_HOTKEYS: {
        readonly QUICK_INPUT: "Alt+Space";
        readonly SHOW_APP: "Ctrl+Alt+O";
        readonly HIDE_APP: "Escape";
        readonly SCREENSHOT: "Ctrl+Shift+S";
    };
};
export default _default;
//# sourceMappingURL=hotkey.d.ts.map
