/**
 * UI Tray - Fix
 */
let trayInstance = null;
export function createTray(iconPath = "icon.png") {
  trayInstance = { icon: iconPath, tooltip: "OpenOxygen", visible: true };
  return true;
}
export function setTrayTooltip(tooltip) {
  if (trayInstance) trayInstance.tooltip = tooltip;
}
export function showTrayMenu(items) {}
export function showQuickInput() {}
export function updateTrayStatus(status, icon) {
  setTrayTooltip(`OpenOxygen - ${status}`);
}
export function destroyTray() {
  trayInstance = null;
}
