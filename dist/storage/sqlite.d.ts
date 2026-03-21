/**
 * OpenOxygen — SQLite Persistence Layer (26w11aE_P5)
 *
 * 统一持久化存储：会话、配置、审计、向量索引元数据。
 * 使用 better-sqlite3 (同步 API，零 FFI 开销)。
 */
export declare class SQLiteStore {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    private initSchema;
    saveSession(session: {
        key: string;
        agentId: string;
        channelId?: string;
        createdAt: number;
        lastActiveAt: number;
        metadata?: Record<string, unknown>;
    }): void;
    getSession(key: string): any;
    touchSession(key: string): void;
    listSessions(agentId?: string): any[];
    deleteSession(key: string): void;
    appendAudit(entry: {
        id: string;
        timestamp: number;
        operation: string;
        actor: string;
        target?: string;
        severity?: string;
        details?: Record<string, unknown>;
        rollbackable?: boolean;
    }): void;
    queryAudit(params?: {
        operation?: string;
        severity?: string;
        since?: number;
        limit?: number;
    }): any[];
    getAuditCount(): number;
    saveChunk(chunk: {
        id: string;
        source: string;
        filePath: string;
        startLine: number;
        endLine: number;
        contentHash: string;
        chunkSize: number;
        createdAt: number;
        expiresAt?: number;
        embeddingDim?: number;
    }): void;
    getChunksByPath(filePath: string): any[];
    deleteExpiredChunks(): number;
    getChunkCount(): number;
    recordModelUsage(stats: {
        model: string;
        provider: string;
        promptTokens: number;
        completionTokens: number;
        durationMs: number;
        mode?: string;
        success?: boolean;
    }): void;
    getModelStats(model?: string, since?: number): any[];
    kvSet(key: string, value: unknown, ttlMs?: number): void;
    kvGet<T = unknown>(key: string): T | null;
    kvDelete(key: string): void;
    getStats(): {
        sessions: number;
        auditEntries: number;
        vectorChunks: number;
        kvEntries: number;
        modelRequests: number;
        dbSizeBytes: number;
    };
    vacuum(): void;
    close(): void;
}
export declare function getStore(dbPath?: string): SQLiteStore;
export declare function closeStore(): void;
//# sourceMappingURL=sqlite.d.ts.map