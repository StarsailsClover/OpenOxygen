/**
 * OpenOxygen — Output Layer (26w15aD Phase 1)
 *
 * 请求链路革新 - 输出层
 * 通知系统、实时推送、错误提示、结果可视化
 */
/**
 * Show notification
 * @param title - Notification title
 * @param message - Notification message
 * @param type - Notification type (info, success, warning, error)
 */
export declare function showNotification(title: string, message: string, type?: "info" | "success" | "warning" | "error"): boolean;
/**
 * Push progress update
 * @param taskId - Task ID
 * @param progress - Progress percentage (0-100)
 * @param message - Progress message
 */
export declare function pushProgress(taskId: string, progress: number, message: string): void;
/**
 * Show friendly error message
 * @param error - Error object or message
 * @param context - Error context
 */
export declare function showFriendlyError(error: Error | string, context?: string): void;
/**
 * Visualize execution result
 * @param result - Execution result object
 */
export declare function visualizeResult(result: any): void;
/**
 * Show toast notification (non-blocking)
 * @param message - Toast message
 * @param durationMs - Display duration
 */
export declare function showToast(message: string, durationMs?: number): void;
/**
 * Update status bar
 * @param status - Status text
 * @param icon - Status icon (optional)
 */
export declare function updateStatusBar(status: string, icon?: string): void;
/**
 * Play sound notification
 * @param type - Sound type
 */
export declare function playSound(type?: "success" | "error" | "warning" | "info"): void;
declare const _default: {
    showNotification: typeof showNotification;
    pushProgress: typeof pushProgress;
    showFriendlyError: typeof showFriendlyError;
    visualizeResult: typeof visualizeResult;
    showToast: typeof showToast;
    updateStatusBar: typeof updateStatusBar;
    playSound: typeof playSound;
};
export default _default;
//# sourceMappingURL=index.d.ts.map