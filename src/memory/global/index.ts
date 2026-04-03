/**
 * OpenOxygen - Global Memory System
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

// === Types ===

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

// === Database Schema ===

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
  created_at INTEGER NOT NULL,
  app TEXT,
  url TEXT,
  keywords TEXT -- JSON array
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_app ON task_history(app);
CREATE INDEX IF NOT EXISTS idx_tasks_time ON task_history(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_mode ON task_history(mode);
`;

// === Global Memory ===

let db: Database.Database | null = null;
const DB_PATH = "./.state/global_memory.db";

/**
 * Initialize global memory
 */
export function initializeGlobalMemory(dbPath: string = DB_PATH): void {
  if (db) {
    log.warn("Global memory already initialized");
    return;
  }

  // Ensure directory exists
  const dir = join(dbPath, "..");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.exec(SCHEMA);

  log.info("Global memory initialized");
}

/**
 * Get database instance
 */
function getDb(): Database.Database {
  if (!db) {
    initializeGlobalMemory();
  }
  return db!;
}

// === User Preferences ===

/**
 * Set user preference
 */
export function setPreference(key: string, value: unknown): void {
  const db = getDb();
  
  db.prepare(
    `INSERT INTO user_preferences (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(value), nowMs());

  log.debug(`Preference set: ${key}`);
}

/**
 * Get user preference
 */
export function getPreference<T>(key: string, defaultValue?: T): T | undefined {
  const db = getDb();
  
  const row = db.prepare(
    "SELECT value FROM user_preferences WHERE key = ?"
  ).get(key) as { value: string } | undefined;

  if (!row) return defaultValue;

  try {
    return JSON.parse(row.value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Get all preferences
 */
export function getAllPreferences(): Record<string, unknown> {
  const db = getDb();
  
  const rows = db.prepare(
    "SELECT key, value FROM user_preferences"
  ).all() as Array<{ key: string; value: string }>;

  const prefs: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      prefs[row.key] = JSON.parse(row.value);
    } catch {
      prefs[row.key] = row.value;
    }
  }

  return prefs;
}

/**
 * Delete preference
 */
export function deletePreference(key: string): boolean {
  const db = getDb();
  
  const result = db.prepare(
    "DELETE FROM user_preferences WHERE key = ?"
  ).run(key);

  return result.changes > 0;
}

// === Task History ===

/**
 * Record task execution
 */
export function recordTask(task: Omit<TaskRecord, "id" | "createdAt">): TaskRecord {
  const db = getDb();
  
  const record: TaskRecord = {
    ...task,
    id: generateId("task"),
    createdAt: nowMs(),
  };

  db.prepare(
    `INSERT INTO task_history
     (id, instruction, mode, success, output, error, duration_ms, created_at, app, url, keywords)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    record.id,
    record.instruction,
    record.mode,
    record.success ? 1 : 0,
    record.output,
    record.error,
    record.durationMs,
    record.createdAt,
    record.metadata?.app,
    record.metadata?.url,
    record.metadata?.keywords ? JSON.stringify(record.metadata.keywords) : null,
  );

  log.debug(`Task recorded: ${record.id}`);
  return record;
}

/**
 * Query task history
 */
export function queryTasks(query: ContextQuery): TaskRecord[] {
  const db = getDb();
  
  let sql = "SELECT * FROM task_history WHERE 1=1";
  const params: unknown[] = [];

  if (query.app) {
    sql += " AND app = ?";
    params.push(query.app);
  }

  if (query.mode) {
    sql += " AND mode = ?";
    params.push(query.mode);
  }

  if (query.since) {
    sql += " AND created_at >= ?";
    params.push(query.since);
  }

  if (query.keyword) {
    sql += " AND (instruction LIKE ? OR keywords LIKE ?)";
    const like = `%${query.keyword}%`;
    params.push(like, like);
  }

  sql += " ORDER BY created_at DESC";

  if (query.limit) {
    sql += " LIMIT ?";
    params.push(query.limit);
  }

  const rows = db.prepare(sql).all(...params) as any[];

  return rows.map(row => ({
    id: row.id,
    instruction: row.instruction,
    mode: row.mode,
    success: row.success === 1,
    output: row.output,
    error: row.error,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
    metadata: {
      app: row.app,
      url: row.url,
      keywords: row.keywords ? JSON.parse(row.keywords) : undefined,
    },
  }));
}

/**
 * Get recent tasks
 */
export function getRecentTasks(limit: number = 10): TaskRecord[] {
  return queryTasks({ limit });
}

/**
 * Get tasks by app
 */
