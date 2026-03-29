/**
 * OpenOxygen - Execution Sandbox (Security Hardened)
 *
 * Secure sandbox for executing untrusted code and plugins.
 * Uses Node.js Worker Threads for true isolation.
 * Provides resource limits, timeout control, and permission isolation.
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
export type SandboxWorkerMessage = {
    type: "result";
    result: unknown;
} | {
    type: "error";
    error: string;
} | {
    type: "log";
    level: string;
    message: string;
};
export declare function createDefaultSandboxConfig(): SandboxConfig;
/**
 * Execute code in a secure sandbox using Worker Threads
 *
 * Security features:
 * - Code runs in isolated Worker Thread
 * - No access to Node.js APIs (fs, net, child_process, etc.)
 * - Limited JavaScript globals only
 * - Timeout enforcement
 * - Memory limits (via resourceLimits in Worker constructor)
 */
export declare function executeSandboxed(code: string, config?: SandboxConfig, context?: Record<string, unknown>): Promise<ToolResult>;
export declare function getActiveExecutions(): SandboxExecution[];
export declare function getExecution(id: string): SandboxExecution | undefined;
export declare function cancelExecution(id: string): boolean;
export declare function getExecutionStats(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    timeout: number;
};
/**
 * Safely evaluate a simple mathematical or logical expression
 * This is a convenience wrapper for simple use cases
 */
export declare function evaluateExpression(expression: string, variables?: Record<string, number | string | boolean>): Promise<ToolResult>;
//# sourceMappingURL=index.d.ts.map
