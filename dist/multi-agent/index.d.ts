/**
 * OpenOxygen �?Multi-Agent Module (26w15aD Phase 5)
 *
 * 统一导出�?Agent 功能
 */
export { registerAgent, unregisterAgent, getAgent, listAgents, findBestAgent, delegateTask, getAssignment, waitForTask, saveCheckpoint, loadCheckpoint, resumeTask, cancelTask, getTaskStatistics, type Agent, type AgentType, type AgentCapability, type AgentStatus, type TaskAssignment, } from "./runtime.js";
export { sendMessage, broadcastMessage, onMessage, offMessage, requestTask, sendResult, sendError, sendHeartbeat, type AgentMessage, type MessageType, } from "./communication.js";
export declare const MultiAgent: any;
export default MultiAgent;
//# sourceMappingURL=index.d.ts.map
