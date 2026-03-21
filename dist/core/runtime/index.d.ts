/**
 * OpenOxygen — Runtime Environment
 *
 * 运行时环境管理：进程生命周期、平台检测、终端状态恢复。
 * 独立实现，参考 OpenClaw runtime.ts 的接口契约但重写全部逻辑。
 */
import type { OxygenRuntimeEnv } from "../../types/index.js";
export declare function assertSupportedRuntime(): void;
export declare function setTerminalRawMode(enabled: boolean): void;
export declare function restoreTerminalState(reason: string): void;
/**
 * Default runtime — used in production.
 * Restores terminal state before exit.
 */
export declare const defaultRuntime: OxygenRuntimeEnv;
/**
 * Non-exiting runtime — used in tests.
 * Throws instead of calling process.exit.
 */
export declare function createTestRuntime(): OxygenRuntimeEnv;
export declare function installGlobalErrorHandlers(runtime: OxygenRuntimeEnv): void;
export declare function getSystemInfo(): Record<string, string | number>;
//# sourceMappingURL=index.d.ts.map