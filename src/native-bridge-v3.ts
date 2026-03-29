/**
 * OpenOxygen Native Bridge v3 - 统一高性能架构
 *
 * 技术栈: Rust + SIMD + GPU 加速
 * 移除 C++ 双轨制，统一使用 Rust NAPI-RS
 */

import { createSubsystemLogger } from "./logging/index.js";

const log = createSubsystemLogger("native-bridge-v3");

// 导入 Rust 原生模块
// 注意: 需要重新构建 Rust 模块以包含新功能
let nativeModule: any = null;

try {
  // 尝试加载 Rust 模块
  nativeModule = require("../packages/core-native/index.js");
  log.info("Loaded Rust native module (high performance)");
} catch (e) {
  log.warn("Failed to load Rust module, using fallback:", e);
}

// 高性能 API 导出
export const NativeAPI = {
  // 截图 (GPU 加速)
  captureScreen: async (outputPath: string) => {
    if (nativeModule?.capture_screen_dxgi) {
      return nativeModule.capture_screen_dxgi(outputPath);
    }
    // Fallback to GDI
    return nativeModule?.capture_screen?.(outputPath) || { success: false };
  },

  // 向量搜索 (SIMD 加速)
  vectorSearch: (query: number[], vectors: number[][], topK: number) => {
    if (nativeModule?.SimdVectorStore) {
      const store = new nativeModule.SimdVectorStore(query.length);
      vectors.forEach((v) => store.add(v));
      return store.search(query, topK);
    }
    // Fallback
    return [];
  },

  // 鼠标控制
  mouseMove: (x: number, y: number) => {
    return nativeModule?.mouse_move?.(x, y) || { success: false };
  },

  // 键盘控制
  keyPress: (key: string) => {
    return nativeModule?.key_press?.(key) || { success: false };
  },

  // 系统信息
  getSystemInfo: () => {
    return nativeModule?.get_system_info?.() || { platform: "unknown" };
  },
};

// 性能监控
export const PerformanceMonitor = {
  metrics: new Map<string, number[]>(),

  record(operation: string, durationMs: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(durationMs);

    // 只保留最近 100 次
    if (this.metrics.get(operation)!.length > 100) {
      this.metrics.get(operation)!.shift();
    }
  },

  getStats(operation: string) {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) return null;

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { avg, min, max, count: times.length };
  },
};

export default NativeAPI;
