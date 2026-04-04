/**
<<<<<<< HEAD
 * OpenOxygen �?Multi-Agent Communication (26w15aD Phase 5)
=======
 * OpenOxygen - Multi-Agent Communication
>>>>>>> dev
 *
 * Agent 间通信协议
 * 消息传递、广播、负载均�?
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
<<<<<<< HEAD
                    log.error(`Handler error: ${error.message}`);
=======
                    log.error(`Handler error: ${error}`);
>>>>>>> dev
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
<<<<<<< HEAD
    registerHandler(agentId, handler) {
=======
    onMessage(agentId, handler) {
>>>>>>> dev
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
    /**
     * Unregister message handler
     */
    offMessage(agentId, handler) {
        const handlers = this.handlers.get(agentId) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }
}
// Global hub instance
const hub = new CommunicationHub();
/**
 * Send message to specific agent
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
 * Broadcast message to all agents
 */
export function broadcastMessage(from, type, payload) {
    return hub.broadcast(from, type, payload);
}
/**
 * Register message handler
 */
export function onMessage(agentId, handler) {
    hub.onMessage(agentId, handler);
}
/**
 * Unregister message handler
 */
export function offMessage(agentId, handler) {
    hub.offMessage(agentId, handler);
}
/**
 * Request task from coordinator
 */
export function requestTask(agentId, capabilities) {
    return sendMessage(agentId, "coordinator", "task", {
        capabilities,
        timestamp: nowMs(),
    });
}
/**
 * Send task result
 */
export function sendResult(agentId, taskId, result) {
    return sendMessage(agentId, "coordinator", "result", {
        taskId,
        result,
        timestamp: nowMs(),
    });
}
/**
 * Send error
 */
export function sendError(agentId, taskId, error) {
    return sendMessage(agentId, "coordinator", "error", {
        taskId,
        error,
        timestamp: nowMs(),
    });
}
/**
 * Send heartbeat
 */
export function sendHeartbeat(agentId) {
    return broadcastMessage(agentId, "heartbeat", {
        timestamp: nowMs(),
    });
}
// Exports
export { hub as communicationHub };
