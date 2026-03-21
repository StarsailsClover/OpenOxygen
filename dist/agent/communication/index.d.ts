/**
 * OpenOxygen — Multi-Agent Communication Protocol (26w15a Phase 2)
 *
 * 多 Agent 通信协议：支持多个 Agent 实例协同工作
 *
 * 功能：
 *   - Agent 注册与发现
 *   - 任务委派 API（"Agent B，帮我检查这个网页"）
 *   - 结果聚合（多个 Agent 的结果合并）
 *   - 负载均衡（任务分配给空闲 Agent）
 *   - WebSocket 广播通道
 *   - 消息 ACK 机制
 */
import { WebSocketServer } from "ws";
import type { ToolResult, ExecutionMode } from "../../types/index.js";
import type { TaskStrategy } from "../../execution/unified/index.js";
export type AgentRole = "coordinator" | "worker" | "specialist";
export type AgentStatus = "idle" | "busy" | "offline";
export type AgentInfo = {
    id: string;
    name: string;
    role: AgentRole;
    status: AgentStatus;
    capabilities: string[];
    currentTask?: string;
    lastHeartbeat: number;
    metadata?: Record<string, unknown>;
};
export type AgentMessage = {
    type: "register" | "heartbeat" | "delegate" | "result" | "broadcast" | "ack";
    from: string;
    to?: string;
    taskId?: string;
    payload: unknown;
    timestamp: number;
    ackRequired?: boolean;
    ackId?: string;
};
export type AgentDelegatedResult = ToolResult & {
    mode: ExecutionMode;
    strategy: TaskStrategy;
    durationMs: number;
    logs: string[];
};
export type DelegatedTask = {
    id: string;
    instruction: string;
    mode?: ExecutionMode;
    fromAgent: string;
    toAgent: string;
    status: "pending" | "running" | "completed" | "failed";
    result?: AgentDelegatedResult;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    retryCount: number;
    maxRetries: number;
};
export type AgentRegistry = {
    agents: Map<string, AgentInfo>;
    tasks: Map<string, DelegatedTask>;
    wss?: WebSocketServer;
};
declare const registry: AgentRegistry;
export declare function registerAgent(id: string, name: string, role?: AgentRole, capabilities?: string[]): AgentInfo;
export declare function unregisterAgent(id: string): void;
export declare function getAgent(id: string): AgentInfo | null;
export declare function listAgents(): AgentInfo[];
export declare function listAvailableAgents(): AgentInfo[];
export declare function updateHeartbeat(agentId: string): void;
export declare function checkStaleAgents(timeoutMs?: number): string[];
export declare function delegateTask(instruction: string, fromAgentId: string, toAgentId: string | "auto", options?: {
    mode?: ExecutionMode;
    maxRetries?: number;
}): DelegatedTask;
export declare function getTask(taskId: string): DelegatedTask | null;
export declare function updateTaskStatus(taskId: string, status: DelegatedTask["status"], result?: AgentDelegatedResult): void;
export declare function executeDelegatedTask(taskId: string): Promise<void>;
export type AggregatedResult = {
    success: boolean;
    results: AgentDelegatedResult[];
    successCount: number;
    failCount: number;
    avgDuration: number;
    errors: string[];
};
export declare function aggregateResults(taskIds: string[]): AggregatedResult;
export declare function initializeWebSocketServer(port?: number): WebSocketServer;
export declare class AgentClient {
    private ws;
    private agentId;
    private coordinatorUrl;
    private pendingAcks;
    constructor(agentId: string, coordinatorUrl?: string);
    connect(): Promise<void>;
    register(name: string, role: AgentRole, capabilities: string[]): Promise<void>;
    sendHeartbeat(): void;
    disconnect(): void;
}
export declare function shutdownAgentSystem(): void;
export { registry };
//# sourceMappingURL=index.d.ts.map