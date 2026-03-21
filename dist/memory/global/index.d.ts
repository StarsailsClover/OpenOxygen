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
    since?: number;
    limit?: number;
};
export declare class GlobalMemory {
    private db;
    private dbPath;
    constructor(stateDir?: string);
    setPreference(key: string, value: unknown): void;
    getPreference<T>(key: string, defaultValue?: T): T | undefined;
    getAllPreferences(): Record<string, unknown>;
    deletePreference(key: string): void;
    recordTask(task: Omit<TaskRecord, "id" | "createdAt">): TaskRecord;
    getTask(id: string): TaskRecord | null;
    queryTasks(query: ContextQuery): TaskRecord[];
    getRecentTasks(limit?: number): TaskRecord[];
    getTasksByApp(app: string, limit?: number): TaskRecord[];
    /**
     * 为新任务自动注入相关上下文
     */
    injectContext(instruction: string): string;
    private extractKeywords;
    getStats(): {
        totalTasks: number;
        successRate: number;
        avgDuration: number;
        byMode: Record<string, number>;
    };
    close(): void;
    vacuum(): void;
}
export declare function getGlobalMemory(stateDir?: string): GlobalMemory;
export declare function resetGlobalMemory(): void;
//# sourceMappingURL=index.d.ts.map