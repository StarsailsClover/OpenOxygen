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

// === Permission Types ===

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

// === Default Permission Sets ===

export const DEFAULT_PERMISSION_SETS: Record<string, PermissionSet> = {
  minimal: {
    id: "minimal",
    name: "Minimal Access",
    description: "Absolute minimal permissions for sandbox execution",
    permissions: [
      { resource: "file:read", level: "read", conditions: [{ type: "path", operator: "contains", value: "/tmp" }] },
      { resource: "network:outbound", level: "none" },
      { resource: "process:exec", level: "none" },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  standard: {
    id: "standard",
    name: "Standard Access",
    description: "Standard user permissions",
    permissions: [
      { resource: "file:read", level: "read" },
      { resource: "file:write", level: "write", conditions: [{ type: "path", operator: "contains", value: "~" }] },
      { resource: "network:outbound", level: "execute" },
      { resource: "process:exec", level: "execute", conditions: [{ type: "rate", operator: "lte", value: 10 }] },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  elevated: {
    id: "elevated",
    name: "Elevated Access",
    description: "Elevated permissions for system operations",
    permissions: [
      { resource: "file:*", level: "execute" },
      { resource: "network:*", level: "execute" },
      { resource: "process:*", level: "execute" },
      { resource: "system:*", level: "write" },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
};

// === Permission Engine ===

export class PermissionEngine {
  private permissionSets = new Map<string, PermissionSet>();
  private userAssignments = new Map<string, string[]>(); // userId -> permissionSetIds

  constructor() {
    // Load default permission sets
    for (const [id, set] of Object.entries(DEFAULT_PERMISSION_SETS)) {
      this.permissionSets.set(id, set);
    }
  }

  /**
   * Check if action is permitted
   */
  check(request: PermissionRequest, userId: string): PermissionResult {
    const userSets = this.userAssignments.get(userId) || ["minimal"];
    
    for (const setId of userSets) {
      const set = this.permissionSets.get(setId);
      if (!set) continue;

      const permission = set.permissions.find(p => 
        this.matchesResource(p.resource, request.resource),
      );

      if (permission) {
        // Check conditions
        if (permission.conditions) {
          const conditionsMet = permission.conditions.every(c => 
            this.evaluateCondition(c, request.context),
          );
          if (!conditionsMet) continue;
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
    };
  }

  /**
   * Grant permission set to user
   */
  assignPermissionSet(userId: string, permissionSetId: string): void {
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
  revokePermissionSet(userId: string, permissionSetId: string): void {
    const sets = this.userAssignments.get(userId) || [];
    const index = sets.indexOf(permissionSetId);
    if (index > -1) {
      sets.splice(index, 1);
      this.userAssignments.set(userId, sets);
      log.info(`Revoked permission set ${permissionSetId} from user ${userId}`);
    }
  }

  /**
   * Create custom permission set
   */
  createPermissionSet(set: Omit<PermissionSet, "id" | "createdAt" | "updatedAt">): PermissionSet {
    const newSet: PermissionSet = {
      ...set,
      id: generateId("perm"),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.permissionSets.set(newSet.id, newSet);
    return newSet;
  }

  /**
   * Check if resource pattern matches
   */
  private matchesResource(pattern: string, resource: string): boolean {
    // Support wildcards
    if (pattern.endsWith("*")) {
      return resource.startsWith(pattern.slice(0, -1));
    }
    return pattern === resource;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(
    condition: PermissionCondition,
    context?: PermissionContext,
  ): boolean {
    const value = context?.[condition.type];
    
    switch (condition.operator) {
      case "eq":
        return value === condition.value;
      case "ne":
        return value !== condition.value;
      case "gt":
        return typeof value === "number" && value > (condition.value as number);
      case "lt":
        return typeof value === "number" && value < (condition.value as number);
      case "gte":
        return typeof value === "number" && value >= (condition.value as number);
      case "lte":
        return typeof value === "number" && value <= (condition.value as number);
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(value);
      case "contains":
        return typeof value === "string" && value.includes(String(condition.value));
      default:
        return false;
    }
  }

  /**
   * Check if permission level is sufficient for action
   */
  private levelSufficient(level: PermissionLevel, action: string): boolean {
    const levels: Record<PermissionLevel, number> = {
      none: 0,
      read: 1,
      write: 2,
      execute: 3,
      admin: 4,
    };

    const requiredLevel = this.getRequiredLevel(action);
    return levels[level] >= levels[requiredLevel];
  }

  private getRequiredLevel(action: string): PermissionLevel {
    if (action.includes("admin")) return "admin";
    if (action.includes("exec") || action.includes("run")) return "execute";
    if (action.includes("write") || action.includes("create") || action.includes("delete")) return "write";
    if (action.includes("read")) return "read";
    return "none";
  }
}

// === Helper ===

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// === Factory ===

export function createPermissionEngine(): PermissionEngine {
  return new PermissionEngine();
}

// === Exports ===

export {
  createPermissionEngine,
  PermissionEngine,
  DEFAULT_PERMISSION_SETS,
};

export default PermissionEngine;
