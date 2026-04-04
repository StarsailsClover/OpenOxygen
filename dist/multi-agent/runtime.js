/**
<<<<<<< HEAD
 * OpenOxygen �?Multi-Agent Runtime (26w15aD Phase 5)
=======
 * OpenOxygen - Multi-Agent Runtime
>>>>>>> dev
 *
 * �?Agent 运行时系�?
 * Agent 协调、任务委派、断点续�?
 */
import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import { GlobalMemory } from "../memory/global/index.js";
const log = createSubsystemLogger("multi-agent/runtime");
// Agent registry
const agents = new Map();
// Task assignments
const assignments = new Map();
// Checkpoint storage
const checkpoints = new Map();
/**
 * Register an agent
 * @param agent - Agent to register
 */
export function registerAgent(agent) {
    const fullAgent = {
        ...agent,
        id: generateId("agent"),
        lastHeartbeat: nowMs(),
    };
    agents.set(fullAgent.id, fullAgent);
    log.info(`Agent registered: ${fullAgent.name} (${fullAgent.id})`);
    return fullAgent;
}
/**
 * Unregister an agent
 * @param agentId - Agent ID
 */
export function unregisterAgent(agentId) {
    const existed = agents.delete(agentId);
    if (existed) {
        log.info(`Agent unregistered: ${agentId}`);
    }
    return existed;
}
/**
 * Get agent by ID
 * @param agentId - Agent ID
 */
export function getAgent(agentId) {
    return agents.get(agentId);
}
/**
 * List all agents
 */
