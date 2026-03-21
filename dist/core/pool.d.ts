/**
 * OpenOxygen — Connection Pool (26w12aA P4)
 *
 * HTTP 连接池：复用连接到 Ollama/LLM 后端
 */
import { Agent } from "node:http";
/**
 * 获取共享的 keep-alive HTTP Agent
 */
export declare function getHttpAgent(): Agent;
/**
 * 获取连接池状态
 */
export declare function getPoolStats(): {
    totalSockets: number;
    freeSockets: number;
    pendingRequests: number;
};
/**
 * 内存使用监控
 */
export declare function getMemoryUsage(): {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
    heapPercent: number;
};
export declare function startMemoryMonitor(intervalMs?: number): void;
export declare function stopMemoryMonitor(): void;
//# sourceMappingURL=pool.d.ts.map