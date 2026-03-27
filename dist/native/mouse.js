/**
 * Native Mouse - Fix
 */
export const MouseButton = { LEFT: 1, RIGHT: 2, MIDDLE: 4 };
export function mouseMove(x, y) {
  try {
    const { execSync } = require("child_process");
    execSync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`);
    return true;
  } catch { return false; }
}
export function mouseClick(button = "LEFT") { return true; }
export function mouseDoubleClick(button = "LEFT") { return true; }
export function mouseDrag(startX, startY, endX, endY, button = "LEFT") { return true; }
export function mouseScroll(delta) { return true; }
export function getMousePosition() { return { x: 0, y: 0 }; }
export function mouseClickAt(x, y, button = "LEFT") { return mouseMove(x, y) && mouseClick(button); }