<<<<<<< HEAD
export function listAgents(filter) {
    let result = Array.from(agents.values());
    if (filter?.type) {
        result = result.filter((a) => a.type === filter.type);
    }
    if (filter?.status) {
        result = result.filter((a) => a.status === filter.status);
    }
    if (filter?.capability) {
        result = result.filter((a) => a.capabilities.includes(filter.capability));
    }
    return result;
=======
export function listAgents() {
    return Array.from(agents.values());
>>>>>>> dev
}
/**
 * Find best agent for task based on capabilities
 * @param capabilities - Required capabilities
 */
<<<<<<< HEAD
export function findBestAgent(requiredCapabilities) {
    const candidates = listAgents({ status: "idle" }).filter((agent) => requiredCapabilities.every((cap) => agent.capabilities.includes(cap)));
    if (candidates.length === 0) {
        return null;
    }
    // Sort by capability match score
    candidates.sort((a, b) => {
        const scoreA = a.capabilities.filter((c) => requiredCapabilities.includes(c)).length;
        const scoreB = b.capabilities.filter((c) => requiredCapabilities.includes(c)).length;
        return scoreB - scoreA;
    });
    return candidates[0];
=======
export function findBestAgent(capabilities) {
    const candidates = Array.from(agents.values()).filter((agent) => agent.status === "idle" &&
        capabilities.every((cap) => agent.capabilities.includes(cap)));
    if (candidates.length === 0) {
        return null;
    }
    // Sort by number of matching capabilities (prefer specialists)
    candidates.sort((a, b) => b.capabilities.filter((cap) => capabilities.includes(cap)).length -
        a.capabilities.filter((cap) => capabilities.includes(cap)).length);
    return candidates[0] || null;
>>>>>>> dev
}
/**
 * Delegate task to agent
 * @param instruction - Task instruction
 * @param capabilities - Required capabilities
 */
<<<<<<< HEAD
export async function delegateTask(instruction, options = {}) {
    log.info(`Delegating task: ${instruction.substring(0, 50)}...`);
    // Find agent
    let agent = null;
    if (options.preferredAgent) {
        agent = getAgent(options.preferredAgent);
        if (agent && agent.status !== "idle") {
            agent = null;
        }
    }
    if (!agent && options.requiredCapabilities) {
        agent = findBestAgent(options.requiredCapabilities);
    }
=======
export function delegateTask(instruction, capabilities) {
    const agent = findBestAgent(capabilities);
>>>>>>> dev
    if (!agent) {
        throw new Error(`No available agent with capabilities: ${capabilities.join(", ")}`);
    }
    const assignment = {
        id: generateId("task"),
        agentId: agent.id,
        instruction,
        status: "assigned",
        startTime: nowMs(),
    };
    assignments.set(assignment.id, assignment);
    // Update agent status
    agent.status = "busy";
    agent.currentTask = assignment.id;
    log.info(`Task ${assignment.id} delegated to ${agent.name}`);
    return assignment;
}
/**
<<<<<<< HEAD
 * Execute task asynchronously
 */
async function executeTaskAsync(assignment, timeoutMs = 30000, allowRetry = true) {
    const agent = getAgent(assignment.agentId);
    if (!agent) {
        assignment.status = "failed";
        assignment.error = "Agent not found";
        return;
    }
    assignment.status = "running";
    try {
        // Import execution functions
        const { handleExecutionRequest } = require("../execution/unified/index.js");
        // Execute with timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Task timeout")), timeoutMs);
        });
        const executionPromise = handleExecutionRequest({
            instruction: assignment.instruction,
            mode: "auto",
        });
        const result = await Promise.race([executionPromise, timeoutPromise]);
        assignment.result = result;
        assignment.status = result.success ? "completed" : "failed";
        assignment.endTime = nowMs();
        // Save checkpoint
        saveCheckpoint(assignment.id, {
            result,
            timestamp: nowMs(),
        });
        log.info(`Task ${assignment.id} completed: ${assignment.status}`);
    }
    catch (error) {
        assignment.status = "failed";
        assignment.error = error.message;
        assignment.endTime = nowMs();
        log.error(`Task ${assignment.id} failed: ${error.message}`);
        // Retry if allowed
        if (allowRetry && assignment.status === "failed") {
            log.info(`Retrying task ${assignment.id}`);
            await sleep(1000);
            await executeTaskAsync(assignment, timeoutMs, false);
        }
    }
    finally {
        // Update agent status
        agent.status = "idle";
        agent.currentTask = undefined;
    }
}
/**
=======
>>>>>>> dev
 * Get task assignment
 * @param taskId - Task ID
 */
<<<<<<< HEAD
export function getAssignment(assignmentId) {
    return assignments.get(assignmentId);
=======
export function getAssignment(taskId) {
    return assignments.get(taskId);
>>>>>>> dev
}
/**
 * Wait for task completion
 * @param taskId - Task ID
 * @param timeout - Timeout in ms
 */
export async function waitForTask(taskId, timeout = 60000) {
    const startTime = nowMs();
    while (nowMs() - startTime < timeout) {
        const assignment = assignments.get(taskId);
        if (!assignment) {
            throw new Error(`Task not found: ${taskId}`);
        }
        if (assignment.status === "completed" || assignment.status === "failed") {
            return assignment;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for task: ${taskId}`);
}
/**
 * Save checkpoint for task
 * @param taskId - Task ID
 * @param data - Checkpoint data
 */
export function saveCheckpoint(taskId, data) {
    checkpoints.set(taskId, {
<<<<<<< HEAD
        ...data,
=======
        data,
>>>>>>> dev
        timestamp: nowMs(),
    });
    // Also persist to global memory
    const memory = new GlobalMemory();
    memory.setPreference(`checkpoint:${taskId}`, {
        data,
        timestamp: nowMs(),
    });
    log.debug(`Checkpoint saved for task ${taskId}`);
}
/**
 * Load checkpoint for task
 * @param taskId - Task ID
 */
export function loadCheckpoint(taskId) {
    // Try memory first
    const memory = new GlobalMemory();
    const fromMemory = memory.getPreference(`checkpoint:${taskId}`);
    if (fromMemory) {
        return fromMemory.data;
    }
    // Fallback to local storage
    const checkpoint = checkpoints.get(taskId);
    return checkpoint?.data || null;
}
/**
 * Resume task from checkpoint
 * @param taskId - Task ID
 */
export async function resumeTask(taskId) {
    const checkpoint = loadCheckpoint(taskId);
    if (!checkpoint) {
        throw new Error(`No checkpoint found for task: ${taskId}`);
    }
<<<<<<< HEAD
    // Delegate with checkpoint context
    return delegateTask(instruction, {
        timeoutMs: 60000,
        allowRetry: true,
    });
=======
    const assignment = assignments.get(taskId);
    if (!assignment) {
        throw new Error(`Task not found: ${taskId}`);
    }
    assignment.status = "running";
    assignment.checkpoint = checkpoint;
    log.info(`Task ${taskId} resumed from checkpoint`);
    return assignment;
>>>>>>> dev
}
/**
 * Cancel task
 * @param taskId - Task ID
 */
export function cancelTask(taskId) {
    const assignment = assignments.get(taskId);
    if (!assignment) {
        return false;
    }
    assignment.status = "failed";
    assignment.error = "Cancelled by user";
    assignment.endTime = nowMs();
    // Free agent
    const agent = agents.get(assignment.agentId);
    if (agent) {
        agent.status = "idle";
        agent.currentTask = undefined;
    }
    log.info(`Task ${taskId} cancelled`);
    return true;
}
/**
 * Get task statistics
 */
export function getTaskStatistics() {
    const all = Array.from(assignments.values());
    return {
        total: all.length,
<<<<<<< HEAD
        completed: all.filter((a) => a.status === "completed").length,
        failed: all.filter((a) => a.status === "failed").length,
        pending: all.filter((a) => a.status === "pending").length,
        running: all.filter((a) => a.status === "running").length,
    };
}
// Helper
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
=======
        pending: all.filter((a) => a.status === "pending").length,
        running: all.filter((a) => a.status === "running").length,
        completed: all.filter((a) => a.status === "completed").length,
        failed: all.filter((a) => a.status === "failed").length,
    };
}
/**
 * Update agent heartbeat
 * @param agentId - Agent ID
 */
export function updateHeartbeat(agentId) {
    const agent = agents.get(agentId);
    if (agent) {
        agent.lastHeartbeat = nowMs();
    }
>>>>>>> dev
}
/**
 * Check for stale agents
 * @param maxAgeMs - Maximum age in ms
 */
export function checkStaleAgents(maxAgeMs = 60000) {
    const now = nowMs();
    const stale = [];
    for (const agent of agents.values()) {
        if (now - agent.lastHeartbeat > maxAgeMs) {
            agent.status = "offline";
            stale.push(agent);
        }
    }
    return stale;
}
// Exports
export { agents, assignments, checkpoints };
