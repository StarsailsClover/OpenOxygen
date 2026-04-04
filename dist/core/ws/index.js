/**
 * OpenOxygen - WebSocket Real-time Channel
 *
 * 双向实时通信：
 * - 任务执行流式推送
 * - 实时打断/取消
 * - 执行参数动态修改
 * - 心跳保活
 */
import { WebSocketServer, WebSocket } from "ws";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("ws");
// === WebSocket Server ===
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
     * Start WebSocket server
     */
    start(port) {
        if (this.wss) {
            throw new Error("WebSocket server already running");
        }
        this.wss = new WebSocketServer({ port });
        this.wss.on("connection", (ws, req) => {
            const clientId = generateId("client");
            this.clients.set(clientId, ws);
            log.info(`Client connected: ${clientId} (${this.clients.size} total)`);
            // Send welcome
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
                this.cleanupClientTasks(clientId);
                log.info(`Client disconnected: ${clientId}`);
            });
            // Handle errors
            ws.on("error", (error) => {
                log.error(`WebSocket error for ${clientId}: ${error}`);
            });
        });
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
        this.tasks.set(taskId, task);
        this.send(ws, {
            type: "task.start",
            id: generateId("msg"),
            taskId,
            data: { status: "started" },
            timestamp: nowMs(),
        });
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
            }
        }
    }
    /**
     * Get active tasks count
     */
    getActiveTaskCount() {
        return this.tasks.size;
    }
    /**
     * Get connected clients count
     */
    getClientCount() {
        return this.clients.size;
    }
}
// === Factory ===
export function createRealtimeChannel(inferenceEngine) {
    return new RealtimeChannel(inferenceEngine);
}
export default RealtimeChannel;
