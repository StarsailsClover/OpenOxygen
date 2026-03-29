/**
 * OpenOxygen — System Tray (26w15aD Phase 6)
 *
 * 系统托盘集成
 * 快速输入、状态显示
 */
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("ui/tray");
// Tray instance
let trayInstance = null;
/**
 * Create system tray icon
 * @param iconPath - Path to icon
 */
export function createTray(iconPath = "icon.png") {
    log.info("Creating system tray");
    try {
        // This would use native APIs to create tray
        // For now, create placeholder
        trayInstance = {
            icon: iconPath,
            tooltip: "OpenOxygen",
            visible: true,
        };
        log.info("System tray created");
        return true;
    }
    catch (error) {
        log.error(`Failed to create tray: ${error.message}`);
        return false;
    }
}
/**
 * Set tray tooltip
 * @param tooltip - Tooltip text
 */
export function setTrayTooltip(tooltip) {
    if (trayInstance) {
        trayInstance.tooltip = tooltip;
        log.debug(`Tray tooltip: ${tooltip}`);
    }
}
/**
 * Show tray menu
 * @param items - Menu items
 */
export function showTrayMenu(items) {
    log.debug(`Showing tray menu with ${items.length} items`);
    // This would display native context menu
    // For now, just log
    for (const item of items) {
        if (item.separator) {
            log.debug("---");
        }
        else {
            log.debug(`${item.checked ? "[x]" : "[ ]"} ${item.label}`);
        }
    }
}
/**
 * Show quick input from tray
 */
export function showQuickInput() {
    log.info("Showing quick input from tray");
    // This would show a small input dialog near tray
    // For now, just log
}
/**
 * Update tray status
 * @param status - Status text
 * @param icon - Optional icon change
 */
export function updateTrayStatus(status, icon) {
    setTrayTooltip(`OpenOxygen - ${status}`);
    if (icon && trayInstance) {
        trayInstance.icon = icon;
    }
    log.debug(`Tray status: ${status}`);
}
/**
 * Destroy tray
 */
export function destroyTray() {
    if (trayInstance) {
        trayInstance = null;
        log.info("System tray destroyed");
    }
}
// Export
export default {
    createTray,
    setTrayTooltip,
    showTrayMenu,
    showQuickInput,
    updateTrayStatus,
    destroyTray,
};
