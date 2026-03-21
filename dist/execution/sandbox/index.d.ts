/**
 * OpenOxygen — Execution Sandbox
 *
 * 安全沙箱：隔离执行不受信任的代码和插件。
 * 提供资源限制、超时控制和权限隔离。
 */
import type { ToolResult } from "../../types/index.js";
export type SandboxConfig = {
    enabled: boolean;
    timeoutMs: number;
    maxMemoryMB: number;
    allowedModules: string[];
    blockedAPIs: string[];
};
export type SandboxExecution = {
    id: string;
    code: string;
    startTime: number;
    endTime?: number;
    result?: unknown;
    error?: string;
    status: "running" | "completed" | "failed" | "timeout";
};
export declare function createDefaultSandboxConfig(): SandboxConfig;
export declare function executeSandboxed(code: string, config?: SandboxConfig, context?: Record<string, unknown>): Promise<ToolResult>;
export declare function getActiveExecutions(): SandboxExecution[];
export declare function getExecution(id: string): SandboxExecution | undefined;
//# sourceMappingURL=index.d.ts.map