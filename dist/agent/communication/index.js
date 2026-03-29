/**
 * OpenOxygen �?Multi-Agent Communication Protocol (26w15a Phase 2)
 *
 * �?Agent 通信协议：支持多�?Agent 实例协同工作
 *
 * 功能�?
 *   - Agent 注册与发�?
 *   - 任务委派 API�?Agent B，帮我检查这个网�?�?
 *   - 结果聚合（多�?Agent 的结果合并）
 *   - 负载均衡（任务分配给空闲 Agent�?
 *   - WebSocket 广播通道
 *   - 消息 ACK 机制
 */
import { WebSocket, WebSocketServer } from "ws";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("agent/communication");
// ─── Agent Registry ─────────────────────────────────────────────────────────
const registry = {
    agents: new Map(),
    tasks: new Map(),
};
// ─── Agent Registration ─────────────────────────────────────────────────────
export function registerAgent(id, name, role = "worker", capabilities = ["terminal", "gui"]) {
    const agent = {
        id,
        name,
        role,
        status: "idle",
        capabilities,
        lastHeartbeat: nowMs(),
    };
    registry.agents.set(id, agent);
    log.info(`Agent registered: ${id} (${name}, ${role})`);
    return agent;
}
export function unregisterAgent(id) {
    registry.agents.delete(id);
    log.info(`Agent unregistered: ${id}`);
}
export function getAgent(id) {
    return registry.agents.get(id) || null;
}
export function listAgents() {
    return Array.from(registry.agents.values());
}
export function listAvailableAgents() {
    return listAgents().filter((a) => a.status === "idle" && nowMs() - a.lastHeartbeat < 30000);
}
// ─── Heartbeat Management ───────────────────────────────────────────────────
export function updateHeartbeat(agentId) {
    const agent = registry.agents.get(agentId);
    if (agent) {
        agent.lastHeartbeat = nowMs();
        if (agent.status === "offline") {
            agent.status = "idle";
            log.info(`Agent back online: ${agentId}`);
        }
    }
}
export function checkStaleAgents(timeoutMs = 60000) {
    const stale = [];
    const now = nowMs();
    for (const [id, agent] of registry.agents) {
        if (now - agent.lastHeartbeat > timeoutMs) {
            agent.status = "offline";
            stale.push(id);
        }
    }
    return stale;
}
// ─── Task Delegation ────────────────────────────────────────────────────────
export function delegateTask(instruction, fromAgentId, toAgentId, options) {
    // Auto-select agent if "auto"
    let targetAgentId = typeof toAgentId === "string" && toAgentId !== "auto" ? toAgentId : "";
    if (toAgentId === "auto") {
        const available = listAvailableAgents();
        if (available.length === 0) {
            throw new Error("No available agents for delegation");
        }
        targetAgentId = available[0].id;
    }
    const task = {
        id: generateId("task"),
        instruction,
        mode: options?.mode,
        fromAgent: fromAgentId,
        toAgent: targetAgentId,
        status: "pending",
        createdAt: nowMs(),
        retryCount: 0,
        maxRetries: options?.maxRetries ?? 1,
    };
    registry.tasks.set(task.id, task);
    // Update agent status
    const targetAgent = registry.agents.get(targetAgentId);
    if (targetAgent) {
        targetAgent.status = "busy";
        targetAgent.currentTask = task.id;
    }
    log.info(`Task delegated: ${task.id} from ${fromAgentId} to ${targetAgentId}`);
    return task;
}
export function getTask(taskId) {
    return registry.tasks.get(taskId) || null;
}
export function updateTaskStatus(taskId, status, result) {
    const task = registry.tasks.get(taskId);
    if (!task)
        return;
    task.status = status;
    if (status === "running" && !task.startedAt) {
        task.startedAt = nowMs();
    }
    if (status === "completed" || status === "failed") {
        task.completedAt = nowMs();
        task.result = result;
        // Free agent
        const agent = registry.agents.get(task.toAgent);
        if (agent) {
            agent.status = "idle";
            agent.currentTask = undefined;
        }
    }
    log.info(`Task ${taskId} status: ${status}`);
}
// ─── Task Execution (for worker agents) ─────────────────────────────────────
export async function executeDelegatedTask(taskId) {
    const task = registry.tasks.get(taskId);
    if (!task) {
        throw new Error(`Task ${taskId} not found`);
    }
    updateTaskStatus(taskId, "running");
    try {
        // Import dynamically to avoid circular dependency
        const { executeWithStrategy } = await import("../../execution/unified/index.js");
        const result = await executeWithStrategy(task.instruction, task.mode
            ? { mode: task.mode, confidence: 1, reason: "Delegated task" }
            : undefined);
        updateTaskStatus(taskId, result.success ? "completed" : "failed", result);
    }
    catch (e) {
        updateTaskStatus(taskId, "failed", {
            success: false,
            error: e.message,
            durationMs: 0,
            mode: task.mode || "hybrid",
            strategy: { mode: task.mode || "hybrid", confidence: 0, reason: "Error" },
            logs: [],
        });
    }
}
export function aggregateResults(taskIds) {
    const results = [];
    const errors = [];
    let successCount = 0;
    let totalDuration = 0;
    for (const taskId of taskIds) {
        const task = registry.tasks.get(taskId);
        if (task && task.result) {
            results.push(task.result);
            if (task.result.success) {
                successCount++;
            }
            else if (task.result.error) {
                errors.push(task.result.error);
            }
            totalDuration += task.result.durationMs;
        }
    }
    const total = results.length;
    return {
        success: successCount === total,
        results,
        successCount,
        failCount: total - successCount,
        avgDuration: total > 0 ? totalDuration / total : 0,
        errors,
    };
}
// ─── WebSocket Communication ────────────────────────────────────────────────
export function initializeWebSocketServer(port = 4810) {
    const wss = new WebSocketServer({ port });
    registry.wss = wss;
    wss.on("connection", (ws, req) => {
        log.info(`Agent connected: ${req.socket.remoteAddress}`);
        ws.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                handleMessage(ws, msg);
            }
            catch (e) {
                log.error(`Invalid message: ${e}`);
            }
        });
        ws.on("close", () => {
            log.info("Agent disconnected");
        });
    });
    log.info(`Agent WebSocket server started on port ${port}`);
    return wss;
}
function handleMessage(ws, msg) {
    // Send ACK if required
    if (msg.ackRequired && msg.ackId) {
        sendAck(ws, msg.ackId);
    }
    switch (msg.type) {
        case "register":
            handleRegister(ws, msg);
            break;
        case "heartbeat":
            handleHeartbeat(msg);
            break;
        case "delegate":
            handleDelegate(ws, msg);
            break;
        case "result":
            handleResult(msg);
            break;
        case "broadcast":
            handleBroadcast(ws, msg);
            break;
    }
}
function sendAck(ws, ackId) {
    ws.send(JSON.stringify({
        type: "ack",
        ackId,
        timestamp: nowMs(),
    }));
}
function handleRegister(ws, msg) {
    const { id, name, role, capabilities } = msg.payload;
    registerAgent(id, name, role, capabilities);
    // Send confirmation
    ws.send(JSON.stringify({
        type: "ack",
        payload: { registered: true, agentId: id },
        timestamp: nowMs(),
    }));
}
function handleHeartbeat(msg) {
    updateHeartbeat(msg.from);
}
function handleDelegate(ws, msg) {
    const { instruction, mode, maxRetries } = msg.payload;
    try {
        const task = delegateTask(instruction, msg.from, msg.to || "auto", {
            mode,
            maxRetries,
        });
        // Send confirmation
        ws.send(JSON.stringify({
            type: "ack",
            taskId: task.id,
            assignedTo: task.toAgent,
            timestamp: nowMs(),
        }));
    }
    catch (e) {
        ws.send(JSON.stringify({
            type: "error",
            error: e.message,
            timestamp: nowMs(),
        }));
    }
}
function handleResult(msg) {
    const { taskId, result } = msg.payload;
    updateTaskStatus(taskId, result.success ? "completed" : "failed", result);
}
function handleBroadcast(ws, msg) {
    if (!registry.wss)
        return;
    const data = JSON.stringify({
        type: "broadcast",
        from: msg.from,
        payload: msg.payload,
        timestamp: nowMs(),
    });
    // Broadcast to all connected clients except sender
    registry.wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}
