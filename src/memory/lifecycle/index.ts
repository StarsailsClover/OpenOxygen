/**
 * OpenOxygen �?Memory Lifecycle Manager
 *
 * 记忆生命周期管理：文件索引、增量同步、过期清理、嵌入生成�?
 * 管理 workspace + memory + sessions 三个记忆源�?
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import type {
  MemoryChunk,
  MemoryConfig,
  MemorySearchResult,
  MemorySource,
} from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { VectorStore } from "../vector/index.js";

const log = createSubsystemLogger("memory/lifecycle");

// ─── Chunking ───────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 512; // characters
const DEFAULT_CHUNK_OVERLAP = 64; // characters

function chunkText(
  text: string,
  source: MemorySource,
  filePath: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
): MemoryChunk[] {
  const lines = text.split("\n");
  const chunks: MemoryChunk[] = [];
  let currentChunk = "";
  let startLine = 0;
  let currentLine = 0;

  for (const line of lines) {
    if (
      currentChunk.length + line.length > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push({
        id: generateId("chunk"),
        content: currentChunk.trim(),
        source,
        path: filePath,
        startLine,
        endLine: currentLine - 1,
        createdAt: nowMs(),
      });

      // Overlap: keep last N characters
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + line + "\n";
      startLine = Math.max(0, currentLine - Math.ceil(overlap / 40)); // Approximate line
    } else {
      currentChunk += line + "\n";
    }
    currentLine++;
  }

  // Last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: generateId("chunk"),
      content: currentChunk.trim(),
      source,
      path: filePath,
      startLine,
      endLine: currentLine - 1,
      createdAt: nowMs(),
    });
  }

  return chunks;
}

// ─── File Indexer ───────────────────────────────────────────────────────────

const INDEXABLE_EXTENSIONS = new Set([
  ".ts",
  ".js",
  ".py",
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".cfg",
  ".ini",
  ".sh",
  ".ps1",
  ".bat",
  ".cmd",
  ".html",
  ".css",
  ".xml",
  ".csv",
  ".log",
  ".env",
  ".rs",
  ".go",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
]);

function isIndexable(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return INDEXABLE_EXTENSIONS.has(ext);
}

async function indexFile(
  filePath: string,
  source: MemorySource,
): Promise<MemoryChunk[]> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > 1024 * 1024) {
      // Skip files > 1MB
      return [];
    }
    const content = await fs.readFile(filePath, "utf-8");
    return chunkText(content, source, filePath);
  } catch {
    return [];
  }
}

async function indexDirectory(
  dirPath: string,
  source: MemorySource,
  maxDepth = 5,
  currentDepth = 0,
): Promise<MemoryChunk[]> {
  if (currentDepth >= maxDepth) return [];

  const chunks: MemoryChunk[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      // Skip hidden dirs and node_modules
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "dist"
      ) {
        continue;
      }
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        chunks.push(
          ...(await indexDirectory(
            fullPath,
            source,
            maxDepth,
            currentDepth + 1,
          )),
        );
      } else if (isIndexable(fullPath)) {
        chunks.push(...(await indexFile(fullPath, source)));
      }
    }
  } catch {
    // Permission denied or other error
  }
  return chunks;
}

// ─── Memory Manager ────────────────────────────────────────────────────────

export class MemoryManager {
  private store: VectorStore;
  private config: MemoryConfig;
  private indexedPaths = new Set<string>();
  private lastSyncTime = 0;

  constructor(config: MemoryConfig) {
    this.config = config;
    this.store = new VectorStore();
  }

  updateConfig(config: MemoryConfig): void {
    this.config = config;
  }

  /**
   * Full sync: index all configured memory paths.
   */
  async sync(opts?: {
    force?: boolean;
    paths?: string[];
    progress?: (update: {
      completed: number;
      total: number;
      label?: string;
    }) => void;
  }): Promise<{ indexed: number; chunks: number }> {
    const startTime = nowMs();
    const paths = opts?.paths ?? this.config.extraPaths ?? [];

    if (!opts?.force && nowMs() - this.lastSyncTime < 60_000) {
      log.debug("Skipping sync �?too recent");
      return { indexed: 0, chunks: 0 };
    }

    log.info(`Memory sync started (${paths.length} paths)`);
    this.store.clear();

    let totalChunks = 0;
    let indexed = 0;

    for (let i = 0; i < paths.length; i++) {
      const p = paths[i]!;
      opts?.progress?.({ completed: i, total: paths.length, label: p });

      try {
        const stat = await fs.stat(p);
        let chunks: MemoryChunk[];
        if (stat.isDirectory()) {
          chunks = await indexDirectory(p, "workspace");
        } else {
          chunks = await indexFile(p, "workspace");
        }

        // Apply TTL if configured
        if (this.config.ttlDays) {
          const expiresAt = nowMs() + this.config.ttlDays * 24 * 60 * 60 * 1000;
          for (const chunk of chunks) {
            chunk.expiresAt = expiresAt;
          }
        }

        // Enforce max chunks
        if (
          this.config.maxChunks &&
          totalChunks + chunks.length > this.config.maxChunks
        ) {
          chunks = chunks.slice(0, this.config.maxChunks - totalChunks);
        }

        this.store.addChunks(chunks);
        totalChunks += chunks.length;
        indexed++;
        this.indexedPaths.add(p);
      } catch (err) {
        log.warn(`Failed to index ${p}:`, err);
      }
    }

    this.lastSyncTime = nowMs();
    const duration = nowMs() - startTime;
    log.info(
      `Memory sync completed: ${indexed} paths, ${totalChunks} chunks in ${duration}ms`,
    );

    return { indexed, chunks: totalChunks };
  }

  /**
   * Search memory using hybrid (vector + keyword) search.
   */
  async search(
    query: string,
    opts?: { maxResults?: number; minScore?: number; sources?: MemorySource[] },
  ): Promise<MemorySearchResult[]> {
    // TODO: Generate query embedding via configured embedding provider
    // For now, use keyword-only search
    return this.store.search(query, undefined, opts);
  }

  /**
   * Read a specific file from memory.
   */
  async readFile(params: {
    relPath: string;
    from?: number;
    lines?: number;
  }): Promise<{ text: string; path: string }> {
    const content = await fs.readFile(params.relPath, "utf-8");
    const allLines = content.split("\n");
    const from = params.from ?? 0;
    const count = params.lines ?? allLines.length;
    const selected = allLines.slice(from, from + count);
    return { text: selected.join("\n"), path: params.relPath };
  }

  /**
   * Get memory system status.
   */
  status(): {
    backend: string;
    chunks: number;
    indexedPaths: number;
    lastSyncTime: number;
    hybridSearch: boolean;
  } {
    return {
      backend: this.config.backend,
      chunks: this.store.getChunkCount(),
      indexedPaths: this.indexedPaths.size,
      lastSyncTime: this.lastSyncTime,
      hybridSearch: this.config.hybridSearch,
    };
  }

  /**
   * Clean up expired chunks.
   */
  cleanup(): number {
    return this.store.removeExpired();
  }
}
