/**
 * OpenOxygen — Terminal Executor (Simplified v1)
 *
 * 当前实现状态：框架搭建，核心功能待实现
 * TODO:
 * - [ ] 持久会话状态管理 (SQLite)
 * - [ ] 命令安全过滤完整实现
 * - [ ] 流式输出捕获
 * - [ ] 与 Gateway API 集成
 */
import type { ToolResult } from "../../types/index.js";
export type ShellType = "powershell" | "cmd" | "bash" | "wsl";
export type TerminalSession = {
    id: string;
    shellType: ShellType;
    cwd: string;
    env: Record<string, string>;
    createdAt: number;
    lastActiveAt: number;
    alive: boolean;
};
export type TerminalCommand = {
    id: string;
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    durationMs: number;
};
export declare function createDefaultTerminalConfig(): {
    defaultShell: ShellType;
    timeoutMs: number;
    maxOutputBytes: number;
    blockedCommands: string[];
};
declare const sessions: Map<string, TerminalSession>;
export declare function createSession(shellType?: ShellType, cwd?: string): TerminalSession;
export declare function destroySession(sessionId: string): void;
export declare function getSession(sessionId: string): TerminalSession | null;
export declare function executeCommand(sessionId: string, command: string): Promise<ToolResult & {
    terminalCommand: TerminalCommand;
}>;
export declare function quickExec(command: string, shellType?: ShellType): Promise<ToolResult>;
export { sessions };
//# sourceMappingURL=index.d.ts.map