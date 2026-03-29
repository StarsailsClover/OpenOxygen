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

import { WebSocket, WebSocketServer } from "ws";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type { ToolResult, ExecutionMode } from "../../types/index.js";
import type { TaskStrategy } from "../../execution/unified/index.js";

const log = createSubsystemLogger("agent/communication");

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentRole = "coordinator" | "worker" | "specialist";
export type AgentStatus = "idle" | "busy" | "offline";

export type AgentInfo = {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  capabilities: string[]; // ["terminal", "browser", "gui", "vlm"]
  currentTask?: string;
  lastHeartbeat: number;
  metadata?: Record<string, unknown>;
};

export type AgentMessage = {
  type: "register" | "heartbeat" | "delegate" | "result" | "broadcast" | "ack";
  from: string; // Agent ID
  to?: string; // Target Agent ID or "broadcast"
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

// ─── Agent Registry ─────────────────────────────────────────────────────────

const registry: AgentRegistry = {
  agents: new Map(),
  tasks: new Map(),
};

// ─── Agent Registration ─────────────────────────────────────────────────────

export function registerAgent(
  id: string,
  name: string,
  role: AgentRole = "worker",
  capabilities: string[] = ["terminal", "gui"],
): AgentInfo {
  const agent: AgentInfo = {
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

export function unregisterAgent(id: string): void {
  registry.agents.delete(id);
  log.info(`Agent unregistered: ${id}`);
}

export function getAgent(id: string): AgentInfo | null {
  return registry.agents.get(id) || null;
}

export function listAgents(): AgentInfo[] {
  return Array.from(registry.agents.values());
}

export function listAvailableAgents(): AgentInfo[] {
  return listAgents().filter(
    (a) => a.status === "idle" && nowMs() - a.lastHeartbeat < 30000,
  );
}

// ─── Heartbeat Management ───────────────────────────────────────────────────

export function updateHeartbeat(agentId: string): void {
  const agent = registry.agents.get(agentId);
  if (agent) {
    agent.lastHeartbeat = nowMs();
    if (agent.status === "offline") {
      agent.status = "idle";
      log.info(`Agent back online: ${agentId}`);
    }
  }
}

export function checkStaleAgents(timeoutMs: number = 60000): string[] {
  const stale: string[] = [];
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

export function delegateTask(
  instruction: string,
  fromAgentId: string,
  toAgentId: string | "auto",
  options?: {
    mode?: ExecutionMode;
    maxRetries?: number;
  },
): DelegatedTask {
  // Auto-select agent if "auto"
  let targetAgentId: string =
    typeof toAgentId === "string" && toAgentId !== "auto" ? toAgentId : "";
  if (toAgentId === "auto") {
    const available = listAvailableAgents();
    if (available.length === 0) {
      throw new Error("No available agents for delegation");
    }
    targetAgentId = available[0]!.id;
  }

  const task: DelegatedTask = {
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

  log.info(
    `Task delegated: ${task.id} from ${fromAgentId} to ${targetAgentId}`,
  );
  return task;
}

export function getTask(taskId: string): DelegatedTask | null {
  return registry.tasks.get(taskId) || null;
}

export function updateTaskStatus(
  taskId: string,
  status: DelegatedTask["status"],
  result?: AgentDelegatedResult,
): void {
  const task = registry.tasks.get(taskId);
  if (!task) return;

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

export async function executeDelegatedTask(taskId: string): Promise<void> {
  const task = registry.tasks.get(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  updateTaskStatus(taskId, "running");

  try {
    // Import dynamically to avoid circular dependency
    const { executeWithStrategy } =
      await import("../../execution/unified/index.js");
    const result = await executeWithStrategy(
      task.instruction,
      task.mode
        ? { mode: task.mode, confidence: 1, reason: "Delegated task" }
        : undefined,
    );

    updateTaskStatus(taskId, result.success ? "completed" : "failed", result);
  } catch (e: any) {
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

// ─── Result Aggregation ─────────────────────────────────────────────────────

export type AggregatedResult = {
  success: boolean;
  results: AgentDelegatedResult[];
  successCount: number;
  failCount: number;
  avgDuration: number;
  errors: string[];
};

export function aggregateResults(taskIds: string[]): AggregatedResult {
  const results: AgentDelegatedResult[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let totalDuration = 0;

  for (const taskId of taskIds) {
    const task = registry.tasks.get(taskId);
    if (task && task.result) {
      results.push(task.result);
      if (task.result.success) {
        successCount++;
      } else if (task.result.error) {
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

export function initializeWebSocketServer(
  port: number = 4810,
): WebSocketServer {
  const wss = new WebSocketServer({ port });
  registry.wss = wss;

  wss.on("connection", (ws, req) => {
    log.info(`Agent connected: ${req.socket.remoteAddress}`);

    ws.on("message", (data: Buffer) => {
      try {
        const msg: AgentMessage = JSON.parse(data.toString());
        handleMessage(ws, msg);
      } catch (e) {
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

function handleMessage(ws: WebSocket, msg: AgentMessage): void {
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

function sendAck(ws: WebSocket, ackId: string): void {
  ws.send(
    JSON.stringify({
      type: "ack",
      ackId,
      timestamp: nowMs(),
    }),
  );
}

function handleRegister(ws: WebSocket, msg: AgentMessage): void {
  const { id, name, role, capabilities } = msg.payload as {
    id: string;
    name: string;
    role: AgentRole;
    capabilities: string[];
  };

  registerAgent(id, name, role, capabilities);

  // Send confirmation
  ws.send(
    JSON.stringify({
      type: "ack",
      payload: { registered: true, agentId: id },
      timestamp: nowMs(),
    }),
  );
}

function handleHeartbeat(msg: AgentMessage): void {
  updateHeartbeat(msg.from);
}

function handleDelegate(ws: WebSocket, msg: AgentMessage): void {
  const { instruction, mode, maxRetries } = msg.payload as {
    instruction: string;
    mode?: ExecutionMode;
    maxRetries?: number;
  };

  try {
    const task = delegateTask(instruction, msg.from, msg.to || "auto", {
      mode,
      maxRetries,
    });

    // Send confirmation
    ws.send(
      JSON.stringify({
        type: "ack",
        taskId: task.id,
        assignedTo: task.toAgent,
        timestamp: nowMs(),
      }),
    );
  } catch (e: any) {
    ws.send(
      JSON.stringify({
        type: "error",
        error: e.message,
        timestamp: nowMs(),
      }),
    );
  }
}

function handleResult(msg: AgentMessage): void {
  const { taskId, result } = msg.payload as {
    taskId: string;
    result: AgentDelegatedResult;
  };

  updateTaskStatus(taskId, result.success ? "completed" : "failed", result);
}

function handleBroadcast(ws: WebSocket, msg: AgentMessage): void {
  if (!registry.wss) return;

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
  private ws: WebSocket | null = null;
  private agentId: string;
  private coordinatorUrl: string;
  private pendingAcks = new Map<
    string,
    { resolve: () => void; reject: (e: Error) => void }
  >();

  constructor(agentId: string, coordinatorUrl: string = "ws://127.0.0.1:4810") {
    this.agentId = agentId;
    this.coordinatorUrl = coordinatorUrl;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.coordinatorUrl);

      this.ws.on("open", () => {
        log.info(`Connected to coordinator: ${this.coordinatorUrl}`);
        resolve();
      });

      this.ws.on("error", reject);

      this.ws.on("message", (data: Buffer) => {
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

  async register(
    name: string,
    role: AgentRole,
    capabilities: string[],
  ): Promise<void> {
    if (!this.ws) throw new Error("Not connected");

    const ackId = generateId("ack");

    this.ws.send(
      JSON.stringify({
        type: "register",
        from: this.agentId,
        payload: { id: this.agentId, name, role, capabilities },
        ackId,
        timestamp: nowMs(),
      }),
    );

    // Wait for ACK
    await new Promise<void>((resolve, reject) => {
      this.pendingAcks.set(ackId, { resolve, reject });
      setTimeout(() => {
        if (this.pendingAcks.has(ackId)) {
          this.pendingAcks.delete(ackId);
          reject(new Error("Registration timeout"));
        }
      }, 5000);
    });
  }

  sendHeartbeat(): void {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "heartbeat",
        from: this.agentId,
        timestamp: nowMs(),
      }),
    );
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

export function shutdownAgentSystem(): void {
  registry.wss?.close();
  registry.agents.clear();
  registry.tasks.clear();
  log.info("Agent system shut down");
}

// Export registry for debugging
export { registry };
