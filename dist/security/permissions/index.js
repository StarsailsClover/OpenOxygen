/**
 * OpenOxygen - Permission System
 *
 * Zero-trust permission management for secure execution
 * Provides fine-grained access control for all operations
 */
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("security/permissions");
// ============================================================================
// Permission Types
// ============================================================================
export export export export export export 
// ============================================================================
// Default Permission Sets
// ============================================================================
export const DEFAULT_PERMISSION_SETS = {
    minimal,
};
{
    resource: "math", level;
    "execute";
}
{
    resource: "date", level;
    "read";
}
createdAt.now(),
    updatedAt.now(),
;
standard,
    { resource: "math", level: "execute" },
    { resource: "date", level: "read" },
    { resource: "json", level: "execute" },
    { resource: "array", level: "execute" },
    { resource: "object", level: "execute" },
    { resource: "string", level: "execute" },
;
createdAt.now(),
    updatedAt.now(),
;
elevated,
    { resource: "math", level: "execute" },
    { resource: "date", level: "read" },
    { resource: "json", level: "execute" },
    { resource: "array", level: "execute" },
    { resource: "object", level: "execute" },
    { resource: "string", level: "execute" },
    { resource: "path", level: "read" },
    { resource: "crypto", level: "execute" },
    { resource: "url", level: "read" },
;
createdAt.now(),
    updatedAt.now(),
;
unrestricted,
;
createdAt.now(),
    updatedAt.now(),
;
;
// ============================================================================
// Permission Manager
// ============================================================================
class PermissionManager {
    permissionSets = new Map();
    activeGrants = new Map();
    constructor() {
        // Load default permission sets
        for (const [key, set] of Object.entries(DEFAULT_PERMISSION_SETS)) {
            this.permissionSets.set(key, set);
        }
        log.info("Permission manager initialized");
    }
    /**
     * Check if an action is permitted
     */
    checkPermission(request, permissionSetId = "minimal") {
        const permissionSet = this.permissionSets.get(permissionSetId);
        if (!permissionSet) {
            return {
                granted,
                reason: `Permission set '${permissionSetId}' not found`,
            };
        }
        // Check for wildcard permission
        const wildcard = permissionSet.permissions.find((p) => p.resource === "*");
        if (wildcard) {
            return {
                granted,
                level, : .level,
            };
        }
        // Find specific permission
        const permission = permissionSet.permissions.find((p) => p.resource === request.resource || this.matchesPattern(request.resource, p.resource));
        if (!permission) {
            return {
                granted,
                reason: `No permission granted for resource '${request.resource}'`,
            };
        }
        // Check conditions
        if (permission.conditions && !this.checkConditions(permission.conditions, request.context)) {
            return {
                granted,
                reason: "Permission conditions not met",
                level, : .level,
            };
        }
        // Check if level is sufficient
        const requiredLevel = this.actionToLevel(request.action);
        if (!this.isLevelSufficient(permission.level, requiredLevel)) {
            return {
                granted,
                reason: `Insufficient permission level '${permission.level}', need '${requiredLevel}'`,
                level, : .level,
            };
        }
        return {
            granted,
            level, : .level,
        };
    }
    /**
     * Grant temporary permission
     */
    grantTemporaryPermission(request, durationMs, permissionSetId = "minimal") {
        const check = this.checkPermission(request, permissionSetId);
        if (!check.granted) {
            return check;
        }
        const grantId = `${request.resource}:${Date.now()}`;
        const expiresAt = Date.now() + durationMs;
        const result = {
            granted,
            level, : .level,
            expiresAt,
        };
        this.activeGrants.set(grantId, result);
        // Auto-expire
        setTimeout(() => {
            this.activeGrants.delete(grantId);
            log.debug(`Permission grant expired: ${grantId}`);
        }, durationMs);
        log.info(`Temporary permission granted: ${request.resource} until ${new Date(expiresAt).toISOString()}`);
        return result;
    }
    /**
     * Create custom permission set
     */
    createPermissionSet(set, , PermissionSet, , , , , ) { }
}
 > ;
{
    const newSet = {
        ...set,
        id: `custom-${Date.now()}`,
        createdAt, : .now(),
        updatedAt, : .now(),
    };
    this.permissionSets.set(newSet.id, newSet);
    log.info(`Permission set created: ${newSet.name} (${newSet.id})`);
    return newSet;
}
/**
 * Update permission set
 */
