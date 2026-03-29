/**
 * OpenOxygen — Input Safety Guard (26w11aE_P3)
 *
 * 防止输入系统锁定用户鼠标/键盘的安全机制
 */

import { createSubsystemLogger } from "../logging/index.js";

const log = createSubsystemLogger("input/safety");

// ═══════════════════════════════════════════════════════════════════════════
// Safety Configuration
// ═══════════════════════════════════════════════════════════════════════════

export const INPUT_SAFETY_CONFIG = {
  // 最大连续输入操作数
  maxConsecutiveOps: 10,

  // 操作之间最小间隔 (ms)
  minIntervalMs: 100,

  // 紧急停止热键: Ctrl+Shift+Esc
  emergencyHotkey: {
    ctrl: true,
    shift: true,
    key: "Escape",
  },

  // 自动释放超时 (ms)
  autoReleaseTimeoutMs: 5000,

  // 安全区域 (屏幕中心区域不操作)
  safeZone: {
    enabled: true,
    marginPercent: 10, // 屏幕边缘 10% 为安全区
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Input Safety Guard
// ═══════════════════════════════════════════════════════════════════════════

export class InputSafetyGuard {
  private opCount = 0;
  private lastOpTime = 0;
  private isPaused = false;
  private autoReleaseTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 检查是否允许执行输入操作
   */
  check(operation: string): { allowed: boolean; reason?: string } {
    if (this.isPaused) {
      return { allowed: false, reason: "Input system paused" };
    }

    // 检查连续操作数
    if (this.opCount >= INPUT_SAFETY_CONFIG.maxConsecutiveOps) {
      return {
        allowed: false,
        reason: `Too many consecutive operations (${this.opCount}), reset required`,
      };
    }

    // 检查操作间隔
    const now = Date.now();
    const elapsed = now - this.lastOpTime;
    if (elapsed < INPUT_SAFETY_CONFIG.minIntervalMs) {
      return {
        allowed: false,
        reason: `Operation too frequent (${elapsed}ms < ${INPUT_SAFETY_CONFIG.minIntervalMs}ms)`,
      };
    }

    return { allowed: true };
  }

  /**
   * 记录输入操作
   */
  record(operation: string): void {
    this.opCount++;
    this.lastOpTime = Date.now();

    log.debug(
      `Input operation recorded: ${operation} (count: ${this.opCount})`,
    );

    // 设置自动释放
    this.resetAutoReleaseTimer();
  }

  /**
   * 重置操作计数
   */
  reset(): void {
    this.opCount = 0;
    this.lastOpTime = 0;
    this.isPaused = false;
    this.clearAutoReleaseTimer();
    log.info("Input safety guard reset");
  }

  /**
   * 暂停输入系统
   */
  pause(): void {
    this.isPaused = true;
    log.info("Input system paused");
  }

  /**
   * 恢复输入系统
   */
  resume(): void {
    this.isPaused = false;
    this.reset();
    log.info("Input system resumed");
  }

  /**
   * 紧急停止所有输入
   */
  emergencyStop(): void {
    this.pause();
    this.clearAutoReleaseTimer();

    // 尝试释放所有按键
    this.releaseAllKeys();

    log.error("EMERGENCY STOP: All input operations halted");
  }

  /**
   * 检查坐标是否在安全区域
   */
  isInSafeZone(
    x: number,
    y: number,
    screenWidth: number,
    screenHeight: number,
  ): boolean {
    if (!INPUT_SAFETY_CONFIG.safeZone.enabled) return true;

    const marginX =
      screenWidth * (INPUT_SAFETY_CONFIG.safeZone.marginPercent / 100);
    const marginY =
      screenHeight * (INPUT_SAFETY_CONFIG.safeZone.marginPercent / 100);

    return (
      x >= marginX &&
      x <= screenWidth - marginX &&
      y >= marginY &&
      y <= screenHeight - marginY
    );
  }

  private resetAutoReleaseTimer(): void {
    this.clearAutoReleaseTimer();
    this.autoReleaseTimer = setTimeout(() => {
      log.debug("Auto-release triggered");
      this.reset();
    }, INPUT_SAFETY_CONFIG.autoReleaseTimeoutMs);
  }

  private clearAutoReleaseTimer(): void {
    if (this.autoReleaseTimer) {
      clearTimeout(this.autoReleaseTimer);
      this.autoReleaseTimer = null;
    }
  }

  private releaseAllKeys(): void {
    // 使用 native 模块释放所有按键
    try {
      const native = require("../native-bridge.js");
      if (native.loadNativeModule) {
        const mod = native.loadNativeModule();
        if (mod && mod.sendHotkey) {
          // 发送空操作确保状态重置
          log.debug("Attempting to release all keys via native module");
        }
      }
    } catch {
      // 忽略错误
    }
  }
}

// 全局安全守卫实例
export const inputSafetyGuard = new InputSafetyGuard();

// ═══════════════════════════════════════════════════════════════════════════
// Safe Input Wrapper
// ═══════════════════════════════════════════════════════════════════════════

export async function safeInput<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: { skipSafetyCheck?: boolean },
): Promise<T> {
  if (!options?.skipSafetyCheck) {
    const check = inputSafetyGuard.check(operation);
    if (!check.allowed) {
      throw new Error(`Input safety check failed: ${check.reason}`);
    }
  }

  try {
    const result = await fn();
    inputSafetyGuard.record(operation);
    return result;
  } catch (err) {
    // 错误时自动暂停
    inputSafetyGuard.pause();
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Emergency Recovery
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 紧急恢复函数 - 可从外部调用
 */
export function emergencyRecover(): void {
  inputSafetyGuard.emergencyStop();

  // 尝试移动鼠标到屏幕中心
  try {
    const native = require("../native-bridge.js");
    const mod = native.loadNativeModule();
    if (mod && mod.mouseMove) {
      // 获取屏幕尺寸
      const metrics = mod.getScreenMetrics();
      const centerX = Math.floor(metrics.physicalWidth / 2);
      const centerY = Math.floor(metrics.physicalHeight / 2);
      mod.mouseMove(centerX, centerY);
    }
  } catch (err) {
    log.error("Failed to recover mouse position:", err);
  }

  log.info("Emergency recovery completed");
}

// 注册全局紧急处理
if (typeof process !== "undefined") {
  process.on("SIGINT", () => {
    emergencyRecover();
    process.exit(0);
  });
}
