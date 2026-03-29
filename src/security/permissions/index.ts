/**
 * OpenOxygen - Permission System
 *
 * Zero-trust permission management for secure execution
 * Provides fine-grained access control for all operations
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type {
  Permission,
  PermissionCheck,
  PermissionContext,
} from "../../types/index.js";

const log = createSubsystemLogger("security/permissions");

// ============================================================================
// Permission Types
// ============================================================================

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

// ============================================================================
// Default Permission Sets
// ============================================================================

export const DEFAULT_PERMISSION_SETS: Record<string, PermissionSet> = {
  minimal: {
    id: "minimal",
    name: "Minimal Access",
    description: "Absolute minimal permissions for sandboxed execution",
    permissions: [
      { resource: "console", level: "write" },
      { resource: "math", level: "execute" },
      { resource: "date", level: "read" },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  standard: {
    id: "standard",
    name: "Standard Access",
    description: "Standard permissions for trusted code execution",
    permissions: [
      { resource: "console", level: "write" },
      { resource: "math", level: "execute" },
      { resource: "date", level: "read" },
      { resource: "json", level: "execute" },
      { resource: "array", level: "execute" },
      { resource: "object", level: "execute" },
      { resource: "string", level: "execute" },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

  elevated: {
    id: "elevated",
    name: "Elevated Access",
    description: "Elevated permissions for system operations",
    permissions: [
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
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },

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
  private permissionSets: Map<string, PermissionSet> = new Map();
  private activeGrants: Map<string, PermissionResult> = new Map();

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
  checkPermission(
    request: PermissionRequest,
    permissionSetId: string = "minimal",
  ): PermissionResult {
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
    const permission = permissionSet.permissions.find(
      (p) =>
        p.resource === request.resource ||
        this.matchesPattern(request.resource, p.resource),
    );

    if (!permission) {
      return {
        granted: false,
        reason: `No permission granted for resource '${request.resource}'`,
      };
    }

    // Check conditions
    if (
      permission.conditions &&
      !this.checkConditions(permission.conditions, request.context)
    ) {
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
    };
  }

  /**
   * Grant temporary permission
   */
  grantTemporaryPermission(
    request: PermissionRequest,
    durationMs: number,
    permissionSetId: string = "minimal",
  ): PermissionResult {
    const check = this.checkPermission(request, permissionSetId);

    if (!check.granted) {
      return check;
    }

    const grantId = `${request.resource}:${Date.now()}`;
    const expiresAt = Date.now() + durationMs;

    const result: PermissionResult = {
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

    log.info(
      `Temporary permission granted: ${request.resource} until ${new Date(expiresAt).toISOString()}`,
    );

    return result;
  }

  /**
   * Create custom permission set
   */
  createPermissionSet(
    set: Omit<PermissionSet, "id" | "createdAt" | "updatedAt">,
  ): PermissionSet {
    const newSet: PermissionSet = {
      ...set,
      id: `custom-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.permissionSets.set(newSet.id, newSet);
    log.info(`Permission set created: ${newSet.name} (${newSet.id})`);

    return newSet;
  }

  /**
   * Update permission set
   */
  updatePermissionSet(
    id: string,
    updates: Partial<PermissionSet>,
  ): PermissionSet | null {
    const existing = this.permissionSets.get(id);
    if (!existing) {
      return null;
    }

    const updated: PermissionSet = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    this.permissionSets.set(id, updated);
    log.info(`Permission set updated: ${updated.name}`);

    return updated;
  }

  /**
   * Delete permission set
   */
  deletePermissionSet(id: string): boolean {
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
  getPermissionSet(id: string): PermissionSet | undefined {
    return this.permissionSets.get(id);
  }

  /**
   * List all permission sets
   */
  listPermissionSets(): PermissionSet[] {
    return Array.from(this.permissionSets.values());
  }

  /**
   * Validate permission set
   */
  validatePermissionSet(set: PermissionSet): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

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

  private matchesPattern(resource: string, pattern: string): boolean {
    // Simple glob matching
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    return regex.test(resource);
  }

  private actionToLevel(action: string): PermissionLevel {
    const levelMap: Record<string, PermissionLevel> = {
      read: "read",
      write: "write",
      execute: "execute",
      delete: "write",
      create: "write",
      admin: "admin",
    };
    return levelMap[action] || "none";
  }

  private isLevelSufficient(
    have: PermissionLevel,
    need: PermissionLevel,
  ): boolean {
    const levels: PermissionLevel[] = [
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

  private checkConditions(
    conditions: PermissionCondition[],
    context?: PermissionContext,
  ): boolean {
    if (!context) return false;

    for (const condition of conditions) {
      const value = this.getContextValue(context, condition.type);
      if (!this.evaluateCondition(value, condition)) {
        return false;
      }
    }

    return true;
  }

  private getContextValue(context: PermissionContext, type: string): unknown {
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

  private evaluateCondition(
    value: unknown,
    condition: PermissionCondition,
  ): boolean {
    switch (condition.operator) {
      case "eq":
        return value === condition.value;
      case "ne":
        return value !== condition.value;
      case "gt":
        return (value as number) > (condition.value as number);
      case "lt":
        return (value as number) < (condition.value as number);
      case "gte":
        return (value as number) >= (condition.value as number);
      case "lte":
        return (value as number) <= (condition.value as number);
      case "in":
        return (condition.value as unknown[]).includes(value);
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
export function checkPermission(
  request: PermissionRequest,
  permissionSetId?: string,
): PermissionResult {
  return permissionManager.checkPermission(request, permissionSetId);
}

export function grantTemporaryPermission(
  request: PermissionRequest,
  durationMs: number,
  permissionSetId?: string,
): PermissionResult {
  return permissionManager.grantTemporaryPermission(
    request,
    durationMs,
    permissionSetId,
  );
}

export function createPermissionSet(
  set: Omit<PermissionSet, "id" | "createdAt" | "updatedAt">,
): PermissionSet {
  return permissionManager.createPermissionSet(set);
}

export function getPermissionSet(id: string): PermissionSet | undefined {
  return permissionManager.getPermissionSet(id);
}

export function listPermissionSets(): PermissionSet[] {
  return permissionManager.listPermissionSets();
}
