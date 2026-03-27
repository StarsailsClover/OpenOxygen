/**
 * UI Hotkey - Fix
 */
export const DEFAULT_HOTKEYS = {
  QUICK_INPUT: "Alt+Space",
  SHOW_APP: "Ctrl+Alt+O",
  HIDE_APP: "Escape",
  SCREENSHOT: "Ctrl+Shift+S",
};
const registeredHotkeys = new Map();
export function registerHotkey(combination, callback) {
  registeredHotkeys.set(combination.toLowerCase(), callback);
  return true;
}
export function unregisterHotkey(combination) {
  return registeredHotkeys.delete(combination.toLowerCase());
}
export function isHotkeyRegistered(combination) {
  return registeredHotkeys.has(combination.toLowerCase());
}
export function getRegisteredHotkeys() {
  return Array.from(registeredHotkeys.keys());
}
export function triggerHotkey(combination) {
  const cb = registeredHotkeys.get(combination.toLowerCase());
  if (cb) { cb(); return true; }
  return false;
}
export function setupDefaultHotkeys(handlers) {
  if (handlers.onQuickInput) registerHotkey(DEFAULT_HOTKEYS.QUICK_INPUT, handlers.onQuickInput);
  if (handlers.onShowApp) registerHotkey(DEFAULT_HOTKEYS.SHOW_APP, handlers.onShowApp);
  if (handlers.onHideApp) registerHotkey(DEFAULT_HOTKEYS.HIDE_APP, handlers.onHideApp);
  if (handlers.onScreenshot) registerHotkey(DEFAULT_HOTKEYS.SCREENSHOT, handlers.onScreenshot);
}
