/**
 * OpenOxygen — Output Layer (26w15aD Phase 1)
 *
 * 请求链路革新 - 输出层
 * 通知系统、实时推送、错误提示、结果可视化
 */

import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("output");

/**
 * Show notification
 * @param title - Notification title
 * @param message - Notification message
 * @param type - Notification type (info, success, warning, error)
 */
export function showNotification(
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
): boolean {
  log.info(`Showing notification [${type}]: ${title}`);

  try {
    const { execSync } = require("node:child_process");

    // Escape special characters
    const escapedTitle = title.replace(/"/g, '""');
    const escapedMessage = message.replace(/"/g, '""');

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.MessageBox]::Show("${escapedMessage}", "${escapedTitle}")
    `;

    // For non-blocking notifications, use Windows Toast or similar
    // This is a simplified implementation
    execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });

    return true;
  } catch (error) {
    log.error(`Failed to show notification: ${error.message}`);
    return false;
  }
}

/**
 * Push progress update
 * @param taskId - Task ID
 * @param progress - Progress percentage (0-100)
 * @param message - Progress message
 */
export function pushProgress(
  taskId: string,
  progress: number,
  message: string,
): void {
  log.debug(`Progress [${taskId}]: ${progress}% - ${message}`);

  // This would push to WebSocket clients or update UI
  // For now, just log it
  const progressData = {
    taskId,
    progress,
    message,
    timestamp: Date.now(),
  };

  log.debug(`Progress data: ${JSON.stringify(progressData)}`);
}

/**
 * Show friendly error message
 * @param error - Error object or message
 * @param context - Error context
 */
export function showFriendlyError(
  error: Error | string,
  context?: string,
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;

  log.error(`Friendly error: ${fullMessage}`);

  // Map technical errors to user-friendly messages
  const friendlyMessages: Record<string, string> = {
    ENOENT: "找不到指定的文件或路径",
    EACCES: "权限不足，无法访问",
    ECONNREFUSED: "连接被拒绝，请检查服务是否运行",
    ETIMEDOUT: "连接超时，请检查网络",
    ENOTFOUND: "无法找到指定的地址",
  };

  let friendlyMessage = errorMessage;
  for (const [code, message] of Object.entries(friendlyMessages)) {
    if (errorMessage.includes(code)) {
      friendlyMessage = message;
      break;
    }
  }

  showNotification("错误", friendlyMessage, "error");
}

/**
 * Visualize execution result
 * @param result - Execution result object
 */
export function visualizeResult(result: any): void {
  log.info("Visualizing execution result");

  // Format result for display
  const formatted = formatResultForDisplay(result);

  // This would update UI with formatted result
  log.debug(`Formatted result: ${formatted}`);
}

/**
 * Format result for display
 */
function formatResultForDisplay(result: any): string {
  if (typeof result === "string") {
    return result;
  }

  if (result === null || result === undefined) {
    return "无结果";
  }

  if (typeof result === "object") {
    // Format based on result type
    if (result.success !== undefined) {
      const status = result.success ? "✅ 成功" : "❌ 失败";
      const output = result.output || result.message || "";
      const error = result.error ? `\n错误: ${result.error}` : "";
      return `${status}\n${output}${error}`;
    }

    return JSON.stringify(result, null, 2);
  }

  return String(result);
}

/**
 * Show toast notification (non-blocking)
 * @param message - Toast message
 * @param durationMs - Display duration
 */
export function showToast(message: string, durationMs: number = 3000): void {
  log.debug(`Toast: ${message} (${durationMs}ms)`);

  // This would show a non-blocking toast notification
  // For now, just log it
  console.log(`[Toast] ${message}`);
}

/**
 * Update status bar
 * @param status - Status text
 * @param icon - Status icon (optional)
 */
export function updateStatusBar(status: string, icon?: string): void {
  log.debug(`Status bar: ${icon || ""} ${status}`);

  // This would update a status bar in the UI
  // For now, just log it
}

/**
 * Play sound notification
 * @param type - Sound type
 */
export function playSound(
  type: "success" | "error" | "warning" | "info" = "info",
): void {
  log.debug(`Playing sound: ${type}`);

  try {
    const { execSync } = require("node:child_process");

    // Use Windows system sounds
    const soundMap: Record<string, string> = {
      success: "SystemAsterisk",
      error: "SystemHand",
      warning: "SystemExclamation",
      info: "SystemDefault",
    };

    const sound = soundMap[type] || "SystemDefault";

    const script = `
      [System.Media.SystemSounds]::${sound}.Play()
    `;

    execSync(`powershell -Command "${script}"`, { encoding: "utf-8" });
  } catch (error) {
    log.error(`Failed to play sound: ${error.message}`);
  }
}

// Export all functions
export default {
  showNotification,
  pushProgress,
  showFriendlyError,
  visualizeResult,
  showToast,
  updateStatusBar,
  playSound,
};
