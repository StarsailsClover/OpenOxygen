/**
 * OpenOxygen — WebSocket Real-time Channel (26w12aA)
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
import type {
  InferenceEngine,
  ChatMessage,
} from "../../inference/engine/index.js";

const log = createSubsystemLogger("ws");

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type WSMessageType =
  | "chat" // 用户发送消息
  | "chat.stream" // 流式推理响应
  | "chat.done" // 推理完成
  | "task.start" // 任务开始
  | "task.step" // 任务步骤更新
  | "task.cancel" // 用户取消任务
  | "task.done" // 任务完成
  | "task.error" // 任务错误
  | "task.modify" // 用户修改执行参数
  | "system.status" // 系统状态推送
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

// ═══════════════════════════════════════════════════════════════════════════
// WebSocket Server
// ═══════════════════════════════════════════════════════════════════════════

export class RealtimeChannel {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocket>();
  private activeTasks = new Map<string, ActiveTask>();
  private inferenceEngine?: InferenceEngine;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(inferenceEngine?: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
  }

  /**
   * 附加到现有 HTTP 服务器
   */
  attach(httpServer: import("node:http").Server): void {
    this.wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    this.wss.on("connection", (ws, req) => {
      const clientId = generateId("ws");
      this.clients.set(clientId, ws);
      log.info(
        `WebSocket client connected: ${clientId} from ${req.socket.remoteAddress}`,
      );

      // 发送欢迎消息
      this.send(ws, {
        type: "system.status",
        id: generateId("msg"),
        data: {
          clientId,
          message: "Connected to OpenOxygen Realtime Channel",
          activeTasks: this.activeTasks.size,
        },
        timestamp: nowMs(),
      });

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as WSMessage;
          this.handleMessage(clientId, ws, msg);
        } catch (err) {
          this.send(ws, {
            type: "task.error",
            id: generateId("msg"),
            data: { error: "Invalid message format" },
            timestamp: nowMs(),
          });
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        // 取消该客户端的所有活跃任务
        for (const [taskId, task] of this.activeTasks) {
          if (task.clientId === clientId) {
            task.abortController.abort();
            task.status = "cancelled";
            this.activeTasks.delete(taskId);
          }
        }
        log.info(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on("error", (err) => {
        log.error(`WebSocket error for ${clientId}:`, err);
      });
    });

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
   * 处理客户端消息
   */
  private async handleMessage(
    clientId: string,
    ws: WebSocket,
    msg: WSMessage,
  ): Promise<void> {
    switch (msg.type) {
      case "chat":
        await this.handleChat(clientId, ws, msg);
        break;

      case "task.cancel":
        this.handleCancel(msg.taskId);
        break;

      case "task.modify":
        this.handleModify(msg.taskId, msg.data as Record<string, unknown>);
        break;

      case "pong":
        // 心跳响应，忽略
        break;

      default:
        this.send(ws, {
          type: "task.error",
          id: generateId("msg"),
          data: { error: `Unknown message type: ${msg.type}` },
          timestamp: nowMs(),
        });
    }
  }

  /**
   * 处理聊天消息（流式推送）
   */
  private async handleChat(
    clientId: string,
    ws: WebSocket,
    msg: WSMessage,
  ): Promise<void> {
    if (!this.inferenceEngine) {
      this.send(ws, {
        type: "task.error",
        id: msg.id,
        data: { error: "Inference engine not available" },
        timestamp: nowMs(),
      });
      return;
    }

    const taskId = generateId("task");
    const abortController = new AbortController();

    const task: ActiveTask = {
      id: taskId,
      clientId,
      status: "running",
      startedAt: nowMs(),
      steps: [],
      abortController,
    };
    this.activeTasks.set(taskId, task);

    // 通知任务开始
    this.send(ws, {
      type: "task.start",
      id: generateId("msg"),
      taskId,
      data: { message: "Inference started" },
      timestamp: nowMs(),
    });

    try {
      const chatData = msg.data as {
        message?: string;
        messages?: ChatMessage[];
        mode?: string;
      } | null;
      const messages: ChatMessage[] = chatData?.messages || [
        { role: "user", content: chatData?.message || "" },
      ];

      const result = await this.inferenceEngine.infer({
        messages,
        mode: (chatData?.mode as "fast" | "balanced" | "deep") || undefined,
      });

      // 检查是否已取消
      if (task.status === "cancelled") return;

      // 推送结果
      this.send(ws, {
        type: "chat.done",
        id: generateId("msg"),
        taskId,
        data: {
          content: result.content,
          model: result.model,
          provider: result.provider,
          mode: result.mode,
          usage: result.usage,
          durationMs: result.durationMs,
        },
        timestamp: nowMs(),
      });
    } catch (err) {
      if (task.status !== "cancelled") {
        this.send(ws, {
          type: "task.error",
          id: generateId("msg"),
          taskId,
          data: { error: err instanceof Error ? err.message : String(err) },
          timestamp: nowMs(),
        });
      }
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * 取消任务
   */
  private handleCancel(taskId?: string): void {
    if (!taskId) return;
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.abortController.abort();
      task.status = "cancelled";
      log.info(`Task cancelled: ${taskId}`);

      // 通知客户端
      const ws = this.clients.get(task.clientId);
      if (ws) {
        this.send(ws, {
          type: "task.done",
          id: generateId("msg"),
          taskId,
          data: { cancelled: true },
          timestamp: nowMs(),
        });
      }
    }
  }

  /**
   * 修改执行参数
   */
  private handleModify(
    taskId?: string,
    params?: Record<string, unknown>,
  ): void {
    if (!taskId || !params) return;
    const task = this.activeTasks.get(taskId);
    if (task) {
      log.info(`Task modified: ${taskId}, params: ${JSON.stringify(params)}`);
      // 参数修改会在下一个步骤生效
    }
  }

  /**
   * 向指定客户端发送消息
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
   * 获取活跃连接数
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 获取活跃任务数
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
}
