/**
<<<<<<< HEAD
 * OpenOxygen �?Global Memory System (26w15a Phase 1)
=======
 * OpenOxygen - Global Memory System
>>>>>>> dev
 *
 * 全局记忆系统：跨会话、跨任务的用户偏好和历史操作记忆
 *
 * 功能�?
 *   - 用户偏好存储（工作目录、常用命令、喜欢的模型�?
 *   - 任务历史索引（按应用、按时间、按类型�?
 *   - 快速检索（"上次�?VS Code 做了什么？"�?
 *   - 上下文自动注入（新任务自动带上相关历史）
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import Database from "better-sqlite3";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
const log = createSubsystemLogger("memory/global");
<<<<<<< HEAD
// ─── Database Schema ────────────────────────────────────────────────────────
=======
// === Database Schema ===
>>>>>>> dev
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
<<<<<<< HEAD
// ─── Global Memory Manager ──────────────────────────────────────────────────
export class GlobalMemory {
    db;
    dbPath;
    constructor(stateDir = ".state") {
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
=======
// === Global Memory ===
let db = null;
const DB_PATH = "./.state/global_memory.db";
/**
 * Initialize global memory
 */
export function initializeGlobalMemory(dbPath = DB_PATH) {
    if (db) {
        log.warn("Global memory already initialized");
        return;
>>>>>>> dev
    }
    // Ensure directory exists
    const dir = join(dbPath, "..");
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
<<<<<<< HEAD
    getPreference(key, defaultValue) {
        const stmt = this.db.prepare("SELECT value FROM user_preferences WHERE key = ?");
        const row = stmt.get(key);
        if (!row)
            return defaultValue;
        try {
            return JSON.parse(row.value);
        }
        catch {
            return defaultValue;
        }
    }
    getAllPreferences() {
        const stmt = this.db.prepare("SELECT key, value FROM user_preferences");
        const rows = stmt.all();
        const prefs = {};
        for (const { key, value } of rows) {
            try {
                prefs[key] = JSON.parse(value);
            }
            catch { }
        }
        return prefs;
    }
    deletePreference(key) {
        const stmt = this.db.prepare("DELETE FROM user_preferences WHERE key = ?");
        stmt.run(key);
    }
    // ─── Task History ─────────────────────────────────────────────────────────
    recordTask(task) {
        const id = generateId("task");
        const createdAt = nowMs();
        const stmt = this.db.prepare(`
      INSERT INTO task_history (id, instruction, mode, success, output, error, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, task.instruction, task.mode, task.success ? 1 : 0, task.output || null, task.error || null, task.durationMs, createdAt);
        // Index context
        if (task.metadata) {
            const indexStmt = this.db.prepare(`
        INSERT INTO context_index (task_id, app, url, keywords)
        VALUES (?, ?, ?, ?)
      `);
            indexStmt.run(id, task.metadata.app || null, task.metadata.url || null, task.metadata.keywords ? JSON.stringify(task.metadata.keywords) : null);
        }
        const record = { ...task, id, createdAt };
        log.debug(`Task recorded: ${id} (${task.mode}, ${task.success ? "success" : "failed"})`);
        return record;
    }
    getTask(id) {
        const stmt = this.db.prepare("SELECT * FROM task_history WHERE id = ?");
        const row = stmt.get(id);
        if (!row)
            return null;
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
    queryTasks(query) {
        let sql = "SELECT * FROM task_history WHERE 1=1";
        const params = [];
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
        const rows = stmt.all(...params);
        return rows.map((row) => ({
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
    getRecentTasks(limit = 10) {
        return this.queryTasks({ limit });
    }
    getTasksByApp(app, limit = 10) {
        return this.queryTasks({ app, limit });
    }
    // ─── Context Injection ────────────────────────────────────────────────────
    /**
     * 为新任务自动注入相关上下�?
     */
    injectContext(instruction) {
        const contexts = [];
        // Extract keywords from instruction
        const keywords = this.extractKeywords(instruction);
        // Find related tasks
        for (const keyword of keywords) {
            const related = this.queryTasks({ keyword, limit: 3 });
            for (const task of related) {
                contexts.push(`[历史] ${task.instruction} �?${task.success ? "成功" : "失败"}`);
            }
        }
        // Get user preferences that might be relevant
        const prefs = this.getAllPreferences();
        const workingDir = prefs["workingDirectory"];
        if (workingDir && instruction.toLowerCase().includes("cd ")) {
            contexts.push(`[偏好] 工作目录: ${workingDir}`);
        }
        if (contexts.length === 0) {
            return instruction;
        }
        return `${instruction}\n\n[上下文参考]\n${contexts.slice(0, 5).join("\n")}`;
    }
    extractKeywords(instruction) {
        const keywords = [];
        // App names
        const apps = [
            "chrome",
            "edge",
            "vscode",
            "wechat",
            "qq",
            "steam",
            "bilibili",
            "github",
        ];
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
    getStats() {
        const totalStmt = this.db.prepare("SELECT COUNT(*) as count FROM task_history");
        const { count: totalTasks } = totalStmt.get();
        const successStmt = this.db.prepare("SELECT COUNT(*) as count FROM task_history WHERE success = 1");
        const { count: successCount } = successStmt.get();
        const durationStmt = this.db.prepare("SELECT AVG(duration_ms) as avg FROM task_history");
        const { avg: avgDuration } = durationStmt.get();
        const modeStmt = this.db.prepare("SELECT mode, COUNT(*) as count FROM task_history GROUP BY mode");
        const modeRows = modeStmt.all();
        const byMode = {};
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
    close() {
        this.db.close();
        log.info("Global memory closed");
    }
    vacuum() {
        this.db.exec("VACUUM");
        log.info("Global memory vacuumed");
    }
}
// ─── Singleton Instance ────────────────────────────────────────────────────
let globalMemoryInstance = null;
export function getGlobalMemory(stateDir) {
=======
    db = new Database(dbPath);
    db.exec(SCHEMA);
    log.info("Global memory initialized");
}
/**
 * Get database instance
 */
function getDb() {
    if (!db) {
        initializeGlobalMemory();
    }
    return db;
}
// === User Preferences ===
/**
 * Set user preference
 */
export function setPreference(key, value) {
    const db = getDb();
    db.prepare(`INSERT INTO user_preferences (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`).run(key, JSON.stringify(value), nowMs());
    log.debug(`Preference set: ${key}`);
}
/**
 * Get user preference
 */
export function getPreference(key, defaultValue) {
    const db = getDb();
    const row = db.prepare("SELECT value FROM user_preferences WHERE key = ?").get(key);
    if (!row)
        return defaultValue;
    try {
        return JSON.parse(row.value);
    }
    catch {
        return defaultValue;
    }
}
/**
 * Get all preferences
 */
export function getAllPreferences() {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM user_preferences").all();
    const prefs = {};
    for (const row of rows) {
        try {
            prefs[row.key] = JSON.parse(row.value);
        }
        catch {
            prefs[row.key] = row.value;
        }
    }
    return prefs;
}
/**
 * Delete preference
 */
export function deletePreference(key) {
    const db = getDb();
    const result = db.prepare("DELETE FROM user_preferences WHERE key = ?").run(key);
    return result.changes > 0;
}
// === Task History ===
/**
 * Record task execution
 */
export function recordTask(task) {
    const db = getDb();
    const record = {
        ...task,
        id: generateId("task"),
        createdAt: nowMs(),
    };
    db.prepare(`INSERT INTO task_history
     (id, instruction, mode, success, output, error, duration_ms, created_at, app, url, keywords)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(record.id, record.instruction, record.mode, record.success ? 1 : 0, record.output, record.error, record.durationMs, record.createdAt, record.metadata?.app, record.metadata?.url, record.metadata?.keywords ? JSON.stringify(record.metadata.keywords) : null);
    log.debug(`Task recorded: ${record.id}`);
    return record;
}
/**
 * Query task history
 */
export function queryTasks(query) {
    const db = getDb();
    let sql = "SELECT * FROM task_history WHERE 1=1";
    const params = [];
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
    const rows = db.prepare(sql).all(...params);
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
export function getRecentTasks(limit = 10) {
    return queryTasks({ limit });
}
/**
 * Get tasks by app
 */
export function getTasksByApp(app, limit = 10) {
    return queryTasks({ app, limit });
}
/**
 * Search tasks
 */
export function searchTasks(keyword, limit = 10) {
    return queryTasks({ keyword, limit });
}
/**
 * Get task statistics
 */
export function getTaskStats() {
    const db = getDb();
    const total = db.prepare("SELECT COUNT(*) as count FROM task_history").get();
    const successful = db.prepare("SELECT COUNT(*) as count FROM task_history WHERE success = 1").get();
    const failed = db.prepare("SELECT COUNT(*) as count FROM task_history WHERE success = 0").get();
    const byModeRows = db.prepare("SELECT mode, COUNT(*) as count FROM task_history GROUP BY mode").all();
    const byMode = {};
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
export function getRelevantContext(instruction, options = {}) {
    const maxItems = options.maxItems || 5;
    // Get preferences
    const preferences = getAllPreferences();
    // Get recent tasks
    const recentTasks = getRecentTasks(maxItems);
    // Search for similar tasks
    const keywords = extractKeywords(instruction);
    const similarTasks = keywords.length > 0
        ? searchTasks(keywords[0], maxItems)
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
function extractKeywords(instruction) {
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
export function cleanupOldTasks(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
    const db = getDb();
    const cutoff = nowMs() - maxAgeMs;
    const result = db.prepare("DELETE FROM task_history WHERE created_at < ?").run(cutoff);
    log.info(`Cleaned up ${result.changes} old tasks`);
    return result.changes;
}
/**
 * Close database
 */
export function closeGlobalMemory() {
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
    setPreference(key, value) {
        setPreference(key, value);
    }
    getPreference(key, defaultValue) {
        return getPreference(key, defaultValue);
    }
    recordTask(task) {
        return recordTask(task);
    }
    queryTasks(query) {
        return queryTasks(query);
    }
    getRelevantContext(instruction) {
        return getRelevantContext(instruction);
    }
}
// Singleton instance
let globalMemoryInstance = null;
export function getGlobalMemory() {
>>>>>>> dev
    if (!globalMemoryInstance) {
        globalMemoryInstance = new GlobalMemory();
    }
    return globalMemoryInstance;
}
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
