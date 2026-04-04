/**
<<<<<<< HEAD
 * OpenOxygen �?WebSocket Real-time Channel (26w12aA)
=======
 * OpenOxygen - WebSocket Real-time Channel
>>>>>>> dev
 *
 * 双向实时通信�?
 * - 任务执行流式推�?
 * - 实时打断/取消
 * - 执行参数动态修�?
 * - 心跳保活
 */
import { WebSocketServer, WebSocket } from "ws";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("ws");
<<<<<<< HEAD
// ══════════════════════════════════════════════════════════════════════════�?
// WebSocket Server
// ══════════════════════════════════════════════════════════════════════════�?
=======
// === WebSocket Server ===
>>>>>>> dev
export class RealtimeChannel {
    wss = null;
    clients = new Map();
    tasks = new Map();
    inferenceEngine;
    heartbeatInterval = null;
    constructor(inferenceEngine) {
        this.inferenceEngine = inferenceEngine;
    }
    /**
<<<<<<< HEAD
     * 附加到现�?HTTP 服务�?
=======
     * Start WebSocket server
>>>>>>> dev
     */
    start(port) {
        if (this.wss) {
            throw new Error("WebSocket server already running");
        }
        this.wss = new WebSocketServer({ port });
        this.wss.on("connection", (ws, req) => {
            const clientId = generateId("client");
            this.clients.set(clientId, ws);
<<<<<<< HEAD
            log.info(`WebSocket client connected: ${clientId} from ${req.socket.remoteAddress}`);
            // 发送欢迎消�?
=======
            log.info(`Client connected: ${clientId} (${this.clients.size} total)`);
            // Send welcome
>>>>>>> dev
            this.send(ws, {
                type: "system.status",
                id: generateId("msg"),
                data: { status: "connected", clientId },
                timestamp: nowMs(),
            });
            // Handle messages
            ws.on("message", (data) => {
                this.handleMessage(clientId, ws, data);
            });
            // Handle close
            ws.on("close", () => {
                this.clients.delete(clientId);
<<<<<<< HEAD
                // 取消该客户端的所有活跃任�?
                for (const [taskId, task] of this.activeTasks) {
                    if (task.clientId === clientId) {
                        task.abortController.abort();
                        task.status = "cancelled";
                        this.activeTasks.delete(taskId);
                    }
                }
                log.info(`WebSocket client disconnected: ${clientId}`);
=======
                this.cleanupClientTasks(clientId);
                log.info(`Client disconnected: ${clientId}`);
>>>>>>> dev
            });
            // Handle errors
            ws.on("error", (error) => {
                log.error(`WebSocket error for ${clientId}: ${error}`);
            });
        });
<<<<<<< HEAD
        // 心跳
        this.heartbeatInterval = setInterval(() => {
            for (const [id, ws] of this.clients) {
                if (ws.readyState === WebSocket.OPEN) {
                    this.send(ws, {
                        type: "ping",
                        id: generateId("hb"),
                        timestamp: nowMs(),
                    });
                }
            }
        }, 30000);
        log.info("WebSocket realtime channel attached at /ws");
    }
    /**
     * 处理客户端消�?
     */
    async handleMessage(clientId, ws, msg) {
        switch (msg.type) {
            case "chat":
                await this.handleChat(clientId, ws, msg);
                break;
            case "task.cancel":
                this.handleCancel(msg.taskId);
                break;
            case "task.modify":
                this.handleModify(msg.taskId, msg.data);
                break;
            case "pong":
                // 心跳响应，忽�?
                break;
            default:
                this.send(ws, {
                    type: "task.error",
                    id: generateId("msg"),
                    data: { error: `Unknown message type: ${msg.type}` },
                    timestamp: nowMs(),
                });
=======
        // Start heartbeat
        this.startHeartbeat();
        log.info(`WebSocket server started on port ${port}`);
    }
    /**
     * Stop WebSocket server
     */
    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        // Cancel all active tasks
        for (const task of this.tasks.values()) {
            task.abortController.abort();
        }
        this.tasks.clear();
        // Close all connections
        for (const [clientId, ws] of this.clients.entries()) {
            ws.close();
        }
        this.clients.clear();
        // Close server
        this.wss?.close();
        this.wss = null;
        log.info("WebSocket server stopped");
    }
    /**
     * Handle incoming message
     */
    handleMessage(clientId, ws, data) {
        try {
            const message = JSON.parse(data);
            log.debug(`Received ${message.type} from ${clientId}`);
            switch (message.type) {
                case "chat":
                    this.handleChat(clientId, ws, message);
                    break;
                case "task.start":
                    this.handleTaskStart(clientId, ws, message);
                    break;
                case "task.cancel":
                    this.handleTaskCancel(clientId, message);
                    break;
                case "task.modify":
                    this.handleTaskModify(clientId, message);
                    break;
                case "ping":
                    this.send(ws, {
                        type: "pong",
                        id: generateId("msg"),
                        timestamp: nowMs(),
                    });
                    break;
                default:
                    log.warn(`Unknown message type: ${message.type}`);
            }
        }
        catch (error) {
            log.error(`Failed to handle message: ${error}`);
            this.send(ws, {
                type: "task.error",
                id: generateId("msg"),
                data: { error: "Invalid message format" },
                timestamp: nowMs(),
            });
>>>>>>> dev
        }
    }
    /**
     * Handle chat message
     */
    async handleChat(clientId, ws, message) {
        if (!this.inferenceEngine) {
            this.send(ws, {
                type: "task.error",
                id: generateId("msg"),
                data: { error: "Inference engine not available" },
                timestamp: nowMs(),
            });
            return;
        }
        const data = message.data;
        try {
            // Stream response
            for await (const chunk of this.inferenceEngine.stream({
                messages: data.messages,
            })) {
                this.send(ws, {
                    type: "chat.stream",
                    id: generateId("msg"),
                    data: { content: chunk },
                    timestamp: nowMs(),
                });
            }
            this.send(ws, {
                type: "chat.done",
                id: generateId("msg"),
                timestamp: nowMs(),
            });
        }
        catch (error) {
            this.send(ws, {
                type: "task.error",
                id: generateId("msg"),
                data: { error: String(error) },
                timestamp: nowMs(),
            });
        }
    }
    /**
     * Handle task start
     */
    async handleTaskStart(clientId, ws, message) {
        const taskId = generateId("task");
        const task = {
            id: taskId,
            clientId,
            status: "running",
            startedAt: nowMs(),
            steps: [],
            abortController: new AbortController(),
        };
<<<<<<< HEAD
        this.activeTasks.set(taskId, task);
        // 通知任务开�?
=======
        this.tasks.set(taskId, task);
>>>>>>> dev
        this.send(ws, {
            type: "task.start",
            id: generateId("msg"),
            taskId,
            data: { status: "started" },
            timestamp: nowMs(),
        });
<<<<<<< HEAD
        try {
            const chatData = msg.data;
            const messages = chatData?.messages || [
                { role: "user", content: chatData?.message || "" },
            ];
            const result = await this.inferenceEngine.infer({
                messages,
                mode: chatData?.mode || undefined,
            });
            // 检查是否已取消
            if (task.status === "cancelled")
                return;
            // 推送结�?
=======
        // TODO: Execute actual task
        // For now, simulate task execution
        this.simulateTaskExecution(task);
    }
    /**
     * Handle task cancel
     */
    handleTaskCancel(clientId, message) {
        const taskId = message.taskId;
        if (!taskId)
            return;
        const task = this.tasks.get(taskId);
        if (!task || task.clientId !== clientId)
            return;
        task.status = "cancelled";
        task.abortController.abort();
        const ws = this.clients.get(clientId);
        if (ws) {
>>>>>>> dev
            this.send(ws, {
                type: "task.done",
                id: generateId("msg"),
                taskId,
                data: { status: "cancelled" },
                timestamp: nowMs(),
            });
        }
        this.tasks.delete(taskId);
    }
    /**
     * Handle task modify
     */
    handleTaskModify(clientId, message) {
        const taskId = message.taskId;
        if (!taskId)
            return;
<<<<<<< HEAD
        const task = this.activeTasks.get(taskId);
        if (task) {
            task.abortController.abort();
            task.status = "cancelled";
            log.info(`Task cancelled: ${taskId}`);
            // 通知客户�?
            const ws = this.clients.get(task.clientId);
            if (ws) {
                this.send(ws, {
                    type: "task.done",
                    id: generateId("msg"),
                    taskId,
                    data: { cancelled: true },
                    timestamp: nowMs(),
                });
=======
        const task = this.tasks.get(taskId);
        if (!task || task.clientId !== clientId)
            return;
        // TODO: Apply modifications to running task
        log.info(`Task ${taskId} modified by ${clientId}`);
    }
    /**
     * Simulate task execution (placeholder)
     */
    async simulateTaskExecution(task) {
        const ws = this.clients.get(task.clientId);
        if (!ws)
            return;
        const steps = ["Analyzing", "Planning", "Executing", "Verifying"];
        for (const step of steps) {
            if (task.status === "cancelled")
                break;
            task.steps.push({ action: step, status: "running" });
            this.send(ws, {
                type: "task.step",
                id: generateId("msg"),
                taskId: task.id,
                data: { step, status: "running" },
                timestamp: nowMs(),
            });
            // Simulate work
            await new Promise(r => setTimeout(r, 1000));
            task.steps[task.steps.length - 1].status = "completed";
        }
        if (task.status !== "cancelled") {
            this.send(ws, {
                type: "task.done",
                id: generateId("msg"),
                taskId: task.id,
                data: { status: "completed", steps: task.steps },
                timestamp: nowMs(),
            });
        }
        this.tasks.delete(task.id);
    }
    /**
     * Send message to client
     */
    send(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    /**
     * Start heartbeat
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            for (const [clientId, ws] of this.clients.entries()) {
                if (ws.readyState === WebSocket.OPEN) {
                    this.send(ws, {
                        type: "ping",
                        id: generateId("msg"),
                        timestamp: nowMs(),
                    });
                }
            }
        }, 30000); // 30 seconds
    }
    /**
     * Cleanup tasks for disconnected client
     */
    cleanupClientTasks(clientId) {
        for (const [taskId, task] of this.tasks.entries()) {
            if (task.clientId === clientId) {
                task.abortController.abort();
                this.tasks.delete(taskId);
                log.debug(`Cleaned up task ${taskId} for disconnected client`);
>>>>>>> dev
            }
        }
    }
    /**
     * Get active tasks count
     */
<<<<<<< HEAD
    handleModify(taskId, params) {
        if (!taskId || !params)
            return;
        const task = this.activeTasks.get(taskId);
        if (task) {
            log.info(`Task modified: ${taskId}, params: ${JSON.stringify(params)}`);
            // 参数修改会在下一个步骤生�?
        }
    }
    /**
     * 向指定客户端发送消�?
     */
    send(ws, msg) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    }
    /**
     * 广播消息给所有客户端
     */
    broadcast(msg) {
        for (const [, ws] of this.clients) {
            this.send(ws, msg);
        }
    }
    /**
     * 获取活跃连接�?
=======
    getActiveTaskCount() {
        return this.tasks.size;
    }
    /**
     * Get connected clients count
>>>>>>> dev
     */
    getClientCount() {
        return this.clients.size;
    }
<<<<<<< HEAD
    /**
     * 获取活跃任务�?
     */
    getActiveTaskCount() {
        return this.activeTasks.size;
    }
    /**
     * 关闭
     */
    close() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.wss) {
            this.wss.close();
        }
        this.clients.clear();
        this.activeTasks.clear();
        log.info("WebSocket channel closed");
    }
=======
>>>>>>> dev
}
// === Factory ===
export function createRealtimeChannel(inferenceEngine) {
    return new RealtimeChannel(inferenceEngine);
}
export default RealtimeChannel;
