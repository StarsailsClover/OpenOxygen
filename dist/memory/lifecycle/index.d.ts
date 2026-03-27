/**
 * OpenOxygen — Memory Lifecycle Manager
 *
 * 记忆生命周期管理：文件索引、增量同步、过期清理、嵌入生成。
 * 管理 workspace + memory + sessions 三个记忆源。
 */
import type { MemoryConfig, MemorySearchResult, MemorySource } from "../../types/index.js";
export declare class MemoryManager {
    private store;
    private config;
    private indexedPaths;
    private lastSyncTime;
    constructor(config: MemoryConfig);
    updateConfig(config: MemoryConfig): void;
    /**
     * Full sync: index all configured memory paths.
     */
    sync(opts?: {
        force?: boolean;
        paths?: string[];
        progress?: (update: {
            completed: number;
            total: number;
            label?: string;
        }) => void;
    }): Promise<{
        indexed: number;
        chunks: number;
    }>;
    /**
     * Search memory using hybrid (vector + keyword) search.
     */
    search(query: string, opts?: {
        maxResults?: number;
        minScore?: number;
        sources?: MemorySource[];
    }): Promise<MemorySearchResult[]>;
    /**
     * Read a specific file from memory.
     */
    readFile(params: {
        relPath: string;
        from?: number;
        lines?: number;
    }): Promise<{
        text: string;
        path: string;
    }>;
    /**
     * Get memory system status.
     */
    status(): {
        backend: string;
        chunks: number;
        indexedPaths: number;
        lastSyncTime: number;
        hybridSearch: boolean;
    };
    /**
     * Clean up expired chunks.
     */
    cleanup(): number;
}
//# sourceMappingURL=index.d.ts.map