updatePermissionSet(id, updates) | null;
{
    const existing = this.permissionSets.get(id);
    if (!existing) {
        return null;
    }
    const updated = {
        ...existing,
        ...updates,
        updatedAt, : .now(),
    };
    this.permissionSets.set(id, updated);
    log.info(`Permission set updated: ${updated.name}`);
    return updated;
}
/**
 * Delete permission set
 */
deletePermissionSet(id);
{
    const existed = this.permissionSets.has(id);
    if (existed) {
        this.permissionSets.delete(id);
        log.info(`Permission set deleted: ${id}`);
    }
    return existed;
}
/**
 * Get permission set
 */
getPermissionSet(id) | undefined;
{
    return this.permissionSets.get(id);
}
/**
 * List all permission sets
 */
listPermissionSets();
{
    return Array.from(this.permissionSets.values());
}
/**
 * Validate permission set
 */
validatePermissionSet(set);
{
    const errors = [];
    if (!set.name || set.name.length < 1) {
        errors.push("Name is required");
    }
    if (!set.permissions || set.permissions.length === 0) {
        errors.push("At least one permission is required");
    }
    for (const perm of set.permissions) {
        if (!perm.resource) {
            errors.push("Permission resource is required");
        }
        if (!perm.level) {
            errors.push("Permission level is required");
        }
    }
    return {
        valid, : .length === 0,
        errors,
    };
}
matchesPattern(resource, pattern);
{
    // Simple glob matching
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    return regex.test(resource);
}
actionToLevel(action);
{
    const levelMap = {
        read: "read",
        write: "write",
        execute: "execute",
        delete: "write",
        create: "write",
        admin: "admin",
    };
    return levelMap[action] || "none";
}
isLevelSufficient(have, need);
{
    const levels = ["none", "read", "write", "execute", "admin"];
    const haveIndex = levels.indexOf(have);
    const needIndex = levels.indexOf(need);
    return haveIndex >= needIndex;
}
checkConditions(conditions, context ?  : );
{
    if (!context)
        return false;
    for (const condition of conditions) {
        const value = this.getContextValue(context, condition.type);
        if (!this.evaluateCondition(value, condition)) {
            return false;
        }
    }
    return true;
}
getContextValue(context, type);
{
    switch (type) {
        case "time": Date.now();
        case "path": context.path;
        case "size": context.size;
        case "rate": context.rate;
        default: context[type];
    }
}
evaluateCondition(value, condition);
{
    switch (condition.operator) {
        case "eq": value === condition.value;
        case "ne": value !== condition.value;
        case "gt"(value) > (condition.value): ;
        case "lt"(value) < (condition.value): ;
        case "gte"(value) >= (condition.value): ;
        case "lte"(value) <= (condition.value): ;
        case "in"(condition.value[]).includes(value): ;
        case "contains": String(value).includes(String(condition.value));
        default: false;
    }
}
// ============================================================================
// Singleton Export
// ============================================================================
export const permissionManager = new PermissionManager();
// Convenience functions
export function checkPermission(request, permissionSetId) {
    return permissionManager.checkPermission(request, permissionSetId);
}
export function grantTemporaryPermission(request, durationMs, permissionSetId) {
    return permissionManager.grantTemporaryPermission(request, durationMs, permissionSetId);
}
export function createPermissionSet(set, , PermissionSet, , , , , ) { }
 > ,
;
{
    return permissionManager.createPermissionSet(set);
}
export function getPermissionSet(id) { }
 | undefined;
{
    return permissionManager.getPermissionSet(id);
}
export function listPermissionSets() {
    return permissionManager.listPermissionSets();
}
