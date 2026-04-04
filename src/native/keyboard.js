/**
 * OpenOxygen - Native Keyboard Control
 *
 * Windows 原生键盘控制
 * 使用 Win32 API 实现真实键盘输入
 */

import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("native/keyboard");

// Virtual key codes (Windows)
export const VirtualKey = {
  // Letters
  A: 0x41, B: 0x42, C: 0x43, D: 0x44, E: 0x45, F: 0x46,
  G: 0x47, H: 0x48, I: 0x49, J: 0x4A, K: 0x4B, L: 0x4C,
  M: 0x4D, N: 0x4E, O: 0x4F, P: 0x50, Q: 0x51, R: 0x52,
  S: 0x53, T: 0x54, U: 0x55, V: 0x56, W: 0x57, X: 0x58,
  Y: 0x59, Z: 0x5A,
  // Numbers
  NUM0: 0x30, NUM1: 0x31, NUM2: 0x32, NUM3: 0x33, NUM4: 0x34,
  NUM5: 0x35, NUM6: 0x36, NUM7: 0x37, NUM8: 0x38, NUM9: 0x39,
  // Function keys
  F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74,
  F6: 0x75, F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79,
  F11: 0x7A, F12: 0x7B,
  // Special keys
  ENTER: 0x0D,
  ESCAPE: 0x1B,
  SPACE: 0x20,
  TAB: 0x09,
  BACKSPACE: 0x08,
  DELETE: 0x2E,
  INSERT: 0x2D,
  HOME: 0x24,
  END: 0x23,
  PAGEUP: 0x21,
  PAGEDOWN: 0x22,
  UP: 0x26,
  DOWN: 0x28,
  LEFT: 0x25,
  RIGHT: 0x27,
  // Modifier keys
  SHIFT: 0x10,
  CONTROL: 0x11,
  ALT: 0x12,
  LWIN: 0x5B,
  RWIN: 0x5C,
};

// Key event flags
const KEYEVENTF_EXTENDEDKEY = 0x0001;
const KEYEVENTF_KEYUP = 0x0002;

/**
 * Press a single key
 * @param key - Virtual key code or key name
 */
export async function keyPress(key) {
  const vk = typeof key === "string" ? VirtualKey[key] : key;
  if (!vk) {
    log.error(`Unknown key: ${key}`);
    return false;
  }

  log.debug(`Pressing key: ${key} (VK: ${vk})`);
  
  try {
    const { execSync } = await import("node:child_process");
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
      [Keyboard]::keybd_event(${vk}, 0, 0, 0)
      Start-Sleep -Milliseconds 50
      [Keyboard]::keybd_event(${vk}, 0, [Keyboard]::KEYEVENTF_KEYUP, 0)
    `;
    
    execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    return true;
  } catch (error) {
    log.error(`Key press failed: ${error.message}`);
    return false;
  }
}

/**
 * Press a key combination (e.g., Ctrl+C)
 * @param keys - Array of keys to press together
 */
export async function keyCombination(keys) {
  log.debug(`Pressing key combination: ${keys.join("+")}`);
  
  try {
    const { execSync } = await import("node:child_process");
    
    // Build script to press all keys down, then release in reverse order
    let pressScript = "";
    let releaseScript = "";
    
    for (const key of keys) {
      const vk = typeof key === "string" ? VirtualKey[key] : key;
      if (!vk) continue;
      
      pressScript += `[Keyboard]::keybd_event(${vk}, 0, 0, 0)\n      Start-Sleep -Milliseconds 50\n      `;
      releaseScript = `[Keyboard]::keybd_event(${vk}, 0, [Keyboard]::KEYEVENTF_KEYUP, 0)\n      Start-Sleep -Milliseconds 50\n      ` + releaseScript;
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
      ${releaseScript}
    `;
    
    execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    return true;
  } catch (error) {
    log.error(`Key combination failed: ${error.message}`);
    return false;
  }
}

/**
 * Type text string
 * @param text - Text to type
 */
export async function typeText(text) {
  log.debug(`Typing text: ${text.substring(0, 50)}...`);
  
  try {
    const { execSync } = await import("node:child_process");
    
    // Escape special characters for PowerShell
    const escaped = text
      .replace(/`/g, "``")
      .replace(/"/g, "`\"")
      .replace(/\$/g, "`$")
      .replace(/\n/g, "`n")
      .replace(/\r/g, "`r")
      .replace(/\t/g, "`t");

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${escaped}")
    `;
    
    execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
    return true;
  } catch (error) {
    log.error(`Type text failed: ${error.message}`);
    return false;
  }
}

/**
 * Send special key
 * @param keyName - Name of special key
 */
export async function sendSpecialKey(keyName) {
  const keyMap = {
    "enter": "ENTER",
    "return": "ENTER",
    "esc": "ESCAPE",
    "escape": "ESCAPE",
    "tab": "TAB",
    "space": "SPACE",
    "backspace": "BACKSPACE",
    "delete": "DELETE",
    "del": "DELETE",
    "insert": "INSERT",
    "ins": "INSERT",
    "home": "HOME",
    "end": "END",
    "pageup": "PAGEUP",
    "pagedown": "PAGEDOWN",
    "up": "UP",
    "down": "DOWN",
    "left": "LEFT",
    "right": "RIGHT",
    "f1": "F1", "f2": "F2", "f3": "F3", "f4": "F4",
    "f5": "F5", "f6": "F6", "f7": "F7", "f8": "F8",
    "f9": "F9", "f10": "F10", "f11": "F11", "f12": "F12",
  };

  const key = keyMap[keyName.toLowerCase()];
  if (!key) {
    log.error(`Unknown special key: ${keyName}`);
    return false;
  }

  return keyPress(key);
}

// === Common shortcuts ===

export async function ctrlC() {
  return keyCombination(["CONTROL", "C"]);
}

export async function ctrlV() {
  return keyCombination(["CONTROL", "V"]);
}

export async function ctrlX() {
  return keyCombination(["CONTROL", "X"]);
}

export async function ctrlA() {
  return keyCombination(["CONTROL", "A"]);
}

export async function ctrlZ() {
  return keyCombination(["CONTROL", "Z"]);
}

export async function ctrlY() {
  return keyCombination(["CONTROL", "Y"]);
}

export async function ctrlS() {
  return keyCombination(["CONTROL", "S"]);
}

export async function altTab() {
  return keyCombination(["ALT", "TAB"]);
}

export async function winD() {
  return keyCombination(["LWIN", "D"]);
}

export async function pressEscape() {
  return keyPress("ESCAPE");
}

export async function pressEnter() {
  return keyPress("ENTER");
}

export async function pressTab() {
  return keyPress("TAB");
}

export async function pressSpace() {
  return keyPress("SPACE");
}

export async function pressBackspace() {
  return keyPress("BACKSPACE");
}

export async function pressDelete() {
  return keyPress("DELETE");
}

// === Default Export ===

export const Keyboard = {
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

export default Keyboard;
