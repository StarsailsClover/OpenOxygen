/**
 * OpenOxygen — Persistent Vector Store (26w11aE_P5)
 *
 * 向量持久化：内存向量 + SQLite 元数据 + 磁盘缓存
 * 支持 Int8 量化、LRU 淘汰、增量索引
 */
import type { MemoryChunk, MemorySearchResult, MemorySource } from "../types/index.js";
import type { SQLiteStore } from "./sqlite.js";
export declare function quantizeFloat64ToInt8(vector: number[]): {
    quantized: Int8Array;
    scale: number;
    offset: number;
};
export declare function dequantizeInt8ToFloat64(quantized: Int8Array, scale: number, offset: number): number[];
export declare class PersistentVectorStore {
    private memoryStore;
    private sqliteStore;
    private embeddingCache;
    private useQuantization;
    private maxMemoryChunks;
    constructor(sqliteStore: SQLiteStore, options?: {
        maxMemoryChunks?: number;
        maxCacheSize?: number;
        useQuantization?: boolean;
    });
    /**
     * 添加文档块（内存 + SQLite 元数据）
     */
    addChunk(chunk: MemoryChunk): void;
    /**
     * 批量添加
     */
    addChunks(chunks: MemoryChunk[]): {
        added: number;
        skipped: number;
    };
    /**
     * 搜索（混合：内存向量 + BM25）
     */
    search(query: string, queryEmbedding?: number[], opts?: {
        maxResults?: number;
        minScore?: number;
        sources?: MemorySource[];
    }): MemorySearchResult[];
    /**
     * 清理过期块
     */
    cleanup(): {
        memoryRemoved: number;
        dbRemoved: number;
    };
    /**
     * 获取存储统计
     */
    getStats(): {
        memoryChunks: number;
        dbChunks: number;
        cacheSize: number;
        maxMemory: number;
        quantization: boolean;
    };
    /**
     * 清空所有数据
     */
    clear(): void;
}
//# sourceMappingURL=vectors.d.ts.map