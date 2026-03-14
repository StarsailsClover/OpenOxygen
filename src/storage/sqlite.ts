/**
 * OpenOxygen — SQLite Persistence Layer (26w11aE_P5)
 *
 * 统一持久化存储：会话、配置、审计、向量索引元数据。
 * 使用 better-sqlite3 (同步 API，零 FFI 开销)。
 */

import { createSubsystemLogger } from "../logging/index.js";
import { resolveStateDir } from "../core/config/index.js";
import path from "node:path";
import fs from "node:fs";

const log = createSubsystemLogger("storage/sqlite");

// better-sqlite3 是 CJS，需要 createRequire
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

type Database = import("better-sqlite3").Database;

// ═══════════════════════════════════════════════════════════════════════════
// Database Manager
// ═══════════════════════════════════════════════════════════════════════════

export class SQLiteStore {
  private db: Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(resolveStateDir(), "openoxygen.db");

    // 确保目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");
    this.db = new BetterSqlite3(this.dbPath);

    // WAL 模式：并发读 + 崩溃安全
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("foreign_keys = ON");

    this.initSchema();
    log.info(`SQLite store opened: ${this.dbPath}`);
  }

  // ─── Schema ───────────────────────────────────────────────────────────

  private initSchema(): void {
    this.db.exec(`
      -- 会话表
      CREATE TABLE IF NOT EXISTS sessions (
        key TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        channel_id TEXT,
        created_at INTEGER NOT NULL,
        last_active_at INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}'
      );

      -- 审计日志
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        operation TEXT NOT NULL,
        actor TEXT NOT NULL,
        target TEXT,
        severity TEXT NOT NULL DEFAULT 'info',
        details TEXT DEFAULT '{}',
        rollbackable INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_operation ON audit_log(operation);

      -- 向量索引元数据
      CREATE TABLE IF NOT EXISTS vector_chunks (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        file_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        chunk_size INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        embedding_dim INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_source ON vector_chunks(source);
      CREATE INDEX IF NOT EXISTS idx_chunks_path ON vector_chunks(file_path);
      CREATE INDEX IF NOT EXISTS idx_chunks_expires ON vector_chunks(expires_at);

      -- 配置快照
      CREATE TABLE IF NOT EXISTS config_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_json TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      -- KV 存储（通用）
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER
      );

      -- 模型使用统计
      CREATE TABLE IF NOT EXISTS model_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        duration_ms REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        mode TEXT,
        success INTEGER DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_stats_model ON model_stats(model);
      CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON model_stats(timestamp);

      -- Schema 版本
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
      INSERT OR IGNORE INTO schema_version VALUES (1);
    `);
  }

  // ─── Sessions ─────────────────────────────────────────────────────────

  saveSession(session: {
    key: string;
    agentId: string;
    channelId?: string;
    createdAt: number;
    lastActiveAt: number;
    metadata?: Record<string, unknown>;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (key, agent_id, channel_id, created_at, last_active_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      session.key,
      session.agentId,
      session.channelId || null,
      session.createdAt,
      session.lastActiveAt,
      JSON.stringify(session.metadata || {}),
    );
  }

  getSession(key: string): any {
    return this.db.prepare("SELECT * FROM sessions WHERE key = ?").get(key);
  }

  touchSession(key: string): void {
    this.db.prepare("UPDATE sessions SET last_active_at = ? WHERE key = ?").run(Date.now(), key);
  }

  listSessions(agentId?: string): any[] {
    if (agentId) {
      return this.db.prepare("SELECT * FROM sessions WHERE agent_id = ?").all(agentId);
    }
    return this.db.prepare("SELECT * FROM sessions").all();
  }

  deleteSession(key: string): void {
    this.db.prepare("DELETE FROM sessions WHERE key = ?").run(key);
  }

  // ─── Audit Log ────────────────────────────────────────────────────────

  appendAudit(entry: {
    id: string;
    timestamp: number;
    operation: string;
    actor: string;
    target?: string;
    severity?: string;
    details?: Record<string, unknown>;
    rollbackable?: boolean;
  }): void {
    this.db.prepare(`
      INSERT INTO audit_log (id, timestamp, operation, actor, target, severity, details, rollbackable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.timestamp,
      entry.operation,
      entry.actor,
      entry.target || null,
      entry.severity || "info",
      JSON.stringify(entry.details || {}),
      entry.rollbackable ? 1 : 0,
    );
  }

  queryAudit(params?: {
    operation?: string;
    severity?: string;
    since?: number;
    limit?: number;
  }): any[] {
    let sql = "SELECT * FROM audit_log WHERE 1=1";
    const args: unknown[] = [];

    if (params?.operation) { sql += " AND operation = ?"; args.push(params.operation); }
    if (params?.severity) { sql += " AND severity = ?"; args.push(params.severity); }
    if (params?.since) { sql += " AND timestamp >= ?"; args.push(params.since); }

    sql += " ORDER BY timestamp DESC";
    if (params?.limit) { sql += " LIMIT ?"; args.push(params.limit); }

    return this.db.prepare(sql).all(...args);
  }

  getAuditCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM audit_log").get() as any;
    return row?.count || 0;
  }

  // ─── Vector Chunks ────────────────────────────────────────────────────

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
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO vector_chunks
      (id, source, file_path, start_line, end_line, content_hash, chunk_size, created_at, expires_at, embedding_dim)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      chunk.id, chunk.source, chunk.filePath,
      chunk.startLine, chunk.endLine,
      chunk.contentHash, chunk.chunkSize,
      chunk.createdAt, chunk.expiresAt || null,
      chunk.embeddingDim || 0,
    );
  }

  getChunksByPath(filePath: string): any[] {
    return this.db.prepare("SELECT * FROM vector_chunks WHERE file_path = ?").all(filePath);
  }

  deleteExpiredChunks(): number {
    const result = this.db.prepare("DELETE FROM vector_chunks WHERE expires_at IS NOT NULL AND expires_at < ?").run(Date.now());
    return result.changes;
  }

  getChunkCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM vector_chunks").get() as any;
    return row?.count || 0;
  }

  // ─── Model Stats ──────────────────────────────────────────────────────

  recordModelUsage(stats: {
    model: string;
    provider: string;
    promptTokens: number;
    completionTokens: number;
    durationMs: number;
    mode?: string;
    success?: boolean;
  }): void {
    this.db.prepare(`
      INSERT INTO model_stats (model, provider, prompt_tokens, completion_tokens, duration_ms, timestamp, mode, success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      stats.model, stats.provider,
      stats.promptTokens, stats.completionTokens,
      stats.durationMs, Date.now(),
      stats.mode || null,
      stats.success !== false ? 1 : 0,
    );
  }

  getModelStats(model?: string, since?: number): any[] {
    let sql = "SELECT model, provider, COUNT(*) as requests, SUM(prompt_tokens) as total_prompt, SUM(completion_tokens) as total_completion, AVG(duration_ms) as avg_duration, SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) as successes FROM model_stats WHERE 1=1";
    const args: unknown[] = [];

    if (model) { sql += " AND model = ?"; args.push(model); }
    if (since) { sql += " AND timestamp >= ?"; args.push(since); }

    sql += " GROUP BY model, provider";
    return this.db.prepare(sql).all(...args);
  }

  // ─── KV Store ─────────────────────────────────────────────────────────

  kvSet(key: string, value: unknown, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.db.prepare(`
      INSERT OR REPLACE INTO kv_store (key, value, updated_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(key, JSON.stringify(value), Date.now(), expiresAt);
  }

  kvGet<T = unknown>(key: string): T | null {
    const row = this.db.prepare("SELECT value, expires_at FROM kv_store WHERE key = ?").get(key) as any;
    if (!row) return null;
    if (row.expires_at && row.expires_at < Date.now()) {
      this.db.prepare("DELETE FROM kv_store WHERE key = ?").run(key);
      return null;
    }
    return JSON.parse(row.value) as T;
  }

  kvDelete(key: string): void {
    this.db.prepare("DELETE FROM kv_store WHERE key = ?").run(key);
  }

  // ─── Utilities ────────────────────────────────────────────────────────

  getStats(): {
    sessions: number;
    auditEntries: number;
    vectorChunks: number;
    kvEntries: number;
    modelRequests: number;
    dbSizeBytes: number;
  } {
    const sessions = (this.db.prepare("SELECT COUNT(*) as c FROM sessions").get() as any)?.c || 0;
    const audit = (this.db.prepare("SELECT COUNT(*) as c FROM audit_log").get() as any)?.c || 0;
    const chunks = (this.db.prepare("SELECT COUNT(*) as c FROM vector_chunks").get() as any)?.c || 0;
    const kv = (this.db.prepare("SELECT COUNT(*) as c FROM kv_store").get() as any)?.c || 0;
    const stats = (this.db.prepare("SELECT COUNT(*) as c FROM model_stats").get() as any)?.c || 0;

    let dbSize = 0;
    try { dbSize = fs.statSync(this.dbPath).size; } catch {}

    return { sessions, auditEntries: audit, vectorChunks: chunks, kvEntries: kv, modelRequests: stats, dbSizeBytes: dbSize };
  }

  vacuum(): void {
    this.db.exec("VACUUM");
    log.info("Database vacuumed");
  }

  close(): void {
    this.db.close();
    log.info("SQLite store closed");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Global Instance
// ═══════════════════════════════════════════════════════════════════════════

let globalStore: SQLiteStore | null = null;

export function getStore(dbPath?: string): SQLiteStore {
  if (!globalStore) {
    globalStore = new SQLiteStore(dbPath);
  }
  return globalStore;
}

export function closeStore(): void {
  if (globalStore) {
    globalStore.close();
    globalStore = null;
  }
}
