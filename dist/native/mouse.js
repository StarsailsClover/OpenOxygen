/**
 * OpenOxygen — Native Mouse Control (26w15aD Phase 1)
 *
 * Windows 原生鼠标控制
 * 使用 Win32 API 实现真实鼠标移动和点击
 */
import { createSubsystemLogger } from "../logging/index.js";
import { loadNativeModule } from "../native-bridge.js";
const log = createSubsystemLogger("native/mouse");
// Mouse button constants
export const MouseButton = {
    LEFT: 0x01,
    RIGHT: 0x02,
    MIDDLE: 0x04,
};
// Mouse event flags
const MOUSEEVENTF_MOVE = 0x0001;
const MOUSEEVENTF_LEFTDOWN = 0x0002;
const MOUSEEVENTF_LEFTUP = 0x0004;
const MOUSEEVENTF_RIGHTDOWN = 0x0008;
const MOUSEEVENTF_RIGHTUP = 0x0010;
const MOUSEEVENTF_MIDDLEDOWN = 0x0020;
const MOUSEEVENTF_MIDDLEUP = 0x0040;
const MOUSEEVENTF_WHEEL = 0x0800;
const MOUSEEVENTF_ABSOLUTE = 0x8000;
// Screen dimensions for absolute positioning
const SCREEN_WIDTH = 65535;
const SCREEN_HEIGHT = 65535;
/**
 * Move mouse to absolute coordinates
 * @param x - X coordinate (0 to screen width)
 * @param y - Y coordinate (0 to screen height)
 */
export function mouseMove(x, y) {
    log.debug(`Moving mouse to (${x}, ${y})`);
    const native = loadNativeModule();
    if (native?.mouseMove) {
        return native.mouseMove(x, y);
    }
    // Fallback: Use PowerShell
    return mouseMovePowerShell(x, y);
}
/**
 * Move mouse using PowerShell (fallback)
 */
function mouseMovePowerShell(x, y) {
    try {
        const { execSync } = require("node:child_process");
        const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")]
        public static extern bool SetCursorPos(int x, int y);
      }
"@
      [Mouse]::SetCursorPos(${x}, ${y})
    `;
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
        return true;
    }
    catch (error) {
        log.error(`PowerShell mouse move failed: ${error.message}`);
        return false;
    }
}
/**
 * Click mouse button at current position
 * @param button - Mouse button (LEFT, RIGHT, MIDDLE)
 */
export function mouseClick(button = "LEFT") {
    log.debug(`Clicking mouse button: ${button}`);
    const native = loadNativeModule();
    if (native?.mouseClick) {
        return native.mouseClick(MouseButton[button]);
    }
    // Fallback: Use PowerShell
    return mouseClickPowerShell(button);
}
/**
 * Click using PowerShell (fallback)
 */
function mouseClickPowerShell(button) {
    try {
        const { execSync } = require("node:child_process");
        let downFlag, upFlag;
        switch (button) {
            case "LEFT":
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
                break;
            case "RIGHT":
                downFlag = MOUSEEVENTF_RIGHTDOWN;
                upFlag = MOUSEEVENTF_RIGHTUP;
                break;
            case "MIDDLE":
                downFlag = MOUSEEVENTF_MIDDLEDOWN;
                upFlag = MOUSEEVENTF_MIDDLEUP;
                break;
            default:
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
        }
        const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")]
        public static extern void mouse_event(int flags, int dx, int dy, int buttons, int extra);
        public const int MOUSEEVENTF_LEFTDOWN = 0x02;
        public const int MOUSEEVENTF_LEFTUP = 0x04;
        public const int MOUSEEVENTF_RIGHTDOWN = 0x08;
        public const int MOUSEEVENTF_RIGHTUP = 0x10;
        public const int MOUSEEVENTF_MIDDLEDOWN = 0x20;
        public const int MOUSEEVENTF_MIDDLEUP = 0x40;
      }
"@
      [Mouse]::mouse_event(${downFlag}, 0, 0, 0, 0)
      Start-Sleep -Milliseconds 50
      [Mouse]::mouse_event(${upFlag}, 0, 0, 0, 0)
    `;
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
        return true;
    }
    catch (error) {
        log.error(`PowerShell mouse click failed: ${error.message}`);
        return false;
    }
}
/**
 * Double click mouse button at current position
 * @param button - Mouse button (LEFT, RIGHT, MIDDLE)
 */
export function mouseDoubleClick(button = "LEFT") {
    log.debug(`Double clicking mouse button: ${button}`);
    // Perform two clicks with small delay
    const success1 = mouseClick(button);
    if (!success1)
        return false;
    // Small delay between clicks
    const { sleep } = require("../utils/index.js");
    sleep(50);
    const success2 = mouseClick(button);
    return success2;
}
/**
 * Drag mouse from start to end position
 * @param startX - Start X coordinate
 * @param startY - Start Y coordinate
 * @param endX - End X coordinate
 * @param endY - End Y coordinate
 * @param button - Mouse button to hold during drag
 */
