/**
 * OpenOxygen — Gateway Cluster Manager (26w11aE_P6)
 *
 * 进程级分布式网关：
 * - 多 Gateway 进程负载均衡
 * - 共享 SQLite 状态
 * - 会话亲和 (sticky sessions)
 * - 健康检查与自动故障转移
 * - Prometheus 兼容指标
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { fork } from "node";
import { createServer } from "node";
const log = createSubsystemLogger("cluster");
 > ;
// ═══════════════════════════════════════════════════════════════════════════
// Load Balancer
// ═══════════════════════════════════════════════════════════════════════════
class LoadBalancer {
    nodes = [];
    currentIndex = 0;
    sessionMap = new Map(); // sessionKey → nodeId
    setNodes(nodes) {
        this.nodes = nodes;
    }
}
 | null;
{
    const healthy = this.nodes.filter(n => n.status === "healthy");
    if (healthy.length === 0)
        return null;
    // Sticky session
    if (strategy === "sticky" && sessionKey) {
        const stickyNodeId = this.sessionMap.get(sessionKey);
        if (stickyNodeId) {
            const node = healthy.find(n => n.id === stickyNodeId);
            if (node)
                return node;
        }
    }
    let selected;
    if (strategy === "least-connections") {
        // 选择请求数最少的节点
        selected = healthy.reduce((min, n) => n.requestCount < min.requestCount ? n : , healthy[0]);
    }
    else {
        // Round-robin
        this.currentIndex = (this.currentIndex + 1) % healthy.length;
        selected = healthy[this.currentIndex];
    }
    // 记录 sticky session
    if (sessionKey) {
        this.sessionMap.set(sessionKey, selected.id);
    }
    return selected;
}
clearSession(sessionKey);
{
    this.sessionMap.delete(sessionKey);
}
// ═══════════════════════════════════════════════════════════════════════════
// Health Checker
// ═══════════════════════════════════════════════════════════════════════════
class HealthChecker {
    failureCounts = new Map();
    async check(node, timeoutMs) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(`http://127.0.0.1:${node.port}/health`, {
                signal, : .signal,
            });
            clearTimeout(timer);
            if (response.ok) {
                this.failureCounts.set(node.id, 0);
                return true;
            }
            return false;
        }
        catch {
            const failures = (this.failureCounts.get(node.id) || 0) + 1;
            this.failureCounts.set(node.id, failures);
            return false;
        }
    }
    getFailureCount(nodeId) {
        return this.failureCounts.get(nodeId) || 0;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// Cluster Manager
// ═══════════════════════════════════════════════════════════════════════════
export class ClusterManager {
    config;
    nodes = [];
    balancer;
    healthChecker;
}
typeof setInterval >  | null;
null;
startTime;
totalRequests = 0;
totalErrors = 0;
constructor(config ?  : );
{
    this.config = {
        workerCount, workerCount
    } || 3,
        basePort?.basePort || 4801,
        healthCheckIntervalMs?.healthCheckIntervalMs || 10000,
        healthCheckTimeoutMs?.healthCheckTimeoutMs || 3000,
        maxFailures?.maxFailures || 3,
        stickySessionHeader?.stickySessionHeader || "x-session-id",
        metricsPort?.metricsPort || 9090,
    ;
}
;
this.balancer = new LoadBalancer();
this.healthChecker = new HealthChecker();
this.startTime = nowMs();
/**
 * 启动集群
 */
async;
start();
{
    log.info(`Starting cluster with ${this.config.workerCount} workers`);
    for (let i = 0; i < this.config.workerCount; i++) {
        const port = this.config.basePort + i;
        const node = await this.spawnWorker(port);
        this.nodes.push(node);
    }
    this.balancer.setNodes(this.nodes);
    this.startHealthChecks();
    await this.startLoadBalancerProxy();
    log.info(`Cluster started: ${this.nodes.length} nodes on ports ${this.config.basePort}-${this.config.basePort + this.config.workerCount - 1}`);
}
/**
 * 停止集群
 */
async;
stop();
{
    if (this.healthInterval) {
        clearInterval(this.healthInterval);
        this.healthInterval = null;
    }
    for (const node of this.nodes) {
        if (node.process) {
            node.process.kill("SIGTERM");
            node.status = "stopped";
        }
    }
    log.info("Cluster stopped");
}
/**
 * 获取集群指标
 */
