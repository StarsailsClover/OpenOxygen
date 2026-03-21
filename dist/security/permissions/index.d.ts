/**
 * OpenOxygen — Permission System
 *
 * 最小权限原则：操作前权限校验、路径白名单、可执行文件黑名单。
 */
import type { SecurityConfig, SystemOperation } from "../../types/index.js";
export type PermissionCheckResult = {
    allowed: boolean;
    reason?: string;
};
export declare function checkPermission(operation: SystemOperation, config: SecurityConfig, target?: string): PermissionCheckResult;
export declare function assertPermission(operation: SystemOperation, config: SecurityConfig, target?: string): void;
//# sourceMappingURL=index.d.ts.map