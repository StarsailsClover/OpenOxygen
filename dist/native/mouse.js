/**
 * OpenOxygen - Native Mouse Control
 *
 * Windows 原生鼠标控制
 * 使用 Win32 API 实现真实鼠标移动和点击
 */
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("native/mouse");
// Mouse button constants
export const MouseButton = {
    LEFT: 0,
    RIGHT: 1,
    MIDDLE: 2,
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
export async function mouseMove(x, y) {
    log.debug(`Moving mouse to (${x}, ${y})`);
    try {
        // Use PowerShell to move mouse via Windows API
        const { execSync } = await import("node:child_process");
        const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
    `;
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
        return true;
    }
    catch (error) {
        log.error(`Mouse move failed: ${error.message}`);
        return false;
    }
}
/**
 * Click mouse button at current position
 * @param button - Button to click (0=left, 1=right, 2=middle)
 */
export async function mouseClick(button = MouseButton.LEFT) {
    log.debug(`Clicking mouse button: ${button}`);
    try {
        const { execSync } = await import("node:child_process");
        let downFlag, upFlag;
        switch (button) {
            case MouseButton.RIGHT:
                downFlag = MOUSEEVENTF_RIGHTDOWN;
                upFlag = MOUSEEVENTF_RIGHTUP;
                break;
            case MouseButton.MIDDLE:
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
        public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
      }
"@
      [Mouse]::mouse_event(${downFlag}, 0, 0, 0, 0)
      [Mouse]::mouse_event(${upFlag}, 0, 0, 0, 0)
    `;
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
        return true;
    }
    catch (error) {
        log.error(`Mouse click failed: ${error.message}`);
        return false;
    }
}
/**
 * Double-click mouse button at current position
 * @param button - Button to click (0=left, 1=right, 2=middle)
 */
export async function mouseDoubleClick(button = MouseButton.LEFT) {
    log.debug(`Double-clicking mouse button: ${button}`);
    await mouseClick(button);
    await new Promise(r => setTimeout(r, 50)); // Small delay between clicks
    await mouseClick(button);
    return true;
}
/**
 * Move mouse and click
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param button - Button to click
 */
export async function mouseClickAt(x, y, button = MouseButton.LEFT) {
    log.debug(`Clicking at (${x}, ${y}) with button ${button}`);
    await mouseMove(x, y);
    await new Promise(r => setTimeout(r, 50)); // Wait for move
    await mouseClick(button);
    return true;
}
/**
 * Drag mouse from one position to another
 * @param fromX - Start X coordinate
 * @param fromY - Start Y coordinate
 * @param toX - End X coordinate
 * @param toY - End Y coordinate
 * @param button - Button to hold during drag
 */
export async function mouseDrag(fromX, fromY, toX, toY, button = MouseButton.LEFT) {
    log.debug(`Dragging from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    try {
        const { execSync } = await import("node:child_process");
        let downFlag, upFlag;
        switch (button) {
            case MouseButton.RIGHT:
                downFlag = MOUSEEVENTF_RIGHTDOWN;
                upFlag = MOUSEEVENTF_RIGHTUP;
                break;
            case MouseButton.MIDDLE:
                downFlag = MOUSEEVENTF_MIDDLEDOWN;
                upFlag = MOUSEEVENTF_MIDDLEUP;
                break;
            default:
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
        }
        const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")]
        public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
      }
"@
      
      # Move to start position
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${fromX}, ${fromY})
      Start-Sleep -Milliseconds 50
      
      # Press button down
      [Mouse]::mouse_event(${downFlag}, 0, 0, 0, 0)
      Start-Sleep -Milliseconds 100
      
      # Move to end position
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${toX}, ${toY})
      Start-Sleep -Milliseconds 100
      
      # Release button
      [Mouse]::mouse_event(${upFlag}, 0, 0, 0, 0)
    `;
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
        return true;
    }
    catch (error) {
        log.error(`Mouse drag failed: ${error.message}`);
        return false;
    }
}
/**
 * Scroll mouse wheel
 * @param delta - Scroll amount (positive=up, negative=down)
 */
export async function mouseScroll(delta) {
    log.debug(`Scrolling mouse: ${delta}`);
    try {
        const { execSync } = await import("node:child_process");
        const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Mouse {
        [DllImport("user32.dll")]
        public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
      }
"@
      [Mouse]::mouse_event(${MOUSEEVENTF_WHEEL}, 0, 0, ${delta * 120}, 0)
    `;
        execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
        return true;
    }
    catch (error) {
        log.error(`Mouse scroll failed: ${error.message}`);
        return false;
    }
}
/**
 * Get current mouse position
 */
export async function getMousePosition() {
    try {
        const { execSync } = await import("node:child_process");
        const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $pos = [System.Windows.Forms.Cursor]::Position
      Write-Output "$($pos.X),$($pos.Y)"
    `;
        const output = execSync(`powershell -Command "${script}"`, { encoding: "utf-8" }).trim();
        const [x, y] = output.split(",").map(Number);
        return { x, y };
    }
    catch (error) {
        log.error(`Get mouse position failed: ${error.message}`);
        return { x: 0, y: 0 };
    }
}
// === Default Export ===
export const Mouse = {
    move: mouseMove,
    click: mouseClick,
    doubleClick: mouseDoubleClick,
    clickAt: mouseClickAt,
    drag: mouseDrag,
    scroll: mouseScroll,
    getPosition: getMousePosition,
    Button: MouseButton,
};
export default Mouse;
