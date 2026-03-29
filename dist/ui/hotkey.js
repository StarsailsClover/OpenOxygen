/**
 * OpenOxygen -Global Hotkey (26w15aD Phase 6)
 *
 * 鍏ㄥ眬蹇嵎閿敜璧? * Alt+Space / Ctrl+Alt+O 蹇-熷敜璧? */
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("ui/hotkey");
// Registered hotkeys
const registeredHotkeys = new Map();
// Hotkey combinations
export const DEFAULT_HOTKEYS = {
    QUICK_INPUT: "Alt+Space",
    SHOW_APP: "Ctrl+Alt+O",
    HIDE_APP: "Escape",
    SCREENSHOT: "Ctrl+Shift+S",
};
/**
 * Register global hotkey
 * @param combination - Key combination (e.g., "Alt+Space")
 * @param callback - Callback function
 */
export function registerHotkey(combination, callback) {
    log.info(`Registering hotkey: ${combination}`);
    try {
        // Parse combination
        const keys = combination.split("+").map((k) => k.trim().toLowerCase());
        // Store callback
        registeredHotkeys.set(combination.toLowerCase(), callback);
        // Register with Windows (simplified)
        // In production, use native module or background process
        log.info(`Hotkey registered: ${combination}`);
        return true;
    }
    catch (error) {
        log.error(`Failed to register hotkey: ${error.message}`);
        return false;
    }
}
/**
 * Unregister hotkey
 * @param combination - Key combination
 */
export function unregisterHotkey(combination) {
    const existed = registeredHotkeys.delete(combination.toLowerCase());
    if (existed) {
        log.info(`Hotkey unregistered: ${combination}`);
    }
    return existed;
}
/**
 * Check if hotkey is registered
 */
export function isHotkeyRegistered(combination) {
    return registeredHotkeys.has(combination.toLowerCase());
}
/**
 * Get all registered hotkeys
 */
export function getRegisteredHotkeys() {
    return Array.from(registeredHotkeys.keys());
}
/**
 * Trigger hotkey manually
 * @param combination - Key combination
 */
export function triggerHotkey(combination) {
    const callback = registeredHotkeys.get(combination.toLowerCase());
    if (callback) {
        callback();
        return true;
    }
    return false;
}
/**
 * Setup default hotkeys
 * @param handlers - Handler functions
 */
export function setupDefaultHotkeys(handlers) {
    if (handlers.onQuickInput) {
        registerHotkey(DEFAULT_HOTKEYS.QUICK_INPUT, handlers.onQuickInput);
    }
    if (handlers.onShowApp) {
        registerHotkey(DEFAULT_HOTKEYS.SHOW_APP, handlers.onShowApp);
    }
    if (handlers.onHideApp) {
        registerHotkey(DEFAULT_HOTKEYS.HIDE_APP, handlers.onHideApp);
    }
    if (handlers.onScreenshot) {
        registerHotkey(DEFAULT_HOTKEYS.SCREENSHOT, handlers.onScreenshot);
    }
}
// Export
export default {
    registerHotkey,
    unregisterHotkey,
    isHotkeyRegistered,
    getRegisteredHotkeys,
    triggerHotkey,
    setupDefaultHotkeys,
    DEFAULT_HOTKEYS,
};
