/**
 * OpenOxygen �?System Tray (26w15aD Phase 6)
 *
 * 系统托盘集成
 * 快速输入、状态显�? */
export interface TrayMenuItem {
    id: string;
    label: string;
    icon?: string;
    enabled?: boolean;
    checked?: boolean;
    separator?: boolean;
    click?: () => void;
}
/**
 * Create system tray icon
 * @param iconPath - Path to icon
 */
export declare function createTray(iconPath?: string): boolean;
/**
 * Set tray tooltip
 * @param tooltip - Tooltip text
 */
export declare function setTrayTooltip(tooltip: string): void;
/**
 * Show tray menu
 * @param items - Menu items
 */
export declare function showTrayMenu(items: TrayMenuItem[]): void;
/**
 * Show quick input from tray
 */
export declare function showQuickInput(): void;
/**
 * Update tray status
 * @param status - Status text
 * @param icon - Optional icon change
 */
export declare function updateTrayStatus(status: string, icon?: string): void;
/**
 * Destroy tray
 */
export declare function destroyTray(): void;
declare const _default: {
    createTray: typeof createTray;
    setTrayTooltip: typeof setTrayTooltip;
    showTrayMenu: typeof showTrayMenu;
    showQuickInput: typeof showQuickInput;
    updateTrayStatus: typeof updateTrayStatus;
    destroyTray: typeof destroyTray;
};
export default _default;
//# sourceMappingURL=tray.d.ts.map
