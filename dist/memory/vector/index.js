/**
 * OpenOxygen — Memory System (Vector Store + Hybrid Search)
 *
 * 分层记忆系统：向量检索 + BM25 关键词检索 + 生命周期管理。
 * 使用 better-sqlite3 作为本地存储后端。
 * 接口兼容 OpenClaw 的 MemorySearchManager。
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("memory/vector");
// ─── Vector Math ────────────────────────────────────────────────────────────
function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
}
// ─── BM25 Scoring ───────────────────────────────────────────────────────────
const BM25_K1 = 1.2;
const BM25_B = 0.75;
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fff]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 0);
}
function computeBM25(query, document, avgDocLength, docFrequencies, totalDocs) {
    let score = 0;
    const docLength = document.length;
    const termFreq = new Map();
    for (const term of document) {
        termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
    }
    for (const term of query) {
        const tf = termFreq.get(term) ?? 0;
        if (tf === 0)
            continue;
        const df = docFrequencies.get(term) ?? 0;
        const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
        const tfNorm = (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLength / avgDocLength)));
        score += idf * tfNorm;
    }
    return score;
}
// ─── In-Memory Vector Store ─────────────────────────────────────────────────
export class VectorStore {
    chunks = [];
    docFrequencies = new Map();
    avgDocLength = 0;
    addChunk(chunk) {
        this.chunks.push(chunk);
        this.updateIndex(chunk);
    }
    addChunks(chunks) {
        for (const chunk of chunks) {
            this.addChunk(chunk);
        }
    }
    updateIndex(chunk) {
        const tokens = tokenize(chunk.content);
        const uniqueTokens = new Set(tokens);
        for (const token of uniqueTokens) {
            this.docFrequencies.set(token, (this.docFrequencies.get(token) ?? 0) + 1);
        }
        // Recalculate average document length
        const totalTokens = this.chunks.reduce((sum, c) => sum + tokenize(c.content).length, 0);
        this.avgDocLength = this.chunks.length > 0 ? totalTokens / this.chunks.length : 0;
    }
    /**
     * Hybrid search: combines vector similarity and BM25 keyword scoring.
     */
    search(query, queryEmbedding, opts) {
        const maxResults = opts?.maxResults ?? 10;
        const minScore = opts?.minScore ?? 0.1;
        const queryTokens = tokenize(query);
        let candidates = this.chunks;
        if (opts?.sources) {
            candidates = candidates.filter((c) => opts.sources.includes(c.source));
        }
        // Filter expired chunks
        const now = nowMs();
        candidates = candidates.filter((c) => !c.expiresAt || c.expiresAt > now);
        const scored = candidates.map((chunk) => {
            // BM25 score
            const docTokens = tokenize(chunk.content);
            const bm25Score = computeBM25(queryTokens, docTokens, this.avgDocLength, this.docFrequencies, this.chunks.length);
            // Vector similarity score
            let vectorScore = 0;
            if (queryEmbedding && chunk.embedding) {
                vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
            }
            // Hybrid score: weighted combination
            const hybridScore = queryEmbedding
                ? vectorScore * 0.6 + bm25Score * 0.4
                : bm25Score;
            return { chunk, score: hybridScore };
        });
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        return scored
            .filter((s) => s.score >= minScore)
            .slice(0, maxResults)
            .map((s) => ({
            path: s.chunk.path,
            startLine: s.chunk.startLine,
            endLine: s.chunk.endLine,
            score: s.score,
            snippet: s.chunk.content.slice(0, 700),
            source: s.chunk.source,
        }));
    }
    getChunkCount() {
        return this.chunks.length;
    }
    removeExpired() {
        const now = nowMs();
        const before = this.chunks.length;
        this.chunks = this.chunks.filter((c) => !c.expiresAt || c.expiresAt > now);
        const removed = before - this.chunks.length;
        if (removed > 0) {
            log.info(`Removed ${removed} expired chunks`);
        }
        return removed;
    }
    clear() {
        this.chunks = [];
        this.docFrequencies.clear();
        this.avgDocLength = 0;
    }
}
//# sourceMappingURL=index.js.map