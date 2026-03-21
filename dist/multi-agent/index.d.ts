/**
 * OpenOxygen — Multi-Agent Module (26w15aD Phase 5)
 *
 * 统一导出多 Agent 功能
 */
export { registerAgent, unregisterAgent, getAgent, listAgents, findBestAgent, delegateTask, getAssignment, waitForTask, saveCheckpoint, loadCheckpoint, resumeTask, cancelTask, getTaskStatistics, type Agent, type AgentType, type AgentCapability, type AgentStatus, type TaskAssignment, } from "./runtime.js";
export { sendMessage, broadcastMessage, onMessage, offMessage, requestTask, sendResult, sendError, sendHeartbeat, type AgentMessage, type MessageType, } from "./communication.js";
import * as runtime from "./runtime.js";
import * as communication from "./communication.js";
export declare const MultiAgent: {
    sendMessage(from: string, to: string, type: communication.MessageType, payload: any): communication.AgentMessage;
    broadcastMessage(from: string, type: communication.MessageType, payload: any): communication.AgentMessage;
    onMessage(agentId: string, handler: communication.MessageHandler): void;
    offMessage(agentId: string, handler: communication.MessageHandler): void;
    requestTask(from: string, to: string, instruction: string, options?: any): communication.AgentMessage;
    sendResult(from: string, to: string, result: any): communication.AgentMessage;
    sendError(from: string, to: string, error: string): communication.AgentMessage;
    sendHeartbeat(agentId: string): communication.AgentMessage;
    default: {
        sendMessage: typeof communication.sendMessage;
        broadcastMessage: typeof communication.broadcastMessage;
        onMessage: typeof communication.onMessage;
        offMessage: typeof communication.offMessage;
        requestTask: typeof communication.requestTask;
        sendResult: typeof communication.sendResult;
        sendError: typeof communication.sendError;
        sendHeartbeat: typeof communication.sendHeartbeat;
    };
    registerAgent(agent: Omit<runtime.Agent, "id" | "lastHeartbeat">): runtime.Agent;
    unregisterAgent(agentId: string): boolean;
    getAgent(agentId: string): runtime.Agent | undefined;
    listAgents(filter?: {
        type?: runtime.AgentType;
        status?: runtime.AgentStatus;
        capability?: runtime.AgentCapability;
    }): runtime.Agent[];
    findBestAgent(requiredCapabilities: runtime.AgentCapability[]): runtime.Agent | null;
    delegateTask(instruction: string, options?: {
        preferredAgent?: string;
        requiredCapabilities?: runtime.AgentCapability[];
        timeoutMs?: number;
        allowRetry?: boolean;
    }): Promise<runtime.TaskAssignment>;
    getAssignment(assignmentId: string): runtime.TaskAssignment | undefined;
    waitForTask(assignmentId: string, timeoutMs?: number): Promise<runtime.TaskAssignment>;
    saveCheckpoint(taskId: string, data: any): void;
    loadCheckpoint(taskId: string): any | null;
    resumeTask(taskId: string, instruction: string): Promise<runtime.TaskAssignment>;
    cancelTask(assignmentId: string): boolean;
    getTaskStatistics(): {
        total: number;
        completed: number;
        failed: number;
        pending: number;
        running: number;
    };
};
export default MultiAgent;
//# sourceMappingURL=index.d.ts.map