/**
 * OpenOxygen — Security Audit System
 *
 * 全链路审计：记录所有系统操作，支持查询、告警和事务回滚。
 */
import fs from "node/promises";
import path from "node";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { resolveStateDir } from "../../core/config/index.js";
const log = createSubsystemLogger("security/audit");
// ─── Audit Store ────────────────────────────────────────────────────────────
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
            id() { },
            timestamp() { },
            operation, : .operation,
            actor, : .actor,
            target, : .target,
            severity, : .severity ?? "info",
            details, : .details,
            rollbackable, : .rollbackable ?? false,
        };
        this.entries.push(entry);
        // Trim in-memory buffer
        if (this.entries.length > MAX_MEMORY_ENTRIES) {
            this.entries = this.entries.slice(-MAX_MEMORY_ENTRIES);
        }
        // Persist to file
        if (this.config.auditEnabled) {
            await this.appendToFile(entry);
        }
        // Alert on critical entries
        if (entry.severity === "critical") {
            log.error(`CRITICAL AUDIT: ${entry.operation} by ${entry.actor} on ${entry.target}`);
        }
        return entry;
    }
    /**
     * Query audit entries.
     */
    query(params) {
        let results = [...this.entries];
        if (params?.operation) {
            results = results.filter((e) => e.operation === params.operation);
        }
        if (params?.actor) {
            results = results.filter((e) => e.actor === params.actor);
        }
        if (params?.severity) {
            results = results.filter((e) => e.severity === params.severity);
        }
        if (params?.since) {
            results = results.filter((e) => e.timestamp >= params.since);
        }
        results.sort((a, b) => b.timestamp - a.timestamp);
        if (params?.limit) {
            results = results.slice(0, params.limit);
        }
        return results;
    }
    /**
     * Get rollbackable entries for undo operations.
     */
    getRollbackable(limit = 10) {
        return this.entries
            .filter((e) => e.rollbackable)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    async appendToFile(entry) {
        try {
            const dir = path.dirname(this.filePath);
            await fs.mkdir(dir, { recursive });
            await fs.appendFile(this.filePath, JSON.stringify(entry) + "\n", "utf-8");
        }
        catch (err) {
            log.error("Failed to write audit entry:", err);
        }
    }
    /**
     * Load audit history from file.
     */
    async loadFromFile() {
        try {
            const content = await fs.readFile(this.filePath, "utf-8");
            const lines = content.trim().split("\n").filter(Boolean);
            this.entries = lines.map((line) => JSON.parse(line));
            log.info(`Loaded ${this.entries.length} audit entries from file`);
            return this.entries.length;
        }
        catch {
            return 0;
        }
    }
    getStats() {
        return {
            total, : .entries.length,
            critical, : .entries.filter((e) => e.severity === "critical").length,
            rollbackable, : .entries.filter((e) => e.rollbackable).length,
        };
    }
}
