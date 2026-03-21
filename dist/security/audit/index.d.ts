/**
 * OpenOxygen — Security Audit System
 *
 * 全链路审计：记录所有系统操作，支持查询、告警和事务回滚。
 */
import type { AuditEntry, AuditSeverity, SecurityConfig, SystemOperation } from "../../types/index.js";
export declare class AuditTrail {
    private entries;
    private config;
    private filePath;
    constructor(config: SecurityConfig);
    updateConfig(config: SecurityConfig): void;
    /**
     * Record an audit entry.
     */
    record(params: {
        operation: SystemOperation | string;
        actor: string;
        target?: string;
        severity?: AuditSeverity;
        details?: Record<string, unknown>;
        rollbackable?: boolean;
    }): Promise<AuditEntry>;
    /**
     * Query audit entries.
     */
    query(params?: {
        operation?: string;
        actor?: string;
        severity?: AuditSeverity;
        since?: number;
        limit?: number;
    }): AuditEntry[];
    /**
     * Get rollbackable entries for undo operations.
     */
    getRollbackable(limit?: number): AuditEntry[];
    private appendToFile;
    /**
     * Load audit history from file.
     */
    loadFromFile(): Promise<number>;
    getStats(): {
        total: number;
        critical: number;
        rollbackable: number;
    };
}
//# sourceMappingURL=index.d.ts.map