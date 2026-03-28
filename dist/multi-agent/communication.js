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
// Communication hub
class CommunicationHub extends EventEmitter {
    handlers = new Map();
    /**
     * Send message to specific agent
     */
    send(message) {
        const fullMessage = {
            ...message,
            id: generateId("msg"),
            timestamp: nowMs(),
        };
        log.debug(`Message ${fullMessage.id} from ${fullMessage.from} to ${fullMessage.to || "broadcast"}`);
        // Emit for local handlers
        this.emit("message", fullMessage);
        // Call specific handlers
        if (fullMessage.to) {
            const handlers = this.handlers.get(fullMessage.to) || [];
            for (const handler of handlers) {
                try {
                    handler(fullMessage);
                }
                catch (error) {
                    log.error(`Handler error: ${error.message}`);
                }
            }
        }
        return fullMessage;
    }
    /**
     * Broadcast message to all agents
     */
    broadcast(from, type, payload) {
        return this.send({
            type,
            from,
            payload,
        });
    }
    /**
     * Register message handler for agent
     */
    registerHandler(agentId, handler) {
        const handlers = this.handlers.get(agentId) || [];
        handlers.push(handler);
        this.handlers.set(agentId, handlers);
        log.debug(`Handler registered for agent: ${agentId}`);
    }
    /**
     * Unregister message handler
     */
    unregisterHandler(agentId, handler) {
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
export function sendMessage(from, to, type, payload) {
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
export function broadcastMessage(from, type, payload) {
    return hub.broadcast(from, type, payload);
}
/**
 * Register handler
 */
export function onMessage(agentId, handler) {
    hub.registerHandler(agentId, handler);
}
/**
 * Unregister handler
 */
export function offMessage(agentId, handler) {
    hub.unregisterHandler(agentId, handler);
}
/**
 * Send task request
 */
export function requestTask(from, to, instruction, options) {
    return sendMessage(from, to, "task", {
        instruction,
        options,
    });
}
/**
 * Send task result
 */
export function sendResult(from, to, result) {
    return sendMessage(from, to, "result", result);
}
/**
 * Send error
 */
export function sendError(from, to, error) {
    return sendMessage(from, to, "error", { error });
}
/**
 * Send heartbeat
 */
export function sendHeartbeat(agentId) {
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
//# sourceMappingURL=communication.js.map