export function getTasksByApp(app: string, limit: number = 10): TaskRecord[] {
  return queryTasks({ app, limit });
}

/**
 * Search tasks
 */
export function searchTasks(keyword: string, limit: number = 10): TaskRecord[] {
  return queryTasks({ keyword, limit });
}

/**
 * Get task statistics
 */
export function getTaskStats(): {
  total: number;
  successful: number;
  failed: number;
  byMode: Record<string, number>;
} {
  const db = getDb();
  
  const total = db.prepare("SELECT COUNT(*) as count FROM task_history").get() as { count: number };
  const successful = db.prepare("SELECT COUNT(*) as count FROM task_history WHERE success = 1").get() as { count: number };
  const failed = db.prepare("SELECT COUNT(*) as count FROM task_history WHERE success = 0").get() as { count: number };
  
  const byModeRows = db.prepare(
    "SELECT mode, COUNT(*) as count FROM task_history GROUP BY mode"
  ).all() as Array<{ mode: string; count: number }>;

  const byMode: Record<string, number> = {};
  for (const row of byModeRows) {
    byMode[row.mode] = row.count;
  }

  return {
    total: total.count,
    successful: successful.count,
    failed: failed.count,
    byMode,
  };
}

// === Context Injection ===

/**
 * Get relevant context for new task
 */
export function getRelevantContext(
  instruction: string,
  options: { maxItems?: number } = {},
): {
  preferences: Record<string, unknown>;
  recentTasks: TaskRecord[];
  similarTasks: TaskRecord[];
} {
  const maxItems = options.maxItems || 5;

  // Get preferences
  const preferences = getAllPreferences();

  // Get recent tasks
  const recentTasks = getRecentTasks(maxItems);

  // Search for similar tasks
  const keywords = extractKeywords(instruction);
  const similarTasks = keywords.length > 0
    ? searchTasks(keywords[0]!, maxItems)
    : [];

  return {
    preferences,
    recentTasks,
    similarTasks,
  };
}

/**
 * Extract keywords from instruction
 */
function extractKeywords(instruction: string): string[] {
  // Simple keyword extraction
  const words = instruction
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3);

  // Return unique words
  return [...new Set(words)].slice(0, 5);
}

// === Cleanup ===

/**
 * Clear old tasks
 */
export function cleanupOldTasks(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): number {
  const db = getDb();
  const cutoff = nowMs() - maxAgeMs;

  const result = db.prepare(
    "DELETE FROM task_history WHERE created_at < ?"
  ).run(cutoff);

  log.info(`Cleaned up ${result.changes} old tasks`);
  return result.changes;
}

/**
 * Close database
 */
export function closeGlobalMemory(): void {
  if (db) {
    db.close();
    db = null;
    log.info("Global memory closed");
  }
}

// === GlobalMemory Class ===

export class GlobalMemory {
  constructor() {
    initializeGlobalMemory();
  }

  setPreference(key: string, value: unknown): void {
    setPreference(key, value);
  }

  getPreference<T>(key: string, defaultValue?: T): T | undefined {
    return getPreference(key, defaultValue);
  }

  recordTask(task: Omit<TaskRecord, "id" | "createdAt">): TaskRecord {
    return recordTask(task);
  }

  queryTasks(query: ContextQuery): TaskRecord[] {
    return queryTasks(query);
  }

  getRelevantContext(instruction: string): {
    preferences: Record<string, unknown>;
    recentTasks: TaskRecord[];
    similarTasks: TaskRecord[];
  } {
    return getRelevantContext(instruction);
  }
}

// Singleton instance
let globalMemoryInstance: GlobalMemory | null = null;

export function getGlobalMemory(): GlobalMemory {
  if (!globalMemoryInstance) {
    globalMemoryInstance = new GlobalMemory();
  }
  return globalMemoryInstance;
}

// === Exports ===

export {
  initializeGlobalMemory,
  setPreference,
  getPreference,
  getAllPreferences,
  deletePreference,
  recordTask,
  queryTasks,
  getRecentTasks,
  getTasksByApp,
  searchTasks,
  getTaskStats,
  getRelevantContext,
  cleanupOldTasks,
  closeGlobalMemory,
  GlobalMemory,
  getGlobalMemory,
};

export default {
  initialize: initializeGlobalMemory,
  setPreference,
  getPreference,
  getAllPreferences,
  deletePreference,
  recordTask,
  queryTasks,
  getRecentTasks,
  getTasksByApp,
  searchTasks,
  getTaskStats,
  getRelevantContext,
  cleanupOldTasks,
  close: closeGlobalMemory,
  GlobalMemory,
  getGlobalMemory,
};
