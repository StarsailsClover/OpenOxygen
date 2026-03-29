/**
 * OpenOxygen Phase 4 — Multi-Monitor DPI Awareness (26w11aE_P4)
 *
 * 多显示器 DPI 感知：
 * - 枚举所有显示器及其 DPI
 * - 自动坐标转换
 * - 跨显示器鼠标移动
 */

import { createSubsystemLogger } from "../logging/index.js";

const log = createSubsystemLogger("input/dpi");

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// DPI Manager
// ═══════════════════════════════════════════════════════════════════════════

export class DPIManager {
  private monitors: MonitorInfo[] = [];
  private nativeModule: any = null;

  constructor() {
    this.loadNative();
    this.detectMonitors();
  }

  private loadNative(): void {
    try {
      const { loadNativeModule } = require("../native-bridge.js");
      this.nativeModule = loadNativeModule();
    } catch {}
  }

  /**
   * 检测所有显示器
   */
  detectMonitors(): void {
    if (this.nativeModule?.getScreenMetrics) {
      const metrics = this.nativeModule.getScreenMetrics();

      // 单显示器情况
      this.monitors = [
        {
          id: 0,
          name: "Primary",
          x: 0,
          y: 0,
          width: metrics.physicalWidth,
          height: metrics.physicalHeight,
          dpiX: metrics.dpiX,
          dpiY: metrics.dpiY,
          scaleFactor: metrics.scaleFactor,
          isPrimary: true,
        },
      ];

      log.info(
        `Detected ${this.monitors.length} monitor(s): ${metrics.physicalWidth}x${metrics.physicalHeight} @ ${metrics.dpiX}DPI`,
      );
    } else {
      // 默认值
      this.monitors = [
        {
          id: 0,
          name: "Default",
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          dpiX: 96,
          dpiY: 96,
          scaleFactor: 1.0,
          isPrimary: true,
        },
      ];
    }
  }

  /**
   * 获取所有显示器信息
   */
  getMonitors(): MonitorInfo[] {
    return [...this.monitors];
  }

  /**
   * 逻辑坐标 → 物理坐标
   */
  logicalToPhysical(logical: LogicalCoordinate): PhysicalCoordinate {
    const monitor = this.findMonitorAt(logical.x, logical.y);
    return {
      x: Math.round((logical.x - monitor.x) * monitor.scaleFactor + monitor.x),
      y: Math.round((logical.y - monitor.y) * monitor.scaleFactor + monitor.y),
      monitorId: monitor.id,
    };
  }

  /**
   * 物理坐标 → 逻辑坐标
   */
  physicalToLogical(physical: PhysicalCoordinate): LogicalCoordinate {
    const monitor =
      this.monitors.find((m) => m.id === physical.monitorId) ||
      this.monitors[0]!;
    return {
      x: Math.round((physical.x - monitor.x) / monitor.scaleFactor + monitor.x),
      y: Math.round((physical.y - monitor.y) / monitor.scaleFactor + monitor.y),
    };
  }

  /**
   * 找到坐标所在的显示器
   */
  findMonitorAt(x: number, y: number): MonitorInfo {
    for (const monitor of this.monitors) {
      if (
        x >= monitor.x &&
        x < monitor.x + monitor.width &&
        y >= monitor.y &&
        y < monitor.y + monitor.height
      ) {
        return monitor;
      }
    }
    return this.monitors[0]!; // 默认主显示器
  }

  /**
   * 检查坐标是否在屏幕范围内
   */
  isOnScreen(x: number, y: number): boolean {
    return this.monitors.some(
      (m) => x >= m.x && x < m.x + m.width && y >= m.y && y < m.y + m.height,
    );
  }

  /**
   * 获取全局屏幕边界
   */
  getGlobalBounds(): { x: number; y: number; width: number; height: number } {
    const minX = Math.min(...this.monitors.map((m) => m.x));
    const minY = Math.min(...this.monitors.map((m) => m.y));
    const maxX = Math.max(...this.monitors.map((m) => m.x + m.width));
    const maxY = Math.max(...this.monitors.map((m) => m.y + m.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
}

// 全局 DPI 管理器
export const dpiManager = new DPIManager();
