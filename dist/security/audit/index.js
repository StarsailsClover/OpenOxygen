/**
 * OpenOxygen - Security Audit System
 *
 * 全链路审计：记录所有系统操作，支持查询、告警和事务回滚。
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { resolveStateDir } from "../../core/config/index.js";
const log = createSubsystemLogger("security/audit");
// === Audit Store ===
const AUDIT_FILENAME = "audit.jsonl";
const MAX_MEMORY_ENTRIES = 10_000;
export class AuditTrail {
    entries = [];
    config;
    filePath;
    constructor(config) {
        this.config = config;
        this.filePath = path.join(resolveStateDir(), AUDIT_FILENAME);
    }
    updateConfig(config) {
        this.config = config;
    }
    /**
     * Record an audit entry.
     */
    async record(params) {
        const entry = {
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
    async query(filters) {
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
            results = results.filter(e => e.timestamp >= filters.since);
        }
        if (filters.until) {
            results = results.filter(e => e.timestamp <= filters.until);
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
    getStats() {
        const bySeverity = {
            info: 0,
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        };
        const byOperation = {};
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
    async persist(entry) {
        if (!this.config.auditEnabled)
            return;
        try {
            const line = JSON.stringify(entry) + "\n";
            await fs.appendFile(this.filePath, line, "utf-8");
        }
        catch (error) {
            log.error(`Failed to persist audit entry: ${error}`);
        }
    }
    /**
     * Load from disk.
     */
    async load() {
        try {
            const content = await fs.readFile(this.filePath, "utf-8");
            const lines = content.split("\n").filter(l => l.trim());
            this.entries = lines
                .map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            })
                .filter((e) => e !== null);
            log.info(`Loaded ${this.entries.length} audit entries`);
        }
        catch (error) {
            // File may not exist yet
            log.debug("No existing audit log found");
        }
    }
    /**
     * Clear all entries.
     */
    async clear() {
        this.entries = [];
        try {
            await fs.unlink(this.filePath);
        }
        catch {
            // File may not exist
        }
        log.info("Audit log cleared");
    }
}
// === Factory ===
export function createAuditTrail(config) {
    return new AuditTrail(config);
}
export default AuditTrail;
