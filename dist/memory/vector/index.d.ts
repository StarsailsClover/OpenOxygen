/**
 * OpenOxygen — Memory System (Vector Store + Hybrid Search)
 *
 * 分层记忆系统：向量检索 + BM25 关键词检索 + 生命周期管理。
 * 使用 better-sqlite3 作为本地存储后端。
 * 接口兼容 OpenClaw 的 MemorySearchManager。
 */
import type { MemoryChunk, MemorySearchResult, MemorySource } from "../../types/index.js";
export declare class VectorStore {
    private chunks;
    private docFrequencies;
    private avgDocLength;
    addChunk(chunk: MemoryChunk): void;
    addChunks(chunks: MemoryChunk[]): void;
    private updateIndex;
    /**
     * Hybrid search: combines vector similarity and BM25 keyword scoring.
     */
    search(query: string, queryEmbedding?: number[], opts?: {
        maxResults?: number;
        minScore?: number;
        sources?: MemorySource[];
    }): MemorySearchResult[];
    getChunkCount(): number;
    removeExpired(): number;
    clear(): void;
}
//# sourceMappingURL=index.d.ts.map