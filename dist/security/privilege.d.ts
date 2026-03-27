/**
 * OpenOxygen — Windows Privilege Isolation (26w11aE_P1)
 *
 * 针对 risks.md Windows 权限继承风险的加固实现：
 * - 低权限用户创建与运行
 * - 权限降级执行
 * - 沙箱进程隔离
 */
export type PrivilegeLevel = "system" | "admin" | "user" | "restricted";
export interface PrivilegeStatus {
    level: PrivilegeLevel;
    isElevated: boolean;
    canEscalate: boolean;
    username: string;
    domain: string;
}
/**
 * 检测当前进程权限级别
 */
export declare function detectPrivilegeLevel(): PrivilegeStatus;
export interface LowPrivilegeConfig {
    username: string;
    password: string;
    allowedPaths: string[];
    deniedPaths: string[];
}
export declare class LowPrivilegeSandbox {
    private config;
    constructor(config: LowPrivilegeConfig);
    /**
     * 创建低权限 Windows 用户
     */
    createUser(): boolean;
    /**
     * 删除低权限用户
     */
    deleteUser(): boolean;
    /**
     * 以低权限用户执行命令
     */
    executeAsUser(command: string, args?: string[]): Promise<{
        success: boolean;
        output: string;
        error?: string;
    }>;
}
/**
 * 尝试降级权限（仅限 Unix）
 */
export declare function dropPrivileges(targetUser?: string): boolean;
export interface IsolatedProcessConfig {
    command: string;
    args: string[];
    allowedPaths: string[];
    maxMemoryMB: number;
    timeoutMs: number;
    network: boolean;
}
/**
 * 启动隔离进程
 */
export declare function spawnIsolated(config: IsolatedProcessConfig): Promise<{
    success: boolean;
    pid?: number;
    output: string;
    error?: string;
}>;
export declare class PrivilegePolicy {
    private minLevel;
    private sandbox?;
    constructor(minLevel?: PrivilegeLevel);
    /**
     * 检查当前权限是否满足策略
     */
    check(): {
        allowed: boolean;
        current: PrivilegeStatus;
        reason?: string;
    };
    /**
     * 启用沙箱模式
     */
    enableSandbox(config: LowPrivilegeConfig): void;
    /**
     * 执行敏感操作（自动降级或沙箱）
     */
    executeSensitive<T>(operation: () => Promise<T>, options?: {
        useSandbox?: boolean;
        sandboxConfig?: LowPrivilegeConfig;
    }): Promise<T>;
}
export declare const privilegePolicy: PrivilegePolicy;
//# sourceMappingURL=privilege.d.ts.map