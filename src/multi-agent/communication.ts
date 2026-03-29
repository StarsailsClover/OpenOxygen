/**
 * OpenOxygen — Multi-Agent Communication (26w15aD Phase 5)
 *
 * Agent 间通信协议
 * 消息传递、广播、负载均衡
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import EventEmitter from "node:events";

const log = createSubsystemLogger("multi-agent/communication");

// Message types
export type MessageType =
  | "task"
  | "result"
  | "broadcast"
  | "heartbeat"
  | "error";

// Agent message
export interface AgentMessage {
  id: string;
  type: MessageType;
  from: string;
  to?: string; // Undefined for broadcast
  timestamp: number;
  payload: any;
  priority?: number;
}

// Message handler
export type MessageHandler = (message: AgentMessage) => void | Promise<void>;

// Communication hub
class CommunicationHub extends EventEmitter {
  private handlers = new Map<string, MessageHandler[]>();

  /**
   * Send message to specific agent
   */
  send(message: Omit<AgentMessage, "id" | "timestamp">): AgentMessage {
    const fullMessage: AgentMessage = {
      ...message,
      id: generateId("msg"),
      timestamp: nowMs(),
    };

    log.debug(
      `Message ${fullMessage.id} from ${fullMessage.from} to ${fullMessage.to || "broadcast"}`,
    );

    // Emit for local handlers
    this.emit("message", fullMessage);

    // Call specific handlers
    if (fullMessage.to) {
      const handlers = this.handlers.get(fullMessage.to) || [];
      for (const handler of handlers) {
        try {
          handler(fullMessage);
        } catch (error) {
          log.error(`Handler error: ${error.message}`);
        }
      }
    }

    return fullMessage;
  }

  /**
   * Broadcast message to all agents
   */
  broadcast(from: string, type: MessageType, payload: any): AgentMessage {
    return this.send({
      type,
      from,
      payload,
    });
  }

  /**
   * Register message handler for agent
   */
  registerHandler(agentId: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(agentId) || [];
    handlers.push(handler);
    this.handlers.set(agentId, handlers);
    log.debug(`Handler registered for agent: ${agentId}`);
  }

  /**
   * Unregister message handler
   */
  unregisterHandler(agentId: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(agentId) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(agentId, handlers);
    }
  }
}

// Singleton hub
const hub = new CommunicationHub();

/**
 * Send message
 */
export function sendMessage(
  from: string,
  to: string,
  type: MessageType,
  payload: any,
): AgentMessage {
  return hub.send({
    type,
    from,
    to,
    payload,
  });
}

/**
 * Broadcast message
 */
export function broadcastMessage(
  from: string,
  type: MessageType,
  payload: any,
): AgentMessage {
  return hub.broadcast(from, type, payload);
}

/**
 * Register handler
 */
export function onMessage(agentId: string, handler: MessageHandler): void {
  hub.registerHandler(agentId, handler);
}

/**
 * Unregister handler
 */
export function offMessage(agentId: string, handler: MessageHandler): void {
  hub.unregisterHandler(agentId, handler);
}

/**
 * Send task request
 */
export function requestTask(
  from: string,
  to: string,
  instruction: string,
  options?: any,
): AgentMessage {
  return sendMessage(from, to, "task", {
    instruction,
    options,
  });
}

/**
 * Send task result
 */
export function sendResult(
  from: string,
  to: string,
  result: any,
): AgentMessage {
  return sendMessage(from, to, "result", result);
}

/**
 * Send error
 */
export function sendError(
  from: string,
  to: string,
  error: string,
): AgentMessage {
  return sendMessage(from, to, "error", { error });
}

/**
 * Send heartbeat
 */
export function sendHeartbeat(agentId: string): AgentMessage {
  return broadcastMessage(agentId, "heartbeat", {
    timestamp: nowMs(),
  });
}

// Export
export default {
  sendMessage,
  broadcastMessage,
  onMessage,
  offMessage,
  requestTask,
  sendResult,
  sendError,
  sendHeartbeat,
};
