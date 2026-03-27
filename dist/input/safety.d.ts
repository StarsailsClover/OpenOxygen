/**
 * OpenOxygen — Input Safety Guard (26w11aE_P3)
 *
 * 防止输入系统锁定用户鼠标/键盘的安全机制
 */
export declare const INPUT_SAFETY_CONFIG: {
    maxConsecutiveOps: number;
    minIntervalMs: number;
    emergencyHotkey: {
        ctrl: boolean;
        shift: boolean;
        key: string;
    };
    autoReleaseTimeoutMs: number;
    safeZone: {
        enabled: boolean;
        marginPercent: number;
    };
};
export declare class InputSafetyGuard {
    private opCount;
    private lastOpTime;
    private isPaused;
    private autoReleaseTimer;
    /**
     * 检查是否允许执行输入操作
     */
    check(operation: string): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * 记录输入操作
     */
    record(operation: string): void;
    /**
     * 重置操作计数
     */
    reset(): void;
    /**
     * 暂停输入系统
     */
    pause(): void;
    /**
     * 恢复输入系统
     */
    resume(): void;
    /**
     * 紧急停止所有输入
     */
    emergencyStop(): void;
    /**
     * 检查坐标是否在安全区域
     */
    isInSafeZone(x: number, y: number, screenWidth: number, screenHeight: number): boolean;
    private resetAutoReleaseTimer;
    private clearAutoReleaseTimer;
    private releaseAllKeys;
}
export declare const inputSafetyGuard: InputSafetyGuard;
export declare function safeInput<T>(operation: string, fn: () => Promise<T>, options?: {
    skipSafetyCheck?: boolean;
}): Promise<T>;
/**
 * 紧急恢复函数 - 可从外部调用
 */
export declare function emergencyRecover(): void;
//# sourceMappingURL=safety.d.ts.map