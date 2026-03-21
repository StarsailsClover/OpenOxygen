/**
 * OpenOxygen Phase 4 — Multi-Monitor DPI Awareness (26w11aE_P4)
 *
 * 多显示器 DPI 感知：
 * - 枚举所有显示器及其 DPI
 * - 自动坐标转换
 * - 跨显示器鼠标移动
 */
export interface MonitorInfo {
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    dpiX: number;
    dpiY: number;
    scaleFactor: number;
    isPrimary: boolean;
}
export interface PhysicalCoordinate {
    x: number;
    y: number;
    monitorId: number;
}
export interface LogicalCoordinate {
    x: number;
    y: number;
}
export declare class DPIManager {
    private monitors;
    private nativeModule;
    constructor();
    private loadNative;
    /**
     * 检测所有显示器
     */
    detectMonitors(): void;
    /**
     * 获取所有显示器信息
     */
    getMonitors(): MonitorInfo[];
    /**
     * 逻辑坐标 → 物理坐标
     */
    logicalToPhysical(logical: LogicalCoordinate): PhysicalCoordinate;
    /**
     * 物理坐标 → 逻辑坐标
     */
    physicalToLogical(physical: PhysicalCoordinate): LogicalCoordinate;
    /**
     * 找到坐标所在的显示器
     */
    findMonitorAt(x: number, y: number): MonitorInfo;
    /**
     * 检查坐标是否在屏幕范围内
     */
    isOnScreen(x: number, y: number): boolean;
    /**
     * 获取全局屏幕边界
     */
    getGlobalBounds(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export declare const dpiManager: DPIManager;
//# sourceMappingURL=dpi.d.ts.map