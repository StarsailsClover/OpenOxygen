/**
 * OpenOxygen OUV Vector Database
 * 
 * 基于 SQLite + 向量搜索的记忆系统
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const log = {
    info: (...args) => console.log("[VectorDB]", ...args),
    warn: (...args) => console.warn("[VectorDB]", ...args),
    error: (...args) => console.error("[VectorDB]", ...args)
};

/**
 * 计算余弦相似度
 */
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * OUV 向量数据库类
 */
class OUVVectorDatabase {
    constructor(dbPath = "./data/ouv_memory.db") {
        this.dbPath = dbPath;
        this.db = null;
        this.dimension = 384; // 默认向量维度 (CLIP)
    }
    
    /**
     * 初始化数据库
     */
    initialize() {
        log.info(`Initializing vector database: ${this.dbPath}`);
        
        // 确保目录存在
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // 打开数据库
        this.db = new Database(this.dbPath);
        
        // 创建表
        this.createTables();
        
        log.info("Vector database initialized");
    }
    
    /**
     * 创建表结构
     */
    createTables() {
        // 任务历史表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS task_history (
                id TEXT PRIMARY KEY,
                instruction TEXT NOT NULL,
                embedding BLOB,
                context TEXT,
                result TEXT,
                success INTEGER,
                duration_ms INTEGER,
                created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
            )
        `);
        
        // 上下文索引表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS context_index (
                task_id TEXT PRIMARY KEY,
                app TEXT,
                keywords TEXT,
                FOREIGN KEY (task_id) REFERENCES task_history(id)
            )
        `);
        
        // 创建索引
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_task_history_created 
            ON task_history(created_at DESC)
        `);
        
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_context_app 
            ON context_index(app)
        `);
    }
    
    /**
     * 存储任务
     */
    storeTask(task) {
        const stmt = this.db.prepare(`
            INSERT INTO task_history (id, instruction, embedding, context, result, success, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        stmt.run(
            id,
            task.instruction,
            task.embedding ? Buffer.from(new Float32Array(task.embedding).buffer) : null,
            task.context ? JSON.stringify(task.context) : null,
            task.result ? JSON.stringify(task.result) : null,
            task.success ? 1 : 0,
            task.durationMs || 0
        );
        
        log.info(`Task stored: ${id}`);
        return id;
    }
    
    /**
     * 索引任务上下文
     */
    indexTaskContext(taskId, context) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO context_index (task_id, app, keywords)
            VALUES (?, ?, ?)
        `);
        
        stmt.run(
            taskId,
            context.app || null,
            context.keywords ? JSON.stringify(context.keywords) : null
        );
    }
    
    /**
     * 向量搜索
     */
    searchSimilar(queryEmbedding, topK = 5) {
        log.info(`Searching similar tasks (top ${topK})`);
        
        // 获取所有任务
        const stmt = this.db.prepare(`
            SELECT id, instruction, embedding, context, result, success, duration_ms, created_at
            FROM task_history
            WHERE embedding IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 100
        `);
        
        const tasks = stmt.all();
        
        // 计算相似度
        const results = tasks.map(task => {
            const embedding = new Float32Array(task.embedding.buffer);
            const score = cosineSimilarity(queryEmbedding, embedding);
            
            return {
                id: task.id,
                instruction: task.instruction,
                context: task.context ? JSON.parse(task.context) : null,
                result: task.result ? JSON.parse(task.result) : null,
                success: task.success === 1,
                durationMs: task.duration_ms,
                createdAt: task.created_at,
                score
            };
        });
        
        // 排序并返回 topK
        results.sort((a, b) => b.score - a.score);
        
        return results.slice(0, topK);
    }
    
    /**
     * 获取上下文
     */
    getContextForInstruction(instruction, topK = 3) {
        log.info(`Getting context for: ${instruction}`);
        
        // 简单的关键词匹配
        const keywords = instruction.toLowerCase().split(/\s+/);
        
        const stmt = this.db.prepare(`
            SELECT th.* FROM task_history th
            JOIN context_index ci ON th.id = ci.task_id
            WHERE ${keywords.map(() => "ci.keywords LIKE ?").join(" OR ")}
            ORDER BY th.created_at DESC
            LIMIT ?
        `);
        
        const params = keywords.map(k => `%${k}%`);
        params.push(topK);
        
        const results = stmt.all(...params);
        
        return results.map(row => ({
            id: row.id,
            instruction: row.instruction,
            context: row.context ? JSON.parse(row.context) : null,
            success: row.success === 1
        }));
    }
    
    /**
     * 查询特定应用的任务
     */
    queryTasksByApp(app) {
        const stmt = this.db.prepare(`
            SELECT th.* FROM task_history th
            JOIN context_index ci ON th.id = ci.task_id
            WHERE ci.app = ?
            ORDER BY th.created_at DESC
        `);
        
        return stmt.all(app);
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const taskCount = this.db.prepare("SELECT COUNT(*) as count FROM task_history").get();
        const successCount = this.db.prepare("SELECT COUNT(*) as count FROM task_history WHERE success = 1").get();
        
        return {
            totalTasks: taskCount.count,
            successfulTasks: successCount.count,
            successRate: taskCount.count > 0 ? (successCount.count / taskCount.count * 100).toFixed(2) + "%" : "0%"
        };
    }
    
    /**
     * 关闭数据库
     */
    close() {
        if (this.db) {
            this.db.close();
            log.info("Vector database closed");
        }
    }
}

module.exports = { OUVVectorDatabase, cosineSimilarity };
