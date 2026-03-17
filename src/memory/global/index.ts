/**
 * OpenOxygen — Global Memory System (26w15a Phase 1)
 *
 * 全局记忆系统：跨会话、跨任务的用户偏好和历史操作记忆
 *
 * 功能：
 *   - 用户偏好存储（工作目录、常用命令、喜欢的模型）
 *   - 任务历史索引（按应用、按时间、按类型）
 *   - 快速检索（"上次在 VS Code 做了什么？"）
 *   - 上下文自动注入（新任务自动带上相关历史）
 */

import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import Database from "better-sqlite3";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const log = createSubsystemLogger("memory/global");

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserPreference = {
  key: string;
  value: unknown;
  updatedAt: number;
};

export type TaskRecord = {
  id: string;
  instruction: string;
  mode: "terminal" | "gui" | "browser" | "hybrid";
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
  createdAt: number;
  metadata?: {
    app?: string;
    url?: string;
    keywords?: string[];
  };
};

export type ContextQuery = {
  app?: string;
  mode?: string;
  keyword?: string;
  since?: number; // timestamp
  limit?: number;
};

// ─── Database Schema ────────────────────────────────────────────────────────

const SCHEMA = `
-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON
  updated_at INTEGER NOT NULL
);

-- Task history
CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY,
  instruction TEXT NOT NULL,
  mode TEXT NOT NULL,
  success INTEGER NOT NULL,
  output TEXT,
  error TEXT,
  duration_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Context index for fast retrieval
CREATE TABLE IF NOT EXISTS context_index (
  task_id TEXT NOT NULL,
  app TEXT,
  url TEXT,
  keywords TEXT, -- JSON array
  FOREIGN KEY (task_id) REFERENCES task_history(id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_task_history_created ON task_history(created_at);
CREATE INDEX IF NOT EXISTS idx_task_history_mode ON task_history(mode);
CREATE INDEX IF NOT EXISTS idx_context_app ON context_index(app);
CREATE INDEX IF NOT EXISTS idx_context_keywords ON context_index(keywords);
`;

// ─── Global Memory Manager ──────────────────────────────────────────────────

export class GlobalMemory {
  private db: Database.Database;
  private dbPath: string;

  constructor(stateDir: string = ".state") {
    // Ensure state directory exists
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    this.dbPath = join(stateDir, "global-memory.db");
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    
    // Initialize schema
    this.db.exec(SCHEMA);
    
    log.info(`Global memory initialized: ${this.dbPath}`);
  }

  // ─── User Preferences ─────────────────────────────────────────────────────

  setPreference(key: string, value: unknown): void {
    const stmt = this.db.prepare(`
      INSERT INTO user_preferences (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(key, JSON.stringify(value), nowMs());
    log.debug(`Preference set: ${key}`);
  }

  getPreference<T>(key: string, defaultValue?: T): T | undefined {
    const stmt = this.db.prepare("SELECT value FROM user_preferences WHERE key = ?");
    const row = stmt.get(key) as { value: string } | undefined;
    
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return defaultValue;
    }
  }

  getAllPreferences(): Record<string, unknown> {
    const stmt = this.db.prepare("SELECT key, value FROM user_preferences");
    const rows = stmt.all() as Array<{ key: string; value: string }>;
    
    const prefs: Record<string, unknown> = {};
    for (const { key, value } of rows) {
      try { prefs[key] = JSON.parse(value); } catch {}
    }
    return prefs;
  }

  deletePreference(key: string): void {
    const stmt = this.db.prepare("DELETE FROM user_preferences WHERE key = ?");
    stmt.run(key);
  }

  // ─── Task History ─────────────────────────────────────────────────────────

  recordTask(task: Omit<TaskRecord, "id" | "createdAt">): TaskRecord {
    const id = generateId("task");
    const createdAt = nowMs();
    
    const stmt = this.db.prepare(`
      INSERT INTO task_history (id, instruction, mode, success, output, error, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      task.instruction,
      task.mode,
      task.success ? 1 : 0,
      task.output || null,
      task.error || null,
      task.durationMs,
      createdAt
    );

    // Index context
    if (task.metadata) {
      const indexStmt = this.db.prepare(`
        INSERT INTO context_index (task_id, app, url, keywords)
        VALUES (?, ?, ?, ?)
      `);
      indexStmt.run(
        id,
        task.metadata.app || null,
        task.metadata.url || null,
        task.metadata.keywords ? JSON.stringify(task.metadata.keywords) : null
      );
    }

    const record: TaskRecord = { ...task, id, createdAt };
    log.debug(`Task recorded: ${id} (${task.mode}, ${task.success ? "success" : "failed"})`);
    return record;
  }

  getTask(id: string): TaskRecord | null {
    const stmt = this.db.prepare("SELECT * FROM task_history WHERE id = ?");
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      instruction: row.instruction,
      mode: row.mode,
      success: Boolean(row.success),
      output: row.output,
      error: row.error,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
    };
  }

