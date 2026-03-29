/**
 * OpenOxygen �?Multi-Agent Runtime (26w15aD Phase 5)
 *
 * �?Agent 运行时系�? * Agent 协调、任务委派、断点续�? */
export type AgentType = "worker" | "coordinator" | "specialist";
export type AgentCapability = "terminal" | "gui" | "browser" | "vision" | "file";
export type AgentStatus = "idle" | "busy" | "offline" | "error";
export interface Agent {
    id: string;
    name: string;
    type: AgentType;
    capabilities: AgentCapability[];
    status: AgentStatus;
    currentTask?: string;
    lastHeartbeat: number;
    metadata: {
        version: string;
        platform: string;
        maxConcurrentTasks: number;
    };
}
export interface TaskAssignment {
    id: string;
    agentId: string;
    instruction: string;
    status: "pending" | "assigned" | "running" | "completed" | "failed";
    result?: any;
    error?: string;
    startTime?: number;
    endTime?: number;
    checkpoint?: any;
}
/**
 * Register an agent
 * @param agent - Agent to register
 */
export declare function registerAgent(agent: Omit<Agent, "id" | "lastHeartbeat">): Agent;
/**
 * Unregister an agent
 * @param agentId - Agent ID
 */
export declare function unregisterAgent(agentId: string): boolean;
/**
 * Get agent by ID
 * @param agentId - Agent ID
 */
export declare function getAgent(agentId: string): Agent | undefined;
/**
 * List all agents
 * @param filter - Optional filter
 */
export declare function listAgents(filter?: {
    type?: AgentType;
    status?: AgentStatus;
    capability?: AgentCapability;
}): Agent[];
/**
 * Find best agent for task
 * @param requiredCapabilities - Required capabilities
 */
export declare function findBestAgent(requiredCapabilities: AgentCapability[]): Agent | null;
/**
 * Delegate task to agent
 * @param instruction - Task instruction
 * @param options - Delegation options
 */
export declare function delegateTask(instruction: string, options?: {
    preferredAgent?: string;
    requiredCapabilities?: AgentCapability[];
    timeoutMs?: number;
    allowRetry?: boolean;
}): Promise<TaskAssignment>;
/**
 * Get task assignment
 * @param assignmentId - Assignment ID
 */
export declare function getAssignment(assignmentId: string): TaskAssignment | undefined;
/**
 * Wait for task completion
 * @param assignmentId - Assignment ID
 * @param timeoutMs - Timeout
 */
export declare function waitForTask(assignmentId: string, timeoutMs?: number): Promise<TaskAssignment>;
/**
 * Save checkpoint
 * @param taskId - Task ID
 * @param data - Checkpoint data
 */
export declare function saveCheckpoint(taskId: string, data: any): void;
/**
 * Load checkpoint
 * @param taskId - Task ID
 */
export declare function loadCheckpoint(taskId: string): any | null;
/**
 * Resume task from checkpoint
 * @param taskId - Task ID
 * @param instruction - Original instruction
 */
export declare function resumeTask(taskId: string, instruction: string): Promise<TaskAssignment>;
/**
 * Cancel task
 * @param assignmentId - Assignment ID
 */
export declare function cancelTask(assignmentId: string): boolean;
/**
 * Get task statistics
 */
export declare function getTaskStatistics(): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
};
declare const _default: {
    registerAgent: typeof registerAgent;
    unregisterAgent: typeof unregisterAgent;
    getAgent: typeof getAgent;
    listAgents: typeof listAgents;
    findBestAgent: typeof findBestAgent;
    delegateTask: typeof delegateTask;
    getAssignment: typeof getAssignment;
    waitForTask: typeof waitForTask;
    saveCheckpoint: typeof saveCheckpoint;
    loadCheckpoint: typeof loadCheckpoint;
    resumeTask: typeof resumeTask;
    cancelTask: typeof cancelTask;
    getTaskStatistics: typeof getTaskStatistics;
};
export default _default;
//# sourceMappingURL=runtime.d.ts.map
