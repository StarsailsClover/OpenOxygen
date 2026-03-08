/**
 * OpenOxygen — Permission System
 *
 * 最小权限原则：操作前权限校验、路径白名单、可执行文件黑名单。
 */

import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import type { SecurityConfig, SystemOperation } from "../../types/index.js";

const log = createSubsystemLogger("security/permissions");

// ─── Permission Levels ──────────────────────────────────────────────────────

const OPERATION_LEVELS: Record<SystemOperation, "minimal" | "standard" | "elevated"> = {
  "file.read": "minimal",
  "file.list": "minimal",
  "clipboard.read": "minimal",
  "screen.capture": "minimal",
  "network.request": "standard",
  "file.write": "standard",
  "process.list": "standard",
  "input.keyboard": "standard",
  "input.mouse": "standard",
  "clipboard.write": "standard",
  "file.delete": "elevated",
  "process.start": "elevated",
  "process.kill": "elevated",
  "registry.read": "elevated",
  "registry.write": "elevated",
};

const LEVEL_HIERARCHY: Record<string, number> = {
  minimal: 0,
  standard: 1,
  elevated: 2,
};

// ─── Permission Checker ────────────────────────────────────────────────────

export type PermissionCheckResult = {
  allowed: boolean;
  reason?: string;
};

export function checkPermission(
  operation: SystemOperation,
  config: SecurityConfig,
  target?: string,
): PermissionCheckResult {
  // Check privilege level
  const requiredLevel = OPERATION_LEVELS[operation] ?? "elevated";
  const currentLevel = config.privilegeLevel;

  if ((LEVEL_HIERARCHY[requiredLevel] ?? 2) > (LEVEL_HIERARCHY[currentLevel] ?? 0)) {
    return {
      allowed: false,
      reason: `Operation "${operation}" requires "${requiredLevel}" privilege (current: "${currentLevel}")`,
    };
  }

  // Check path allowlist for file operations
  if (target && operation.startsWith("file.")) {
    if (!isPathAllowed(target, config.allowedPaths)) {
      return {
        allowed: false,
        reason: `Path "${target}" is not in the allowed paths list`,
      };
    }
  }

  // Check executable blocklist for process operations
  if (target && operation === "process.start") {
    if (isExecutableBlocked(target, config.blockedExecutables)) {
      return {
        allowed: false,
        reason: `Executable "${target}" is blocked by security policy`,
      };
    }
  }

  return { allowed: true };
}

// ─── Path Allowlist ─────────────────────────────────────────────────────────

function isPathAllowed(targetPath: string, allowedPaths?: string[]): boolean {
  if (!allowedPaths || allowedPaths.length === 0) {
    // No allowlist = allow all (but log warning)
    return true;
  }

  const normalized = path.resolve(targetPath).toLowerCase();

  for (const allowed of allowedPaths) {
    const normalizedAllowed = path.resolve(allowed).toLowerCase();

    // Glob pattern matching
    if (allowed.includes("*")) {
      const regex = new RegExp(
        "^" + normalizedAllowed.replace(/\\/g, "\\\\").replace(/\*/g, ".*") + "$",
      );
      if (regex.test(normalized)) return true;
    } else {
      // Prefix matching (directory containment)
      if (normalized.startsWith(normalizedAllowed)) return true;
    }
  }

  return false;
}

// ─── Executable Blocklist ───────────────────────────────────────────────────

const DEFAULT_BLOCKED_EXECUTABLES = [
  "format",
  "diskpart",
  "bcdedit",
  "shutdown",
  "restart",
  "sfc",
  "dism",
  "reg",
  "regedit",
  "net",
  "netsh",
  "wmic",
  "cipher",
];

function isExecutableBlocked(executable: string, blockedList?: string[]): boolean {
  const blocked = blockedList ?? DEFAULT_BLOCKED_EXECUTABLES;
  const name = path.basename(executable).toLowerCase().replace(/\.exe$/i, "");
  return blocked.some((b) => b.toLowerCase() === name);
}

// ─── Convenience ────────────────────────────────────────────────────────────

export function assertPermission(
  operation: SystemOperation,
  config: SecurityConfig,
  target?: string,
): void {
  const result = checkPermission(operation, config, target);
  if (!result.allowed) {
    throw new Error(`Permission denied: ${result.reason}`);
  }
}