// ─── Client API (for agents connecting to coordinator) ────────────────────────
export class AgentClient {
    ws = null;
    agentId;
    coordinatorUrl;
    pendingAcks = new Map();
    constructor(agentId, coordinatorUrl = "ws://127.0.0.1:4810") {
        this.agentId = agentId;
        this.coordinatorUrl = coordinatorUrl;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.coordinatorUrl);
            this.ws.on("open", () => {
                log.info(`Connected to coordinator: ${this.coordinatorUrl}`);
                resolve();
            });
            this.ws.on("error", reject);
            this.ws.on("message", (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.type === "ack" && msg.ackId) {
                    const pending = this.pendingAcks.get(msg.ackId);
                    if (pending) {
                        this.pendingAcks.delete(msg.ackId);
                        pending.resolve();
                    }
                }
            });
        });
    }
    async register(name, role, capabilities) {
        if (!this.ws)
            throw new Error("Not connected");
        const ackId = generateId("ack");
        this.ws.send(JSON.stringify({
            type: "register",
            from: this.agentId,
            payload: { id: this.agentId, name, role, capabilities },
            ackId,
            timestamp: nowMs(),
        }));
        // Wait for ACK
        await new Promise((resolve, reject) => {
            this.pendingAcks.set(ackId, { resolve, reject });
            setTimeout(() => {
                if (this.pendingAcks.has(ackId)) {
                    this.pendingAcks.delete(ackId);
                    reject(new Error("Registration timeout"));
                }
            }, 5000);
        });
    }
    sendHeartbeat() {
        if (!this.ws)
            return;
        this.ws.send(JSON.stringify({
            type: "heartbeat",
            from: this.agentId,
            timestamp: nowMs(),
        }));
    }
    disconnect() {
        this.ws?.close();
        this.ws = null;
    }
}
// ─── Cleanup ────────────────────────────────────────────────────────────────
export function shutdownAgentSystem() {
    registry.wss?.close();
    registry.agents.clear();
    registry.tasks.clear();
    log.info("Agent system shut down");
}
// Export registry for debugging
export { registry };