export function mouseDrag(startX, startY, endX, endY, button = "LEFT") {
    log.debug(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY}) with ${button} button`);
    const native = loadNativeModule();
    if (native?.mouseDrag) {
        return native.mouseDrag(startX, startY, endX, endY, MouseButton[button]);
    }
    // Fallback: PowerShell implementation
    return mouseDragPowerShell(startX, startY, endX, endY, button);
}
/**
 * Drag using PowerShell (fallback)
 */
function mouseDragPowerShell(startX, startY, endX, endY, button) {
    try {
        const { execSync } = require("node:child_process");
        let downFlag, upFlag;
        switch (button) {
            case "LEFT":
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
                break;
            case "RIGHT":
                downFlag = MOUSEEVENTF_RIGHTDOWN;
                upFlag = MOUSEEVENTF_RIGHTUP;
                break;
            case "MIDDLE":
                downFlag = MOUSEEVENTF_MIDDLEDOWN;
                upFlag = MOUSEEVENTF_MIDDLEUP;
                break;
            default:
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
        }
        const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")]
        public static extern bool SetCursorPos(int x, int y);
        [DllImport("user32.dll")]
        public static extern void mouse_event(int flags, int dx, int dy, int buttons, int extra);
        public const int MOUSEEVENTF_LEFTDOWN = 0x02;
        public const int MOUSEEVENTF_LEFTUP = 0x04;
        public const int MOUSEEVENTF_RIGHTDOWN = 0x08;
        public const int MOUSEEVENTF_RIGHTUP = 0x10;
        public const int MOUSEEVENTF_MIDDLEDOWN = 0x20;
        public const int MOUSEEVENTF_MIDDLEUP = 0x40;
      }
"@
      # Move to start position
      [Mouse]::SetCursorPos(${startX}, ${startY})
      Start-Sleep -Milliseconds 50
      # Press button down
      [Mouse]::mouse_event(${downFlag}, 0, 0, 0, 0)
      Start-Sleep -Milliseconds 100
      # Move to end position
      [Mouse]::SetCursorPos(${endX}, ${endY})
      Start-Sleep -Milliseconds 100
      # Release button
      [Mouse]::mouse_event(${upFlag}, 0, 0, 0, 0)
    `;
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
        return true;
    }
    catch (error) {
        log.error(`PowerShell mouse drag failed: ${error.message}`);
        return false;
    }
}
/**
 * Scroll mouse wheel
 * @param delta - Scroll amount (positive = up, negative = down)
 */
export function mouseScroll(delta) {
    log.debug(`Scrolling mouse wheel: ${delta}`);
    const native = loadNativeModule();
    if (native?.mouseScroll) {
        return native.mouseScroll(delta);
    }
    // Fallback: PowerShell
    return mouseScrollPowerShell(delta);
}
/**
 * Scroll using PowerShell (fallback)
 */
function mouseScrollPowerShell(delta) {
    try {
        const { execSync } = require("node:child_process");
        const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")]
        public static extern void mouse_event(int flags, int dx, int dy, int buttons, int extra);
        public const int MOUSEEVENTF_WHEEL = 0x0800;
      }
"@
      [Mouse]::mouse_event(0x0800, 0, 0, ${delta}, 0)
    `;
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
        return true;
    }
    catch (error) {
        log.error(`PowerShell mouse scroll failed: ${error.message}`);
        return false;
    }
}
/**
 * Get current mouse position
 * @returns Object with x and y coordinates
 */
export function getMousePosition() {
    const native = loadNativeModule();
    if (native?.getMousePosition) {
        return native.getMousePosition();
    }
    // Fallback: Return default position
    log.warn("Native getMousePosition not available, returning default");
    return { x: 0, y: 0 };
}
/**
 * Click at specific coordinates
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param button - Mouse button
 */
export function mouseClickAt(x, y, button = "LEFT") {
    log.debug(`Clicking at (${x}, ${y}) with ${button} button`);
    // Move to position first
    const moved = mouseMove(x, y);
    if (!moved)
        return false;
    // Small delay
    const { sleep } = require("../utils/index.js");
    sleep(50);
    // Then click
    return mouseClick(button);
}
// Export all functions
export default {
    mouseMove,
    mouseClick,
    mouseDoubleClick,
    mouseDrag,
    mouseScroll,
    getMousePosition,
    mouseClickAt,
    MouseButton,
};
//# sourceMappingURL=mouse.js.map