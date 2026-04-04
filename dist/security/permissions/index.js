/**
 * OpenOxygen - Permission System
 *
 * Zero-trust permission management for secure execution
 * Provides fine-grained access control for all operations
 */
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("security/permissions");
<<<<<<< HEAD
// ============================================================================
// Default Permission Sets
// ============================================================================
=======
// === Default Permission Sets ===
>>>>>>> dev
export const DEFAULT_PERMISSION_SETS = {
    minimal: {
        id: "minimal",
        name: "Minimal Access",
<<<<<<< HEAD
        description: "Absolute minimal permissions for sandboxed execution",
        permissions: [
            { resource: "console", level: "write" },
            { resource: "math", level: "execute" },
            { resource: "date", level: "read" },
=======
        description: "Absolute minimal permissions for sandbox execution",
        permissions: [
            { resource: "file:read", level: "read", conditions: [{ type: "path", operator: "contains", value: "/tmp" }] },
            { resource: "network:outbound", level: "none" },
            { resource: "process:exec", level: "none" },
>>>>>>> dev
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    standard: {
        id: "standard",
        name: "Standard Access",
<<<<<<< HEAD
        description: "Standard permissions for trusted code execution",
        permissions: [
            { resource: "console", level: "write" },
            { resource: "math", level: "execute" },
            { resource: "date", level: "read" },
            { resource: "json", level: "execute" },
            { resource: "array", level: "execute" },
            { resource: "object", level: "execute" },
            { resource: "string", level: "execute" },
=======
        description: "Standard user permissions",
        permissions: [
            { resource: "file:read", level: "read" },
            { resource: "file:write", level: "write", conditions: [{ type: "path", operator: "contains", value: "~" }] },
            { resource: "network:outbound", level: "execute" },
            { resource: "process:exec", level: "execute", conditions: [{ type: "rate", operator: "lte", value: 10 }] },
>>>>>>> dev
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    elevated: {
        id: "elevated",
        name: "Elevated Access",
        description: "Elevated permissions for system operations",
        permissions: [
<<<<<<< HEAD
            { resource: "console", level: "write" },
            { resource: "math", level: "execute" },
            { resource: "date", level: "read" },
            { resource: "json", level: "execute" },
            { resource: "array", level: "execute" },
            { resource: "object", level: "execute" },
            { resource: "string", level: "execute" },
            { resource: "path", level: "read" },
            { resource: "crypto", level: "execute" },
            { resource: "url", level: "read" },
=======
            { resource: "file:*", level: "execute" },
            { resource: "network:*", level: "execute" },
            { resource: "process:*", level: "execute" },
            { resource: "system:*", level: "write" },
>>>>>>> dev
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
<<<<<<< HEAD
    unrestricted: {
        id: "unrestricted",
        name: "Unrestricted Access",
        description: "Full system access (use with extreme caution)",
        permissions: [{ resource: "*", level: "admin" }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
};
// ============================================================================
// Permission Manager
// ============================================================================
class PermissionManager {
=======
};
// === Permission Engine ===
export class PermissionEngine {
>>>>>>> dev
    permissionSets = new Map();
    userAssignments = new Map(); // userId -> permissionSetIds
    constructor() {
        // Load default permission sets
        for (const [id, set] of Object.entries(DEFAULT_PERMISSION_SETS)) {
            this.permissionSets.set(id, set);
        }
    }
    /**
     * Check if action is permitted
     */
<<<<<<< HEAD
    checkPermission(request, permissionSetId = "minimal") {
        const permissionSet = this.permissionSets.get(permissionSetId);
        if (!permissionSet) {
            return {
                granted: false,
                reason: `Permission set '${permissionSetId}' not found`,
            };
        }
        // Check for wildcard permission
        const wildcard = permissionSet.permissions.find((p) => p.resource === "*");
        if (wildcard) {
            return {
                granted: true,
                level: wildcard.level,
            };
        }
        // Find specific permission
        const permission = permissionSet.permissions.find((p) => p.resource === request.resource ||
            this.matchesPattern(request.resource, p.resource));
        if (!permission) {
            return {
                granted: false,
                reason: `No permission granted for resource '${request.resource}'`,
            };
        }
        // Check conditions
        if (permission.conditions &&
            !this.checkConditions(permission.conditions, request.context)) {
            return {
                granted: false,
                reason: "Permission conditions not met",
                level: permission.level,
            };
        }
        // Check if level is sufficient
        const requiredLevel = this.actionToLevel(request.action);
        if (!this.isLevelSufficient(permission.level, requiredLevel)) {
            return {
                granted: false,
                reason: `Insufficient permission level: have '${permission.level}', need '${requiredLevel}'`,
                level: permission.level,
            };
        }
        return {
            granted: true,
            level: permission.level,
=======
    check(request, userId) {
        const userSets = this.userAssignments.get(userId) || ["minimal"];
        for (const setId of userSets) {
            const set = this.permissionSets.get(setId);
            if (!set)
                continue;
            const permission = set.permissions.find(p => this.matchesResource(p.resource, request.resource));
            if (permission) {
                // Check conditions
                if (permission.conditions) {
                    const conditionsMet = permission.conditions.every(c => this.evaluateCondition(c, request.context));
                    if (!conditionsMet)
                        continue;
                }
                // Check level
                if (this.levelSufficient(permission.level, request.action)) {
                    return {
                        granted: true,
                        level: permission.level,
                    };
                }
            }
        }
        return {
            granted: false,
            reason: `No permission for ${request.action} on ${request.resource}`,
>>>>>>> dev
        };
    }
    /**
     * Grant permission set to user
     */
    assignPermissionSet(userId, permissionSetId) {
        const sets = this.userAssignments.get(userId) || [];
        if (!sets.includes(permissionSetId)) {
            sets.push(permissionSetId);
            this.userAssignments.set(userId, sets);
            log.info(`Assigned permission set ${permissionSetId} to user ${userId}`);
        }
    }
    /**
     * Revoke permission set from user
     */
    revokePermissionSet(userId, permissionSetId) {
        const sets = this.userAssignments.get(userId) || [];
        const index = sets.indexOf(permissionSetId);
        if (index > -1) {
            sets.splice(index, 1);
            this.userAssignments.set(userId, sets);
            log.info(`Revoked permission set ${permissionSetId} from user ${userId}`);
        }
<<<<<<< HEAD
        const grantId = `${request.resource}:${Date.now()}`;
        const expiresAt = Date.now() + durationMs;
        const result = {
            granted: true,
            level: check.level,
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
=======
>>>>>>> dev
    }
    /**
     * Create custom permission set
     */
    createPermissionSet(set) {
        const newSet = {
            ...set,
<<<<<<< HEAD
            id: `custom-${Date.now()}`,
=======
            id: generateId("perm"),
>>>>>>> dev
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.permissionSets.set(newSet.id, newSet);
<<<<<<< HEAD
        log.info(`Permission set created: ${newSet.name} (${newSet.id})`);
        return newSet;
    }
    /**
     * Update permission set
     */
    updatePermissionSet(id, updates) {
        const existing = this.permissionSets.get(id);
        if (!existing) {
            return null;
=======
        return newSet;
    }
    /**
     * Check if resource pattern matches
     */
    matchesResource(pattern, resource) {
        // Support wildcards
        if (pattern.endsWith("*")) {
            return resource.startsWith(pattern.slice(0, -1));
        }
        return pattern === resource;
    }
    /**
     * Evaluate condition
     */
    evaluateCondition(condition, context) {
        const value = context?.[condition.type];
        switch (condition.operator) {
            case "eq":
                return value === condition.value;
            case "ne":
                return value !== condition.value;
            case "gt":
                return typeof value === "number" && value > condition.value;
            case "lt":
                return typeof value === "number" && value < condition.value;
            case "gte":
                return typeof value === "number" && value >= condition.value;
            case "lte":
                return typeof value === "number" && value <= condition.value;
            case "in":
                return Array.isArray(condition.value) && condition.value.includes(value);
            case "contains":
                return typeof value === "string" && value.includes(String(condition.value));
            default:
                return false;
>>>>>>> dev
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: Date.now(),
        };
        this.permissionSets.set(id, updated);
        log.info(`Permission set updated: ${updated.name}`);
        return updated;
    }
    /**
<<<<<<< HEAD
     * Delete permission set
     */
    deletePermissionSet(id) {
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
    getPermissionSet(id) {
        return this.permissionSets.get(id);
    }
    /**
     * List all permission sets
     */
    listPermissionSets() {
        return Array.from(this.permissionSets.values());
    }
    /**
     * Validate permission set
     */
    validatePermissionSet(set) {
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
            valid: errors.length === 0,
            errors,
        };
    }
    // ============================================================================
    // Private Helpers
    // ============================================================================
    matchesPattern(resource, pattern) {
        // Simple glob matching
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
        return regex.test(resource);
    }
    actionToLevel(action) {
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
    isLevelSufficient(have, need) {
        const levels = [
            "none",
            "read",
            "write",
            "execute",
            "admin",
        ];
        const haveIndex = levels.indexOf(have);
        const needIndex = levels.indexOf(need);
        return haveIndex >= needIndex;
    }
    checkConditions(conditions, context) {
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
    getContextValue(context, type) {
        switch (type) {
            case "time":
                return Date.now();
            case "path":
                return context.path;
            case "size":
                return context.size;
            case "rate":
                return context.rate;
            default:
                return context[type];
        }
    }
    evaluateCondition(value, condition) {
        switch (condition.operator) {
            case "eq":
                return value === condition.value;
            case "ne":
                return value !== condition.value;
            case "gt":
                return value > condition.value;
            case "lt":
                return value < condition.value;
            case "gte":
                return value >= condition.value;
            case "lte":
                return value <= condition.value;
            case "in":
                return condition.value.includes(value);
            case "contains":
                return String(value).includes(String(condition.value));
            default:
                return false;
        }
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
export function createPermissionSet(set) {
    return permissionManager.createPermissionSet(set);
}
export function getPermissionSet(id) {
    return permissionManager.getPermissionSet(id);
}
export function listPermissionSets() {
    return permissionManager.listPermissionSets();
=======
     * Check if permission level is sufficient for action
     */
    levelSufficient(level, action) {
        const levels = {
            none: 0,
            read: 1,
            write: 2,
            execute: 3,
            admin: 4,
        };
        const requiredLevel = this.getRequiredLevel(action);
        return levels[level] >= levels[requiredLevel];
    }
    getRequiredLevel(action) {
        if (action.includes("admin"))
            return "admin";
        if (action.includes("exec") || action.includes("run"))
            return "execute";
        if (action.includes("write") || action.includes("create") || action.includes("delete"))
            return "write";
        if (action.includes("read"))
            return "read";
        return "none";
    }
}
// === Helper ===
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
// === Factory ===
export function createPermissionEngine() {
    return new PermissionEngine();
>>>>>>> dev
}
export default PermissionEngine;