  queryTasks(query: ContextQuery): TaskRecord[] {
    let sql = "SELECT * FROM task_history WHERE 1=1";
    const params: (string | number)[] = [];

    if (query.mode) {
      sql += " AND mode = ?";
      params.push(query.mode);
    }

    if (query.since) {
      sql += " AND created_at >= ?";
      params.push(query.since);
    }

    // Join with context_index for app/keyword filtering
    if (query.app || query.keyword) {
      sql = `SELECT th.* FROM task_history th
             JOIN context_index ci ON th.id = ci.task_id
             WHERE 1=1`;
      
      if (query.mode) {
        sql += " AND th.mode = ?";
        params.push(query.mode);
      }

      if (query.app) {
        sql += " AND ci.app = ?";
        params.push(query.app);
      }

      if (query.keyword) {
        sql += " AND ci.keywords LIKE ?";
        params.push(`%${query.keyword}%`);
      }
    }

    sql += " ORDER BY created_at DESC";
    
    if (query.limit) {
      sql += " LIMIT ?";
      params.push(query.limit);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      instruction: row.instruction,
      mode: row.mode,
      success: Boolean(row.success),
      output: row.output,
      error: row.error,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
    }));
  }

  getRecentTasks(limit: number = 10): TaskRecord[] {
    return this.queryTasks({ limit });
  }

  getTasksByApp(app: string, limit: number = 10): TaskRecord[] {
    return this.queryTasks({ app, limit });
  }

  // ─── Context Injection ────────────────────────────────────────────────────

  /**
   * 为新任务自动注入相关上下文
   */
  injectContext(instruction: string): string {
    const contexts: string[] = [];
    
    // Extract keywords from instruction
    const keywords = this.extractKeywords(instruction);
    
    // Find related tasks
    for (const keyword of keywords) {
      const related = this.queryTasks({ keyword, limit: 3 });
      for (const task of related) {
        contexts.push(`[历史] ${task.instruction} → ${task.success ? "成功" : "失败"}`);
      }
    }

    // Get user preferences that might be relevant
    const prefs = this.getAllPreferences();
    const workingDir = prefs["workingDirectory"] as string;
    if (workingDir && instruction.toLowerCase().includes("cd ")) {
      contexts.push(`[偏好] 工作目录: ${workingDir}`);
    }

    if (contexts.length === 0) {
      return instruction;
    }

    return `${instruction}\n\n[上下文参考]\n${contexts.slice(0, 5).join("\n")}`;
  }

  private extractKeywords(instruction: string): string[] {
    const keywords: string[] = [];
    
    // App names
    const apps = ["chrome", "edge", "vscode", "wechat", "qq", "steam", "bilibili", "github"];
    for (const app of apps) {
      if (instruction.toLowerCase().includes(app)) {
        keywords.push(app);
      }
    }
    
    // Commands
    const commands = ["npm", "git", "docker", "python", "node"];
    for (const cmd of commands) {
      if (instruction.toLowerCase().includes(cmd)) {
        keywords.push(cmd);
      }
    }
    
    return [...new Set(keywords)];
  }

  // ─── Statistics ─────────────────────────────────────────────────────────

  getStats(): {
    totalTasks: number;
    successRate: number;
    avgDuration: number;
    byMode: Record<string, number>;
  } {
    const totalStmt = this.db.prepare("SELECT COUNT(*) as count FROM task_history");
    const { count: totalTasks } = totalStmt.get() as { count: number };

    const successStmt = this.db.prepare("SELECT COUNT(*) as count FROM task_history WHERE success = 1");
    const { count: successCount } = successStmt.get() as { count: number };

    const durationStmt = this.db.prepare("SELECT AVG(duration_ms) as avg FROM task_history");
    const { avg: avgDuration } = durationStmt.get() as { avg: number };

    const modeStmt = this.db.prepare("SELECT mode, COUNT(*) as count FROM task_history GROUP BY mode");
    const modeRows = modeStmt.all() as Array<{ mode: string; count: number }>;
    
    const byMode: Record<string, number> = {};
    for (const { mode, count } of modeRows) {
      byMode[mode] = count;
    }

    return {
      totalTasks,
      successRate: totalTasks > 0 ? successCount / totalTasks : 0,
      avgDuration: avgDuration || 0,
      byMode,
    };
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  close(): void {
    this.db.close();
    log.info("Global memory closed");
  }

  vacuum(): void {
    this.db.exec("VACUUM");
    log.info("Global memory vacuumed");
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────

let globalMemoryInstance: GlobalMemory | null = null;

export function getGlobalMemory(stateDir?: string): GlobalMemory {
  if (!globalMemoryInstance) {
    globalMemoryInstance = new GlobalMemory(stateDir);
  }
  return globalMemoryInstance;
}

export function resetGlobalMemory(): void {
  if (globalMemoryInstance) {
    globalMemoryInstance.close();
    globalMemoryInstance = null;
  }
}
