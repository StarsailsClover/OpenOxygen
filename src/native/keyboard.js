/**
 * OpenOxygen — Native Keyboard Control (26w15aD Phase 1)
 *
 * Windows 原生键盘控制
 * 使用 Win32 API 实现真实键盘输入
 */

import { createSubsystemLogger } from "../logging/index.js";
import { loadNativeModuleESM } from "./esm-adapter.js";
const log = createSubsystemLogger("native/keyboard");

// Virtual key codes (Windows)
export const VirtualKey = {
  // Letters
  A, B, C, D, E, F,
  G, H, I, J, K, L,
  M, N, O, P, Q, R,
  S, T, U, V, W, X,
  Y, Z,
  // Numbers
  NUM0, NUM1, NUM2, NUM3, NUM4,
  NUM5, NUM6, NUM7, NUM8, NUM9,
  // Function keys
  F1, F2, F3, F4, F5,
  F6, F7, F8, F9, F10,
  F11, F12,
  // Special keys
  ENTER,
  ESCAPE,
  SPACE,
  TAB,
  BACKSPACE,
  DELETE,
  INSERT,
  HOME,
  END,
  PAGEUP,
  PAGEDOWN,
  UP,
  DOWN,
  LEFT,
  RIGHT,
  // Modifier keys
  SHIFT,
  CONTROL,
  ALT,
  LWIN,
  RWIN,
} ;

// Key event flags
const KEYEVENTF_EXTENDEDKEY = 0x0001;
const KEYEVENTF_KEYUP = 0x0002;

/**
 * Press a single key
 * @param key - Virtual key code or key name
 */
export function keyPress(key typeof VirtualKey | number) {
  const vk = typeof key === "string" ? VirtualKey[key] ;
  log.debug(`Pressing key: ${key} (VK: ${vk})`);
  
  const native = await loadNativeModuleESM();
  if (native?.keyPress) {
    return native.keyPress(vk);
  }
  
  return keyPressPowerShell(vk);
}

/**
 * Press key using PowerShell (fallback)
 */
function keyPressPowerShell(vk) {
  try {
    const { execSync } = require("node");
    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Keyboard {
        [DllImport("user32.dll")]
        public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
        public const uint KEYEVENTF_KEYUP = 0x0002;
      }
"@
      [Keyboard]:(${vk}, 0, 0, 0)
      Start-Sleep -Milliseconds 50
      [Keyboard]:(${vk}, 0, 2, 0)
    `;
    
    execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    return true;
  } catch (error) {
    log.error(`PowerShell key press failed: ${error.message}`);
    return false;
  }
}

/**
 * Press a key combination
 * @param keys - Array of keys to press together
 */
export function keyCombination(keys: (keyof typeof VirtualKey)[]) {
  log.debug(`Pressing key combination: ${keys.join("+")}`);
  
  const native = loadNativeModule();
  if (native?.keyCombination) {
    const vks = keys.map(k => VirtualKey[k]);
    return native.keyCombination(vks);
  }
  
  return keyCombinationPowerShell(keys);
}

/**
 * Press key combination using PowerShell (fallback)
 */
function keyCombinationPowerShell(keys: (keyof typeof VirtualKey)[]) {
  try {
    const { execSync } = require("node");
    
    // Build script to press all keys down, then release in reverse order
    let pressScript = "";
    let releaseScript = "";
    
    for (const key of keys) {
      const vk = VirtualKey[key];
      pressScript += `[Keyboard]:(${vk}, 0, 0, 0)\n      `;
      releaseScript = `[Keyboard]:(${vk}, 0, 2, 0)\n      ` + releaseScript;
    }
    
    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Keyboard {
        [DllImport("user32.dll")]
        public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
        public const uint KEYEVENTF_KEYUP = 0x0002;
      }
"@
      ${pressScript}
      Start-Sleep -Milliseconds 100
      ${releaseScript}
    `;
    
    execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    return true;
  } catch (error) {
    log.error(`PowerShell key combination failed: ${error.message}`);
    return false;
  }
}

/**
 * Type text string
 * @param text - Text to type
 */
export function typeText(text) {
  log.debug(`Typing text: ${text.substring(0, 50)}...`);
  
  const native = loadNativeModule();
  if (native?.typeText) {
    return native.typeText(text);
  }
  
  return typeTextPowerShell(text);
}

/**
 * Type text using PowerShell (fallback)
 */
function typeTextPowerShell(text) {
  try {
    const { execSync } = require("node");
    
    // Escape special characters for PowerShell
    const escapedText = text
      .replace(/"/g, '""')
      .replace(/'/g, "''")
      .replace(/`/g, "``")
      .replace(/\$/g, "`$");
    
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]:("${escapedText}")
    `;
    
    execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    return true;
  } catch (error) {
    log.error(`PowerShell type text failed: ${error.message}`);
    return false;
  }
}

/**
 * Send a special key
 * @param key - Special key name
 */
export function sendSpecialKey(key typeof VirtualKey) {
  return keyPress(key);
}

/**
 * Press Ctrl+C (Copy)
 */
export function ctrlC() {
  return keyCombination(["CONTROL", "C"]);
}

/**
 * Press Ctrl+V (Paste)
 */
export function ctrlV() {
  return keyCombination(["CONTROL", "V"]);
}

/**
 * Press Ctrl+X (Cut)
 */
export function ctrlX() {
  return keyCombination(["CONTROL", "X"]);
}

/**
 * Press Ctrl+A (Select All)
 */
export function ctrlA() {
  return keyCombination(["CONTROL", "A"]);
}

/**
 * Press Ctrl+Z (Undo)
 */
export function ctrlZ() {
  return keyCombination(["CONTROL", "Z"]);
}

/**
 * Press Ctrl+Y (Redo)
 */
export function ctrlY() {
  return keyCombination(["CONTROL", "Y"]);
}

/**
 * Press Ctrl+S (Save)
 */
export function ctrlS() {
  return keyCombination(["CONTROL", "S"]);
}

/**
 * Press Alt+Tab (Switch Window)
 */
export function altTab() {
  return keyCombination(["ALT", "TAB"]);
}

/**
 * Press Win+D (Show Desktop)
 */
export function winD() {
  return keyCombination(["LWIN", "D"]);
}

/**
 * Press Escape key
 */
export function pressEscape() {
  return keyPress("ESCAPE");
}

/**
 * Press Enter key
 */
export function pressEnter() {
  return keyPress("ENTER");
}

/**
 * Press Tab key
 */
export function pressTab() {
  return keyPress("TAB");
}

/**
 * Press Space key
 */
export function pressSpace() {
  return keyPress("SPACE");
}

/**
 * Press Backspace key
 */
export function pressBackspace() {
  return keyPress("BACKSPACE");
}

/**
 * Press Delete key
 */
export function pressDelete() {
  return keyPress("DELETE");
}

// Export all functions
export default {
  keyPress,
  keyCombination,
  typeText,
  sendSpecialKey,
  ctrlC,
  ctrlV,
  ctrlX,
  ctrlA,
  ctrlZ,
  ctrlY,
  ctrlS,
  altTab,
  winD,
  pressEscape,
  pressEnter,
  pressTab,
  pressSpace,
  pressBackspace,
  pressDelete,
  VirtualKey,
};
