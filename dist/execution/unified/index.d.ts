/**
 * OpenOxygen — Unified Task Executor (完整版v2)
 *
 * 自动选择 Terminal/GUI/Browser/Hybrid 执行模式
 * 已集成真实 Terminal/Browser 模块
 */
import type { ToolResult, ExecutionMode } from "../../types/index.js";
import * as Terminal from "../terminal/index.js";
import * as Browser from "../browser/index.js";
export type TaskStrategy = {
    mode: ExecutionMode;
    confidence: number;
    reason: string;
    fallback?: ExecutionMode;
};
export type ExecutionResult = ToolResult & {
    mode: ExecutionMode;
    strategy: TaskStrategy;
    durationMs: number;
    logs: string[];
};
declare function routeTaskInternal(instruction: string): TaskStrategy;
export declare const analyzeTask: typeof routeTaskInternal;
export declare function executeWithStrategy(instruction: string, strategy?: TaskStrategy): Promise<ExecutionResult>;
export declare function handleExecutionRequest(instruction: string, options?: {
    mode?: ExecutionMode;
    timeout?: number;
}): Promise<ExecutionResult>;
export { Terminal, Browser };
//# sourceMappingURL=index.d.ts.map