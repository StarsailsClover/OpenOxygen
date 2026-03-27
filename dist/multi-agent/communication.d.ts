/**
 * OpenOxygen — Multi-Agent Communication (26w15aD Phase 5)
 *
 * Agent 间通信协议
 * 消息传递、广播、负载均衡
 */
export type MessageType = "task" | "result" | "broadcast" | "heartbeat" | "error";
export interface AgentMessage {
    id: string;
    type: MessageType;
    from: string;
    to?: string;
    timestamp: number;
    payload: any;
    priority?: number;
}
export type MessageHandler = (message: AgentMessage) => void | Promise<void>;
/**
 * Send message
 */
export declare function sendMessage(from: string, to: string, type: MessageType, payload: any): AgentMessage;
/**
 * Broadcast message
 */
export declare function broadcastMessage(from: string, type: MessageType, payload: any): AgentMessage;
/**
 * Register handler
 */
export declare function onMessage(agentId: string, handler: MessageHandler): void;
/**
 * Unregister handler
 */
export declare function offMessage(agentId: string, handler: MessageHandler): void;
/**
 * Send task request
 */
export declare function requestTask(from: string, to: string, instruction: string, options?: any): AgentMessage;
/**
 * Send task result
 */
export declare function sendResult(from: string, to: string, result: any): AgentMessage;
/**
 * Send error
 */
export declare function sendError(from: string, to: string, error: string): AgentMessage;
/**
 * Send heartbeat
 */
export declare function sendHeartbeat(agentId: string): AgentMessage;
declare const _default: {
    sendMessage: typeof sendMessage;
    broadcastMessage: typeof broadcastMessage;
    onMessage: typeof onMessage;
    offMessage: typeof offMessage;
    requestTask: typeof requestTask;
    sendResult: typeof sendResult;
    sendError: typeof sendError;
    sendHeartbeat: typeof sendHeartbeat;
};
export default _default;
//# sourceMappingURL=communication.d.ts.map