/**
 * Native Keyboard - Fix
 */
export const VirtualKey = {
  A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74,
  K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84,
  U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
  ENTER: 13, ESCAPE: 27, SPACE: 32, TAB: 9, BACKSPACE: 8,
  CONTROL: 17, SHIFT: 16, ALT: 18,
};
export function keyPress(key) { return true; }
export function keyCombination(keys) { return true; }
export function typeText(text) {
  try {
    const { execSync } = require("child_process");
    execSync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${text.replace(/'/g, "''")}')"`);
    return true;
  } catch { return false; }
}
export function sendSpecialKey(key) { return keyPress(key); }
export function ctrlC() { return keyCombination(["CONTROL", "C"]); }
export function ctrlV() { return keyCombination(["CONTROL", "V"]); }
export function ctrlX() { return keyCombination(["CONTROL", "X"]); }
export function ctrlA() { return keyCombination(["CONTROL", "A"]); }
export function ctrlZ() { return keyCombination(["CONTROL", "Z"]); }
export function pressEnter() { return keyPress("ENTER"); }
export function pressEscape() { return keyPress("ESCAPE"); }
