/**
 * OpenOxygen — Windows System Control Module
 *
 * 内核级 Windows 系统操作：文件系统、进程管理、注册表、剪贴板、
 * 键鼠输入、网络、服务管理等。
 * 通过 PowerShell + Win32 API (ffi-napi) 双路径实现。
 */
import type { SystemOperation, ToolResult } from "../../types/index.js";
export declare function fileRead(filePath: string): Promise<ToolResult>;
export declare function fileWrite(filePath: string, content: string): Promise<ToolResult>;
export declare function fileDelete(filePath: string): Promise<ToolResult>;
export declare function fileList(dirPath: string, recursive?: boolean): Promise<ToolResult>;
export declare function processStart(command: string, args?: string[], cwd?: string): Promise<ToolResult>;
export declare function processKill(pid: number): Promise<ToolResult>;
export declare function processList(filter?: string): Promise<ToolResult>;
export declare function registryRead(keyPath: string, valueName?: string): Promise<ToolResult>;
export declare function registryWrite(keyPath: string, valueName: string, value: string, type?: string): Promise<ToolResult>;
export declare function clipboardRead(): Promise<ToolResult>;
export declare function clipboardWrite(text: string): Promise<ToolResult>;
export declare function screenCapture(outputPath: string): Promise<ToolResult>;
export declare function sendKeys(keys: string): Promise<ToolResult>;
export declare function mouseClick(x: number, y: number, button?: "left" | "right"): Promise<ToolResult>;
export declare function networkRequest(url: string, method?: string, body?: string, headers?: Record<string, string>): Promise<ToolResult>;
export declare function executeSystemOperation(operation: SystemOperation, params: Record<string, unknown>): Promise<ToolResult>;
//# sourceMappingURL=index.d.ts.map