getMetrics();
{
    const activeNodes = this.nodes.filter(n => n.status === "healthy").length;
    const uptime = (nowMs() - this.startTime) / 1000;
    const rps = uptime > 0 ? this.totalRequests / uptime : ;
    const avgLatency = this.nodes.length > 0
        ? this.nodes.reduce((sum, n) => sum + n.avgLatencyMs, 0) / this.nodes.length
        :
    ;
    return {
        totalRequests, : .totalRequests,
        totalErrors, : .totalErrors,
        activeNodes,
        totalNodes, : .nodes.length,
        avgLatencyMs, : .round(avgLatency),
        requestsPerSecond, : .round(rps * 100) / 100,
        uptime, : .round(uptime),
        nodeMetrics, : .nodes.map(n => ({
            id, : .id,
            port, : .port,
            status, : .status,
            requests, : .requestCount,
            avgLatency, : .round(n.avgLatencyMs),
        })),
    };
}
/**
 * Prometheus 格式指标
 */
getPrometheusMetrics();
{
    const m = this.getMetrics();
    const lines = [
        "# HELP openoxygen_cluster_requests_total Total requests",
        "# TYPE openoxygen_cluster_requests_total counter",
        `openoxygen_cluster_requests_total ${m.totalRequests}`,
        "",
        "# HELP openoxygen_cluster_errors_total Total errors",
        "# TYPE openoxygen_cluster_errors_total counter",
        `openoxygen_cluster_errors_total ${m.totalErrors}`,
        "",
        "# HELP openoxygen_cluster_active_nodes Active nodes",
        "# TYPE openoxygen_cluster_active_nodes gauge",
        `openoxygen_cluster_active_nodes ${m.activeNodes}`,
        "",
        "# HELP openoxygen_cluster_avg_latency_ms Average latency",
        "# TYPE openoxygen_cluster_avg_latency_ms gauge",
        `openoxygen_cluster_avg_latency_ms ${m.avgLatencyMs}`,
        "",
        "# HELP openoxygen_cluster_rps Requests per second",
        "# TYPE openoxygen_cluster_rps gauge",
        `openoxygen_cluster_rps ${m.requestsPerSecond}`,
    ];
    for (const node of m.nodeMetrics) {
        lines.push(`openoxygen_node_requests{node="${node.id}",port="${node.port}"} ${node.requests}`);
        lines.push(`openoxygen_node_latency{node="${node.id}",port="${node.port}"} ${node.avgLatency}`);
    }
    return lines.join("\n");
}
async;
spawnWorker(port);
{
    const node = {
        id() { },
        pid,
        port,
        status: "starting",
        lastHealthCheck() { },
        requestCount,
        avgLatencyMs,
    };
    // 在实际部署中，这里会 fork 子进程运行 Gateway
    // 当前实现为模拟节点（单进程多端口）
    log.info(`Worker node ${node.id} assigned to port ${port}`);
    node.status = "healthy";
    return node;
}
startHealthChecks();
{
    this.healthInterval = setInterval(async () => {
        for (const node of this.nodes) {
            if (node.status === "stopped")
                continue;
            const healthy = await this.healthChecker.check(node, this.config.healthCheckTimeoutMs);
            const failures = this.healthChecker.getFailureCount(node.id);
            if (!healthy && failures >= this.config.maxFailures) {
                log.error(`Node ${node.id} (port ${node.port}) marked unhealthy after ${failures} failures`);
                node.status = "unhealthy";
            }
            else if (healthy) {
                node.status = "healthy";
            }
            node.lastHealthCheck = nowMs();
        }
        this.balancer.setNodes(this.nodes);
    }, this.config.healthCheckIntervalMs);
}
async;
startLoadBalancerProxy();
{
    // 指标端点
    const metricsServer = createServer((req, res) => {
        if (req.url === "/metrics") {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(this.getPrometheusMetrics());
        }
        else if (req.url === "/cluster/status") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(this.getMetrics()));
        }
        else {
            res.writeHead(404);
            res.end("Not found");
        }
    });
    metricsServer.listen(this.config.metricsPort, "127.0.0.1", () => {
        log.info(`Metrics endpoint on :${this.config.metricsPort} (/metrics, /cluster/status)`);
    });
}
