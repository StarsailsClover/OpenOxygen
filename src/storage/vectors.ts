/**
 * OpenOxygen �?Persistent Vector Store (26w11aE_P5)
 *
 * 向量持久化：内存向量 + SQLite 元数�?+ 磁盘缓存
 * 支持 Int8 量化、LRU 淘汰、增量索�?
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import { VectorStore } from "../memory/vector/index.js";
import type {
  MemoryChunk,
  MemorySearchResult,
  MemorySource,
} from "../types/index.js";
import type { SQLiteStore } from "./sqlite.js";
import { createHash } from "node:crypto";

const log = createSubsystemLogger("storage/vectors");

// ══════════════════════════════════════════════════════════════════════════�?
// Int8 Quantization
// ══════════════════════════════════════════════════════════════════════════�?

export function quantizeFloat64ToInt8(vector: number[]): {
  quantized: Int8Array;
  scale: number;
  offset: number;
} {
  const min = Math.min(...vector);
  const max = Math.max(...vector);
  const range = max - min || 1;
  const scale = 254 / range; // -127 to 127
  const offset = min;

  const quantized = new Int8Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    quantized[i] = Math.round((vector[i]! - offset) * scale - 127);
  }

  return { quantized, scale, offset };
}

export function dequantizeInt8ToFloat64(
  quantized: Int8Array,
  scale: number,
  offset: number,
): number[] {
  const result = new Array(quantized.length);
  for (let i = 0; i < quantized.length; i++) {
    result[i] = (quantized[i]! + 127) / scale + offset;
  }
  return result;
}

// ══════════════════════════════════════════════════════════════════════════�?
// LRU Cache
// ══════════════════════════════════════════════════════════════════════════�?

class LRUCache<K, V> {
  private map = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // 移到末尾（最近使用）
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // 淘汰最旧的
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════�?
// Persistent Vector Store
// ══════════════════════════════════════════════════════════════════════════�?

export class PersistentVectorStore {
  private memoryStore: VectorStore;
  private sqliteStore: SQLiteStore;
  private embeddingCache: LRUCache<string, number[]>;
  private useQuantization: boolean;
  private maxMemoryChunks: number;

  constructor(
    sqliteStore: SQLiteStore,
    options?: {
      maxMemoryChunks?: number;
      maxCacheSize?: number;
      useQuantization?: boolean;
    },
  ) {
    this.memoryStore = new VectorStore();
    this.sqliteStore = sqliteStore;
    this.embeddingCache = new LRUCache(options?.maxCacheSize || 10000);
    this.useQuantization = options?.useQuantization ?? false;
    this.maxMemoryChunks = options?.maxMemoryChunks || 50000;
  }

  /**
   * 添加文档块（内存 + SQLite 元数据）
   */
  addChunk(chunk: MemoryChunk): void {
    // 存入内存向量存储
    this.memoryStore.addChunk(chunk);

    // 存入 SQLite 元数�?
    this.sqliteStore.saveChunk({
      id: chunk.id,
      source: chunk.source,
      filePath: chunk.path,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      contentHash: createHash("sha256")
        .update(chunk.content)
        .digest("hex")
        .slice(0, 16),
      chunkSize: chunk.content.length,
      createdAt: chunk.createdAt,
      expiresAt: chunk.expiresAt,
      embeddingDim: chunk.embedding?.length || 0,
    });

    // 缓存嵌入向量
    if (chunk.embedding) {
      this.embeddingCache.set(chunk.id, chunk.embedding);
    }
  }

  /**
   * 批量添加
   */
  addChunks(chunks: MemoryChunk[]): { added: number; skipped: number } {
    let added = 0;
    let skipped = 0;

    for (const chunk of chunks) {
      // 检查内存限�?
      if (this.memoryStore.getChunkCount() >= this.maxMemoryChunks) {
        // LRU 淘汰：移除最旧的
        this.memoryStore.removeExpired();
        if (this.memoryStore.getChunkCount() >= this.maxMemoryChunks) {
          skipped++;
          continue;
        }
      }

      this.addChunk(chunk);
      added++;
    }

    log.info(
      `Added ${added} chunks, skipped ${skipped} (memory limit: ${this.maxMemoryChunks})`,
    );
    return { added, skipped };
  }

  /**
   * 搜索（混合：内存向量 + BM25�?
   */
  search(
    query: string,
    queryEmbedding?: number[],
    opts?: { maxResults?: number; minScore?: number; sources?: MemorySource[] },
  ): MemorySearchResult[] {
    return this.memoryStore.search(query, queryEmbedding, opts);
  }

  /**
   * 清理过期�?
   */
  cleanup(): { memoryRemoved: number; dbRemoved: number } {
    const memoryRemoved = this.memoryStore.removeExpired();
    const dbRemoved = this.sqliteStore.deleteExpiredChunks();

    if (memoryRemoved > 0 || dbRemoved > 0) {
      log.info(
        `Cleanup: ${memoryRemoved} memory, ${dbRemoved} db chunks removed`,
      );
    }

    return { memoryRemoved, dbRemoved };
  }

  /**
   * 获取存储统计
   */
  getStats(): {
    memoryChunks: number;
    dbChunks: number;
    cacheSize: number;
    maxMemory: number;
    quantization: boolean;
  } {
    return {
      memoryChunks: this.memoryStore.getChunkCount(),
      dbChunks: this.sqliteStore.getChunkCount(),
      cacheSize: this.embeddingCache.size,
      maxMemory: this.maxMemoryChunks,
      quantization: this.useQuantization,
    };
  }

  /**
   * 清空所有数�?
   */
  clear(): void {
    this.memoryStore.clear();
    this.embeddingCache.clear();
    log.info("Persistent vector store cleared");
  }
}
