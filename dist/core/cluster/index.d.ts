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
import { type ChildProcess } from "node:child_process";
export interface ClusterNode {
    id: string;
    pid: number;
    port: number;
    status: "starting" | "healthy" | "unhealthy" | "stopped";
    lastHealthCheck: number;
    requestCount: number;
    avgLatencyMs: number;
    process?: ChildProcess;
}
export interface ClusterConfig {
    workerCount: number;
    basePort: number;
    healthCheckIntervalMs: number;
    healthCheckTimeoutMs: number;
    maxFailures: number;
    stickySessionHeader: string;
    metricsPort: number;
}
export interface ClusterMetrics {
    totalRequests: number;
    totalErrors: number;
    activeNodes: number;
    totalNodes: number;
    avgLatencyMs: number;
    requestsPerSecond: number;
    uptime: number;
    nodeMetrics: Array<{
        id: string;
        port: number;
        status: string;
        requests: number;
        avgLatency: number;
    }>;
}
export declare class ClusterManager {
    private config;
    private nodes;
    private balancer;
    private healthChecker;
    private healthInterval;
    private startTime;
    private totalRequests;
    private totalErrors;
    constructor(config?: Partial<ClusterConfig>);
    /**
     * 启动集群
     */
    start(): Promise<void>;
    /**
     * 停止集群
     */
    stop(): Promise<void>;
    /**
     * 获取集群指标
     */
    getMetrics(): ClusterMetrics;
    /**
     * Prometheus 格式指标
     */
    getPrometheusMetrics(): string;
    private spawnWorker;
    private startHealthChecks;
    private startLoadBalancerProxy;
}
//# sourceMappingURL=index.d.ts.map