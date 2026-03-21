/**
 * OpenOxygen — WebSocket Real-time Channel (26w12aA)
 *
 * 双向实时通信：
 * - 任务执行流式推送
 * - 实时打断/取消
 * - 执行参数动态修改
 * - 心跳保活
 */
import type { InferenceEngine } from "../../inference/engine/index.js";
export type WSMessageType = "chat" | "chat.stream" | "chat.done" | "task.start" | "task.step" | "task.cancel" | "task.done" | "task.error" | "task.modify" | "system.status" | "ping" | "pong";
export interface WSMessage {
    type: WSMessageType;
    id: string;
    taskId?: string;
    data?: unknown;
    timestamp: number;
}
export interface ActiveTask {
    id: string;
    clientId: string;
    status: "running" | "paused" | "cancelled";
    startedAt: number;
    steps: Array<{
        action: string;
        status: string;
        result?: unknown;
    }>;
    abortController: AbortController;
}
export declare class RealtimeChannel {
    private wss;
    private clients;
    private activeTasks;
    private inferenceEngine?;
    private heartbeatInterval;
    constructor(inferenceEngine?: InferenceEngine);
    /**
     * 附加到现有 HTTP 服务器
     */
    attach(httpServer: import("node:http").Server): void;
    /**
     * 处理客户端消息
     */
    private handleMessage;
    /**
     * 处理聊天消息（流式推送）
     */
    private handleChat;
    /**
     * 取消任务
     */
    private handleCancel;
    /**
     * 修改执行参数
     */
    private handleModify;
    /**
     * 向指定客户端发送消息
     */
    private send;
    /**
     * 广播消息给所有客户端
     */
    broadcast(msg: WSMessage): void;
    /**
     * 获取活跃连接数
     */
    getClientCount(): number;
    /**
     * 获取活跃任务数
     */
    getActiveTaskCount(): number;
    /**
     * 关闭
     */
    close(): void;
}
//# sourceMappingURL=index.d.ts.map