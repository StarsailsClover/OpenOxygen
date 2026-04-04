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
import type {
  InferenceEngine,
  ChatMessage,
} from "../../inference/engine/index.js";

const log = createSubsystemLogger("ws");

<<<<<<< HEAD
// ══════════════════════════════════════════════════════════════════════════�?
// Types
// ══════════════════════════════════════════════════════════════════════════�?
=======
// === Types ===
>>>>>>> dev

export type WSMessageType =
  | "chat" // 用户发送消�?
  | "chat.stream" // 流式推理响应
  | "chat.done" // 推理完成
  | "task.start" // 任务开�?
  | "task.step" // 任务步骤更新
  | "task.cancel" // 用户取消任务
  | "task.done" // 任务完成
  | "task.error" // 任务错误
  | "task.modify" // 用户修改执行参数
  | "system.status" // 系统状态推�?
  | "ping" // 心跳
  | "pong"; // 心跳响应

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
  steps: Array<{ action: string; status: string; result?: unknown }>;
  abortController: AbortController;
}

<<<<<<< HEAD
// ══════════════════════════════════════════════════════════════════════════�?
// WebSocket Server
// ══════════════════════════════════════════════════════════════════════════�?
=======
// === WebSocket Server ===
>>>>>>> dev

export class RealtimeChannel {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocket>();
  private tasks = new Map<string, ActiveTask>();
  private inferenceEngine?: InferenceEngine;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(inferenceEngine?: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
  }

  /**
<<<<<<< HEAD
   * 附加到现�?HTTP 服务�?
=======
   * Start WebSocket server
>>>>>>> dev
   */
  start(port: number): void {
    if (this.wss) {
      throw new Error("WebSocket server already running");
    }

    this.wss = new WebSocketServer({ port });

    this.wss.on("connection", (ws, req) => {
      const clientId = generateId("client");
      this.clients.set(clientId, ws);
      log.info(`Client connected: ${clientId} (${this.clients.size} total)`);

<<<<<<< HEAD
      // 发送欢迎消�?
=======
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

    // Start heartbeat
    this.startHeartbeat();

    log.info(`WebSocket server started on port ${port}`);
  }

  /**
<<<<<<< HEAD
   * 处理客户端消�?
=======
   * Stop WebSocket server
>>>>>>> dev
   */
  stop(): void {
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

<<<<<<< HEAD
      case "pong":
        // 心跳响应，忽�?
        break;
=======
    // Close server
    this.wss?.close();
    this.wss = null;
>>>>>>> dev

    log.info("WebSocket server stopped");
  }

  /**
   * Handle incoming message
   */
  private handleMessage(clientId: string, ws: WebSocket, data: unknown): void {
    try {
      const message = JSON.parse(data as string) as WSMessage;
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
    } catch (error) {
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
  private async handleChat(
    clientId: string,
    ws: WebSocket,
    message: WSMessage,
  ): Promise<void> {
    if (!this.inferenceEngine) {
      this.send(ws, {
        type: "task.error",
        id: generateId("msg"),
        data: { error: "Inference engine not available" },
        timestamp: nowMs(),
      });
      return;
    }

    const data = message.data as { messages: ChatMessage[] };
    
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
    } catch (error) {
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
  private async handleTaskStart(
    clientId: string,
    ws: WebSocket,
    message: WSMessage,
  ): Promise<void> {
    const taskId = generateId("task");
    const task: ActiveTask = {
      id: taskId,
      clientId,
      status: "running",
      startedAt: nowMs(),
      steps: [],
      abortController: new AbortController(),
    };

<<<<<<< HEAD
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

    // TODO: Execute actual task
    // For now, simulate task execution
    this.simulateTaskExecution(task);
  }

  /**
   * Handle task cancel
   */
  private handleTaskCancel(clientId: string, message: WSMessage): void {
    const taskId = message.taskId;
    if (!taskId) return;

    const task = this.tasks.get(taskId);
    if (!task || task.clientId !== clientId) return;

<<<<<<< HEAD
      // 推送结�?
=======
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
  private handleTaskModify(clientId: string, message: WSMessage): void {
    const taskId = message.taskId;
    if (!taskId) return;

<<<<<<< HEAD
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
    if (!task || task.clientId !== clientId) return;

    // TODO: Apply modifications to running task
    log.info(`Task ${taskId} modified by ${clientId}`);
  }

  /**
   * Simulate task execution (placeholder)
   */
  private async simulateTaskExecution(task: ActiveTask): Promise<void> {
    const ws = this.clients.get(task.clientId);
    if (!ws) return;

    const steps = ["Analyzing", "Planning", "Executing", "Verifying"];

    for (const step of steps) {
      if (task.status === "cancelled") break;

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

      task.steps[task.steps.length - 1]!.status = "completed";
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
  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
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
  private cleanupClientTasks(clientId: string): void {
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
  private handleModify(
    taskId?: string,
    params?: Record<string, unknown>,
  ): void {
    if (!taskId || !params) return;
    const task = this.activeTasks.get(taskId);
    if (task) {
      log.info(`Task modified: ${taskId}, params: ${JSON.stringify(params)}`);
      // 参数修改会在下一个步骤生�?
    }
  }

  /**
   * 向指定客户端发送消�?
   */
  private send(ws: WebSocket, msg: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(msg: WSMessage): void {
    for (const [, ws] of this.clients) {
      this.send(ws, msg);
    }
  }

  /**
   * 获取活跃连接�?
=======
  getActiveTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * Get connected clients count
>>>>>>> dev
   */
  getClientCount(): number {
    return this.clients.size;
  }
<<<<<<< HEAD

  /**
   * 获取活跃任务�?
   */
  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  /**
   * 关闭
   */
  close(): void {
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

export function createRealtimeChannel(inferenceEngine?: InferenceEngine): RealtimeChannel {
  return new RealtimeChannel(inferenceEngine);
}

// === Exports ===

export { createRealtimeChannel, RealtimeChannel };
export default RealtimeChannel;
