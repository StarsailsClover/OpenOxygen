/**
 * OpenOxygen - Native Input/Output Module
 *
 * 统一导出所有原生控制功能
 */
// Mouse control
export { mouseMove, mouseClick, mouseDoubleClick, mouseDrag, mouseScroll, getMousePosition, mouseClickAt, MouseButton, } from "./mouse.js";
// Keyboard control
export { keyPress, keyCombination, typeText, sendSpecialKey, ctrlC, ctrlV, ctrlX, ctrlA, ctrlZ, ctrlY, ctrlS, altTab, winD, pressEscape, pressEnter, pressTab, pressSpace, pressBackspace, pressDelete, VirtualKey, } from "./keyboard.js";
// Re-export as default
import * as mouse from "./mouse.js";
import * as keyboard from "./keyboard.js";
export const NativeInput = {
    ...mouse,
    ...keyboard,
};
export default NativeInput;
