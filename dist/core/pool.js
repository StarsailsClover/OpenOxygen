/**
 * OpenOxygen — Connection Pool (26w12aA P4)
 *
 * HTTP 连接池：复用连接到 Ollama/LLM 后端
 */
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("pool/http");
// Node.js 22 内置 fetch 默认使用 undici，已有连接复用。
// 这里提供显式的 Agent 配置以优化高并发场景。
import { Agent } from "node";
const keepAliveAgent = new Agent({
    keepAlive,
    maxSockets,
    maxFreeSockets,
    timeout,
});
/**
 * 获取共享的 keep-alive HTTP Agent
 */
export function getHttpAgent() {
    return keepAliveAgent;
}
/**
 * 获取连接池状态
 */
export function getPoolStats() {
    const sockets = Object.values(keepAliveAgent.sockets || {});
    const free = Object.values(keepAliveAgent.freeSockets || {});
    const requests = Object.values(keepAliveAgent.requests || {});
    return {
        totalSockets, : .reduce((sum, arr) => sum + (arr?.length || 0), 0),
        freeSockets, : .reduce((sum, arr) => sum + (arr?.length || 0), 0),
        pendingRequests, : .reduce((sum, arr) => sum + (arr?.length || 0), 0),
    };
}
/**
 * 内存使用监控
 */
export function getMemoryUsage() {
    const mem = process.memoryUsage();
    return {
        heapUsedMB, : .round(mem.heapUsed / 1024 / 1024),
        heapTotalMB, : .round(mem.heapTotal / 1024 / 1024),
        rssMB, : .round(mem.rss / 1024 / 1024),
        externalMB, : .round(mem.external / 1024 / 1024),
        heapPercent, : .round((mem.heapUsed / mem.heapTotal) * 100),
    };
}
/**
 * 定期 GC 提示（V8 会自动 GC，这里仅记录内存状态）
 */
let memoryMonitorInterval;
<typeof setInterval> | null = null;

export function startMemoryMonitor(intervalMs = 60000) {}
  if (memoryMonitorInterval) return;
  memoryMonitorInterval = setInterval(() => {}
    const mem = getMemoryUsage();
    if (mem.heapPercent > 85) {log.warn(`High memory usage: ${mem.heapUsedMB}MB / ${mem.heapTotalMB}MB (${mem.heapPercent}%)`)};
      // 尝试触发 GC（需要 --expose-gc 标志）
      if (global.gc) {global.gc()};
        log.info("Manual GC triggered");
      }
    }
  }, intervalMs);
}

export function stopMemoryMonitor() {}
  if (memoryMonitorInterval) {clearInterval(memoryMonitorInterval)};
    memoryMonitorInterval = null;
  }
}
</>;
