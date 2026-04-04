/**
<<<<<<< HEAD
 * OpenOxygen �?Memory System (Vector Store + Hybrid Search)
=======
 * OpenOxygen - Memory System (Vector Store + Hybrid Search)
>>>>>>> dev
 *
 * 分层记忆系统：向量检�?+ BM25 关键词检�?+ 生命周期管理�?
 * 使用 better-sqlite3 作为本地存储后端�?
 * 接口兼容 OpenClaw �?MemorySearchManager�?
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type {
  MemoryChunk,
  MemoryConfig,
  MemorySearchResult,
  MemorySource,
} from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";

const log = createSubsystemLogger("memory/vector");

// === Vector Math ===

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// === BM25 Scoring ===

const BM25_K1 = 1.2;
const BM25_B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function computeBM25(
  query: string[],
  document: string[],
  avgDocLength: number,
  docFrequencies: Map<string, number>,
  totalDocs: number,
): number {
  let score = 0;
  const docLength = document.length;
  const termFreq = new Map<string, number>();

  for (const term of document) {
    termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
  }

  for (const term of query) {
    const tf = termFreq.get(term) ?? 0;
    const df = docFrequencies.get(term) ?? 0;
    const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
    const tfNorm = (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLength / avgDocLength)));
    score += idf * tfNorm;
  }

  return score;
}

// === Memory Store ===

export class VectorMemoryStore {
  private chunks: Map<string, MemoryChunk> = new Map();
  private config: MemoryConfig;

  constructor(config: MemoryConfig = {}) {
    this.config = {
      dimension: 1536,
      maxChunks: 10000,
      similarityThreshold: 0.7,
      ...config,
    };
  }

  /**
   * Store a memory chunk
   */
  async store(chunk: Omit<MemoryChunk, "id" | "createdAt">): Promise<MemoryChunk> {
    const fullChunk: MemoryChunk = {
      ...chunk,
      id: generateId("mem"),
      createdAt: nowMs(),
    };

    this.chunks.set(fullChunk.id, fullChunk);
    log.debug(`Stored chunk: ${fullChunk.id}`);

    // Trim if exceeding max
    if (this.chunks.size > this.config.maxChunks!) {
      const oldest = Array.from(this.chunks.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest) {
        this.chunks.delete(oldest[0]);
        log.debug(`Evicted oldest chunk: ${oldest[0]}`);
      }
    }

    return fullChunk;
  }

  /**
   * Search by vector similarity
   */
  async searchByVector(
    queryVector: number[],
    options: { topK?: number; threshold?: number } = {},
  ): Promise<MemorySearchResult[]> {
    const topK = options.topK ?? 5;
    const threshold = options.threshold ?? this.config.similarityThreshold;

    const results: MemorySearchResult[] = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.vector) continue;
      
      const similarity = cosineSimilarity(queryVector, chunk.vector);
      if (similarity >= threshold) {
        results.push({
          chunk,
          score: similarity,
          method: "vector",
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Search by BM25 keyword matching
   */
  async searchByKeyword(
    query: string,
    options: { topK?: number } = {},
  ): Promise<MemorySearchResult[]> {
    const topK = options.topK ?? 5;
    const queryTokens = tokenize(query);

    // Build document frequency map
    const docFreq = new Map<string, number>();
    let totalLength = 0;

    for (const chunk of this.chunks.values()) {
      const tokens = tokenize(chunk.content);
      totalLength += tokens.length;
      const unique = new Set(tokens);
      for (const term of unique) {
        docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
      }
    }

    const avgDocLength = totalLength / (this.chunks.size || 1);
    const totalDocs = this.chunks.size;

    const results: MemorySearchResult[] = [];

    for (const chunk of this.chunks.values()) {
      const docTokens = tokenize(chunk.content);
      const score = computeBM25(queryTokens, docTokens, avgDocLength, docFreq, totalDocs);
      
      if (score > 0) {
        results.push({
          chunk,
          score,
          method: "bm25",
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Hybrid search: vector + BM25
   */
  async search(
    query: { vector?: number[]; text?: string },
    options: { topK?: number; vectorWeight?: number } = {},
  ): Promise<MemorySearchResult[]> {
    const topK = options.topK ?? 5;
    const vectorWeight = options.vectorWeight ?? 0.7;
    const bm25Weight = 1 - vectorWeight;

    const results = new Map<string, MemorySearchResult>();

    // Vector search
    if (query.vector) {
      const vectorResults = await this.searchByVector(query.vector, { topK: topK * 2 });
      for (const r of vectorResults) {
        results.set(r.chunk.id, {
          ...r,
          score: r.score * vectorWeight,
        });
      }
    }

    // BM25 search
    if (query.text) {
      const bm25Results = await this.searchByKeyword(query.text, { topK: topK * 2 });
      for (const r of bm25Results) {
        const existing = results.get(r.chunk.id);
        if (existing) {
          existing.score += r.score * bm25Weight;
        } else {
          results.set(r.chunk.id, {
            ...r,
            score: r.score * bm25Weight,
          });
        }
      }
    }

    return Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Delete a chunk
   */
  async delete(chunkId: string): Promise<boolean> {
    const existed = this.chunks.has(chunkId);
    this.chunks.delete(chunkId);
    log.debug(`Deleted chunk: ${chunkId}`);
    return existed;
  }

  /**
   * Clear all chunks
   */
  async clear(): Promise<void> {
    this.chunks.clear();
    log.info("Cleared all memory chunks");
  }

  /**
   * Get stats
   */
  getStats(): { totalChunks: number; totalTokens: number } {
    let totalTokens = 0;
    for (const chunk of this.chunks.values()) {
      totalTokens += tokenize(chunk.content).length;
    }
    return {
      totalChunks: this.chunks.size,
      totalTokens,
    };
  }
}

// === OpenClaw Compatibility ===

export class MemorySearchManager extends VectorMemoryStore {
  constructor(config?: MemoryConfig) {
    super(config);
    log.info("MemorySearchManager initialized (OpenClaw compatible)");
  }
}

// === Default Export ===

export const VectorMemory = {
  Store: VectorMemoryStore,
  SearchManager: MemorySearchManager,
};

export default VectorMemory;
