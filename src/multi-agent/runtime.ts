/**
 * OpenOxygen �?Multi-Agent Runtime (26w15aD Phase 5)
 *
 * �?Agent 运行时系�?
 * Agent 协调、任务委派、断点续�?
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import { GlobalMemory } from "../memory/global/index.js";

const log = createSubsystemLogger("multi-agent/runtime");

// Agent types
export type AgentType = "worker" | "coordinator" | "specialist";

// Agent capabilities
export type AgentCapability =
  | "terminal"
  | "gui"
  | "browser"
  | "vision"
  | "file";

// Agent status
export type AgentStatus = "idle" | "busy" | "offline" | "error";

// Agent definition
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

// Task assignment
export interface TaskAssignment {
  id: string;
  agentId: string;
  instruction: string;
  status: "pending" | "assigned" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  checkpoint?: any; // For resumption
}

// Agent registry
const agents = new Map<string, Agent>();

// Task assignments
const assignments = new Map<string, TaskAssignment>();

// Checkpoint storage
const checkpoints = new Map<string, any>();

/**
 * Register an agent
 * @param agent - Agent to register
 */
export function registerAgent(
  agent: Omit<Agent, "id" | "lastHeartbeat">,
): Agent {
  const fullAgent: Agent = {
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
export function unregisterAgent(agentId: string): boolean {
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
export function getAgent(agentId: string): Agent | undefined {
  return agents.get(agentId);
}

/**
 * List all agents
 * @param filter - Optional filter
 */
export function listAgents(filter?: {
  type?: AgentType;
  status?: AgentStatus;
  capability?: AgentCapability;
}): Agent[] {
  let result = Array.from(agents.values());

  if (filter?.type) {
    result = result.filter((a) => a.type === filter.type);
  }

  if (filter?.status) {
    result = result.filter((a) => a.status === filter.status);
  }

  if (filter?.capability) {
    result = result.filter((a) => a.capabilities.includes(filter.capability!));
  }

  return result;
}

/**
 * Find best agent for task
 * @param requiredCapabilities - Required capabilities
 */
export function findBestAgent(
  requiredCapabilities: AgentCapability[],
): Agent | null {
  const candidates = listAgents({ status: "idle" }).filter((agent) =>
    requiredCapabilities.every((cap) => agent.capabilities.includes(cap)),
  );

  if (candidates.length === 0) {
    return null;
  }

  // Sort by capability match score
  candidates.sort((a, b) => {
    const scoreA = a.capabilities.filter((c) =>
      requiredCapabilities.includes(c),
    ).length;
    const scoreB = b.capabilities.filter((c) =>
      requiredCapabilities.includes(c),
    ).length;
    return scoreB - scoreA;
  });

  return candidates[0];
}

/**
 * Delegate task to agent
 * @param instruction - Task instruction
 * @param options - Delegation options
 */
export async function delegateTask(
  instruction: string,
  options: {
    preferredAgent?: string;
    requiredCapabilities?: AgentCapability[];
    timeoutMs?: number;
    allowRetry?: boolean;
  } = {},
): Promise<TaskAssignment> {
  log.info(`Delegating task: ${instruction.substring(0, 50)}...`);

  // Find agent
  let agent: Agent | null = null;

  if (options.preferredAgent) {
    agent = getAgent(options.preferredAgent);
    if (agent && agent.status !== "idle") {
      agent = null;
    }
  }

  if (!agent && options.requiredCapabilities) {
    agent = findBestAgent(options.requiredCapabilities);
  }

  if (!agent) {
    agent = findBestAgent(["terminal"]);
  }

  if (!agent) {
    throw new Error("No available agent for task");
  }

  // Create assignment
  const assignment: TaskAssignment = {
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

  log.info(`Task ${assignment.id} assigned to agent ${agent.name}`);

  // Execute task (async)
  executeTaskAsync(assignment, options.timeoutMs, options.allowRetry);

  return assignment;
}

/**
 * Execute task asynchronously
 */
async function executeTaskAsync(
  assignment: TaskAssignment,
  timeoutMs: number = 30000,
  allowRetry: boolean = true,
): Promise<void> {
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
  } catch (error) {
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
  } finally {
    // Update agent status
    agent.status = "idle";
    agent.currentTask = undefined;
  }
}

/**
 * Get task assignment
 * @param assignmentId - Assignment ID
 */
export function getAssignment(
  assignmentId: string,
): TaskAssignment | undefined {
  return assignments.get(assignmentId);
}

/**
 * Wait for task completion
 * @param assignmentId - Assignment ID
 * @param timeoutMs - Timeout
 */
export async function waitForTask(
  assignmentId: string,
  timeoutMs: number = 60000,
): Promise<TaskAssignment> {
  const startTime = nowMs();

  while (nowMs() - startTime < timeoutMs) {
    const assignment = getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    if (assignment.status === "completed" || assignment.status === "failed") {
      return assignment;
    }

    await sleep(100);
  }

  throw new Error(`Timeout waiting for task: ${assignmentId}`);
}

/**
 * Save checkpoint
 * @param taskId - Task ID
 * @param data - Checkpoint data
 */
export function saveCheckpoint(taskId: string, data: any): void {
  checkpoints.set(taskId, {
    ...data,
    timestamp: nowMs(),
  });

  // Also save to persistent memory
  try {
    const memory = new GlobalMemory(".state", ".state/checkpoints.db");
    memory.setPreference(`checkpoint_${taskId}`, JSON.stringify(data));
    memory.close();
  } catch (error) {
    log.error(`Failed to save checkpoint: ${error.message}`);
  }

  log.debug(`Checkpoint saved: ${taskId}`);
}

/**
 * Load checkpoint
 * @param taskId - Task ID
 */
export function loadCheckpoint(taskId: string): any | null {
  // Try memory first
  const checkpoint = checkpoints.get(taskId);
  if (checkpoint) {
    return checkpoint;
  }

  // Try persistent storage
  try {
    const memory = new GlobalMemory(".state", ".state/checkpoints.db");
    const data = memory.getPreference(`checkpoint_${taskId}`);
    memory.close();

    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    log.error(`Failed to load checkpoint: ${error.message}`);
  }

  return null;
}

/**
 * Resume task from checkpoint
 * @param taskId - Task ID
 * @param instruction - Original instruction
 */
export async function resumeTask(
  taskId: string,
  instruction: string,
): Promise<TaskAssignment> {
  log.info(`Resuming task: ${taskId}`);

  const checkpoint = loadCheckpoint(taskId);
  if (!checkpoint) {
    // No checkpoint, start fresh
    return delegateTask(instruction);
  }

  // Delegate with checkpoint context
  return delegateTask(instruction, {
    timeoutMs: 60000,
    allowRetry: true,
  });
}

/**
 * Cancel task
 * @param assignmentId - Assignment ID
 */
export function cancelTask(assignmentId: string): boolean {
  const assignment = assignments.get(assignmentId);
  if (!assignment) {
    return false;
  }

  if (assignment.status === "running") {
    assignment.status = "failed";
    assignment.error = "Cancelled by user";
    assignment.endTime = nowMs();

    // Update agent
    const agent = getAgent(assignment.agentId);
    if (agent) {
      agent.status = "idle";
      agent.currentTask = undefined;
    }

    log.info(`Task cancelled: ${assignmentId}`);
    return true;
  }

  return false;
}

/**
 * Get task statistics
 */
export function getTaskStatistics(): {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  running: number;
} {
  const all = Array.from(assignments.values());

  return {
    total: all.length,
    completed: all.filter((a) => a.status === "completed").length,
    failed: all.filter((a) => a.status === "failed").length,
    pending: all.filter((a) => a.status === "pending").length,
    running: all.filter((a) => a.status === "running").length,
  };
}

// Helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export all functions
export default {
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  findBestAgent,
  delegateTask,
  getAssignment,
  waitForTask,
  saveCheckpoint,
  loadCheckpoint,
  resumeTask,
  cancelTask,
  getTaskStatistics,
};
