/**
 * OpenOxygen - Permission System
 *
 * Zero-trust permission management for secure execution
 * Provides fine-grained access control for all operations
 */
import type { PermissionContext } from "../../types/index.js";
export type PermissionLevel = "none" | "read" | "write" | "execute" | "admin";
export interface ResourcePermission {
    resource: string;
    level: PermissionLevel;
    conditions?: PermissionCondition[];
}
export interface PermissionCondition {
    type: "time" | "path" | "size" | "rate" | "custom";
    operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
    value: unknown;
}
export interface PermissionSet {
    id: string;
    name: string;
    description: string;
    permissions: ResourcePermission[];
    inheritedFrom?: string[];
    createdAt: number;
    updatedAt: number;
}
export interface PermissionRequest {
    action: string;
    resource: string;
    context?: PermissionContext;
}
export interface PermissionResult {
    granted: boolean;
    reason?: string;
    level?: PermissionLevel;
    expiresAt?: number;
}
export declare const DEFAULT_PERMISSION_SETS: Record<string, PermissionSet>;
declare class PermissionManager {
    private permissionSets;
    private activeGrants;
    constructor();
    /**
     * Check if an action is permitted
     */
    checkPermission(request: PermissionRequest, permissionSetId?: string): PermissionResult;
    /**
     * Grant temporary permission
     */
    grantTemporaryPermission(request: PermissionRequest, durationMs: number, permissionSetId?: string): PermissionResult;
    /**
     * Create custom permission set
     */
    createPermissionSet(set: Omit<PermissionSet, "id" | "createdAt" | "updatedAt">): PermissionSet;
    /**
     * Update permission set
     */
    updatePermissionSet(id: string, updates: Partial<PermissionSet>): PermissionSet | null;
    /**
     * Delete permission set
     */
    deletePermissionSet(id: string): boolean;
    /**
     * Get permission set
     */
    getPermissionSet(id: string): PermissionSet | undefined;
    /**
     * List all permission sets
     */
    listPermissionSets(): PermissionSet[];
    /**
     * Validate permission set
     */
    validatePermissionSet(set: PermissionSet): {
        valid: boolean;
        errors: string[];
    };
    private matchesPattern;
    private actionToLevel;
    private isLevelSufficient;
    private checkConditions;
    private getContextValue;
    private evaluateCondition;
}
export declare const permissionManager: PermissionManager;
export declare function checkPermission(request: PermissionRequest, permissionSetId?: string): PermissionResult;
export declare function grantTemporaryPermission(request: PermissionRequest, durationMs: number, permissionSetId?: string): PermissionResult;
export declare function createPermissionSet(set: Omit<PermissionSet, "id" | "createdAt" | "updatedAt">): PermissionSet;
export declare function getPermissionSet(id: string): PermissionSet | undefined;
export declare function listPermissionSets(): PermissionSet[];
export {};
//# sourceMappingURL=index.d.ts.map
