/**
 * OpenOxygen - Multi-Agent Runtime
 *
 * 多 Agent 运行时系统
 * Agent 协调、任务委派、断点续传
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
 */
export function listAgents(): Agent[] {
  return Array.from(agents.values());
}

/**
 * Find best agent for task based on capabilities
 * @param capabilities - Required capabilities
 */
export function findBestAgent(
  capabilities: AgentCapability[],
): Agent | null {
  const candidates = Array.from(agents.values()).filter(
    (agent) =>
      agent.status === "idle" &&
      capabilities.every((cap) => agent.capabilities.includes(cap)),
  );

  if (candidates.length === 0) {
    return null;
  }

  // Sort by number of matching capabilities (prefer specialists)
  candidates.sort(
    (a, b) =>
      b.capabilities.filter((cap) => capabilities.includes(cap)).length -
      a.capabilities.filter((cap) => capabilities.includes(cap)).length,
  );

  return candidates[0] || null;
}

/**
 * Delegate task to agent
 * @param instruction - Task instruction
 * @param capabilities - Required capabilities
 */
export function delegateTask(
  instruction: string,
  capabilities: AgentCapability[],
): TaskAssignment {
  const agent = findBestAgent(capabilities);

  if (!agent) {
    throw new Error(
      `No available agent with capabilities: ${capabilities.join(", ")}`,
    );
  }

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

  log.info(`Task ${assignment.id} delegated to ${agent.name}`);

  return assignment;
}

/**
 * Get task assignment
 * @param taskId - Task ID
 */
export function getAssignment(taskId: string): TaskAssignment | undefined {
  return assignments.get(taskId);
}

/**
 * Wait for task completion
 * @param taskId - Task ID
 * @param timeout - Timeout in ms
 */
export async function waitForTask(
  taskId: string,
  timeout: number = 60000,
): Promise<TaskAssignment> {
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
export function saveCheckpoint(taskId: string, data: any): void {
  checkpoints.set(taskId, {
    data,
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
export function loadCheckpoint(taskId: string): any | null {
  // Try memory first
  const memory = new GlobalMemory();
  const fromMemory = memory.getPreference<{ data: any; timestamp: number }>(
    `checkpoint:${taskId}`,
  );

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
export async function resumeTask(taskId: string): Promise<TaskAssignment> {
  const checkpoint = loadCheckpoint(taskId);

  if (!checkpoint) {
    throw new Error(`No checkpoint found for task: ${taskId}`);
  }

  const assignment = assignments.get(taskId);
  if (!assignment) {
    throw new Error(`Task not found: ${taskId}`);
  }

  assignment.status = "running";
  assignment.checkpoint = checkpoint;

  log.info(`Task ${taskId} resumed from checkpoint`);

  return assignment;
}

/**
 * Cancel task
 * @param taskId - Task ID
 */
export function cancelTask(taskId: string): boolean {
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
export function getTaskStatistics(): {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
} {
  const all = Array.from(assignments.values());

  return {
    total: all.length,
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
export function updateHeartbeat(agentId: string): void {
  const agent = agents.get(agentId);
  if (agent) {
    agent.lastHeartbeat = nowMs();
  }
}

/**
 * Check for stale agents
 * @param maxAgeMs - Maximum age in ms
 */
export function checkStaleAgents(maxAgeMs: number = 60000): Agent[] {
  const now = nowMs();
  const stale: Agent[] = [];

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
