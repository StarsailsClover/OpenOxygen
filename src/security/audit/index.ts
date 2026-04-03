/**
 * OpenOxygen - Security Audit System
 *
 * 全链路审计：记录所有系统操作，支持查询、告警和事务回滚。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import type {
  AuditEntry,
  AuditSeverity,
  SecurityConfig,
  SystemOperation,
} from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { resolveStateDir } from "../../core/config/index.js";

const log = createSubsystemLogger("security/audit");

// === Audit Store ===

const AUDIT_FILENAME = "audit.jsonl";
const MAX_MEMORY_ENTRIES = 10_000;

export class AuditTrail {
  private entries: AuditEntry[] = [];
  private config: SecurityConfig;
  private filePath: string;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.filePath = path.join(resolveStateDir(), AUDIT_FILENAME);
  }

  updateConfig(config: SecurityConfig): void {
    this.config = config;
  }

  /**
   * Record an audit entry.
   */
  async record(params: {
    operation: SystemOperation | string;
    actor: string;
    target?: string;
    severity?: AuditSeverity;
    details?: Record<string, unknown>;
    rollbackable?: boolean;
  }): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: generateId("audit"),
      timestamp: nowMs(),
      operation: params.operation,
      actor: params.actor,
      target: params.target,
      severity: params.severity ?? "info",
      details: params.details,
      rollbackable: params.rollbackable ?? false,
    };

    this.entries.push(entry);

    // Trim in-memory buffer
    if (this.entries.length > MAX_MEMORY_ENTRIES) {
      this.entries = this.entries.slice(-MAX_MEMORY_ENTRIES / 2);
    }

    // Persist to disk
    await this.persist(entry);

    // Log high severity events
    if (entry.severity === "high" || entry.severity === "critical") {
      log.warn(`High severity audit: ${entry.operation} by ${entry.actor}`);
    }

    return entry;
  }

  /**
   * Query audit log.
   */
  async query(filters: {
    operation?: string;
    actor?: string;
    target?: string;
    severity?: AuditSeverity;
    since?: number;
    until?: number;
    limit?: number;
  }): Promise<AuditEntry[]> {
    let results = this.entries;

    if (filters.operation) {
      results = results.filter(e => e.operation === filters.operation);
    }
    if (filters.actor) {
      results = results.filter(e => e.actor === filters.actor);
    }
    if (filters.target) {
      results = results.filter(e => e.target === filters.target);
    }
    if (filters.severity) {
      results = results.filter(e => e.severity === filters.severity);
    }
    if (filters.since) {
      results = results.filter(e => e.timestamp >= filters.since!);
    }
    if (filters.until) {
      results = results.filter(e => e.timestamp <= filters.until!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get statistics.
   */
  getStats(): {
    totalEntries: number;
    bySeverity: Record<AuditSeverity, number>;
    byOperation: Record<string, number>;
  } {
    const bySeverity: Record<AuditSeverity, number> = {
      info: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const byOperation: Record<string, number> = {};

    for (const entry of this.entries) {
      bySeverity[entry.severity]++;
      byOperation[entry.operation] = (byOperation[entry.operation] || 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      bySeverity,
      byOperation,
    };
  }

  /**
   * Persist entry to disk.
   */
  private async persist(entry: AuditEntry): Promise<void> {
    if (!this.config.auditEnabled) return;

    try {
      const line = JSON.stringify(entry) + "\n";
      await fs.appendFile(this.filePath, line, "utf-8");
    } catch (error) {
      log.error(`Failed to persist audit entry: ${error}`);
    }
  }

  /**
   * Load from disk.
   */
  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      const lines = content.split("\n").filter(l => l.trim());
      
      this.entries = lines
        .map(line => {
          try {
            return JSON.parse(line) as AuditEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is AuditEntry => e !== null);

      log.info(`Loaded ${this.entries.length} audit entries`);
    } catch (error) {
      // File may not exist yet
      log.debug("No existing audit log found");
    }
  }

  /**
   * Clear all entries.
   */
  async clear(): Promise<void> {
    this.entries = [];
    try {
      await fs.unlink(this.filePath);
    } catch {
      // File may not exist
    }
    log.info("Audit log cleared");
  }
}

// === Factory ===

export function createAuditTrail(config: SecurityConfig): AuditTrail {
  return new AuditTrail(config);
}

// === Exports ===

export { createAuditTrail, AuditTrail };
export default AuditTrail;
