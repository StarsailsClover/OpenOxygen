/**
 * OpenOxygen - Multi-Agent Coordination System (26w15aD Phase 7)
 *
 * Phase 1: �?Agent 协调与任务分�?
 * - 智能任务分解与分�?
 * - Agent 间通信与协�?
 * - 冲突解决与资源管�?
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
import type { InferenceEngine } from "../inference/engine/index.js";

const log = createSubsystemLogger("phase1/multi-agent");

// Agent types
export type AgentType =
  | "planner" // 任务规划
  | "executor" // 任务执行
  | "reviewer" // 结果审核
  | "specialist" // 领域专家
  | "coordinator"; // 协调�?

// Agent status
export type AgentStatus = "idle" | "busy" | "error" | "offline";

// Agent definition
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  currentTask?: string;
  lastActive: number;
  performance: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
}

// Task definition
export interface CoordinationTask {
  id: string;
  instruction: string;
  priority: number; // 1-10
  dependencies: string[]; // Task IDs
  subtasks: SubTask[];
  assignee?: string; // Agent ID
  status: "pending" | "assigned" | "in_progress" | "completed" | "failed";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

// Subtask definition
export interface SubTask {
  id: string;
  instruction: string;
  agentType: AgentType;
  dependencies: string[]; // SubTask IDs
  status: "pending" | "assigned" | "in_progress" | "completed" | "failed";
  result?: any;
  error?: string;
}

// Coordination message
export interface CoordinationMessage {
  id: string;
  from: string; // Agent ID
  to: string; // Agent ID or "broadcast"
  type: "request" | "response" | "notification" | "conflict";
  content: any;
  timestamp: number;
  taskId?: string;
}

// Coordination result
export interface CoordinationResult {
  success: boolean;
  taskId: string;
  durationMs: number;
  subtaskResults: Map<string, any>;
  agentUsage: Map<string, number>; // Agent ID -> task count
  messages: CoordinationMessage[];
}

/**
 * Multi-Agent Coordinator
 */
export class MultiAgentCoordinator {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, CoordinationTask> = new Map();
  private messages: CoordinationMessage[] = [];
  private inferenceEngine: InferenceEngine;

  constructor(inferenceEngine: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
    log.info("Multi-Agent Coordinator initialized");
  }

  /**
   * Register an agent
   */
  registerAgent(
    agent: Omit<Agent, "id" | "lastActive" | "performance">,
  ): Agent {
    const id = generateId("agent");
    const newAgent: Agent = {
      ...agent,
      id,
      lastActive: nowMs(),
      performance: {
        tasksCompleted: 0,
        successRate: 1.0,
        avgResponseTime: 0,
      },
    };

    this.agents.set(id, newAgent);
    log.info(`Agent registered: ${newAgent.name} (${newAgent.type})`);
    return newAgent;
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    this.agents.delete(agentId);
    log.info(`Agent unregistered: ${agent.name}`);
    return true;
  }

  /**
   * Get available agents
   */
  getAvailableAgents(type?: AgentType): Agent[] {
    const agents = Array.from(this.agents.values()).filter(
      (a) => a.status === "idle",
    );

    if (type) {
      return agents.filter((a) => a.type === type);
    }
    return agents;
  }

  /**
   * Submit a task for coordination
   */
  async submitTask(
    instruction: string,
    options: {
      priority?: number;
      timeoutMs?: number;
    } = {},
  ): Promise<CoordinationResult> {
    const taskId = generateId("task");
    const startTime = nowMs();

    log.info(`[${taskId}] Submitting task: ${instruction}`);

    // Step 1: Decompose task into subtasks
    const subtasks = await this.decomposeTask(instruction);
    log.info(`[${taskId}] Decomposed into ${subtasks.length} subtasks`);

    // Step 2: Create coordination task
    const task: CoordinationTask = {
      id: taskId,
      instruction,
      priority: options.priority || 5,
      dependencies: [],
      subtasks,
      status: "pending",
      createdAt: nowMs(),
    };
    this.tasks.set(taskId, task);

    // Step 3: Assign subtasks to agents
    await this.assignSubtasks(task);

    // Step 4: Execute and coordinate
    const result = await this.executeCoordination(
      task,
      options.timeoutMs || 300000,
    );

    log.info(
      `[${taskId}] Coordination completed: ${result.success ? "success" : "failed"}`,
    );
    return result;
  }

  /**
   * Decompose task into subtasks using LLM
   */
  private async decomposeTask(instruction: string): Promise<SubTask[]> {
    const prompt = `Decompose the following task into subtasks. Each subtask should have:
- A clear instruction
- An agent type (planner, executor, reviewer, specialist, coordinator)
- Dependencies on other subtasks (if any)

Task: ${instruction}

Respond in JSON format:
[
  {
    "instruction": "Subtask description",
    "agentType": "executor",
    "dependencies": []
  }
]`;

    try {
      const response = await this.inferenceEngine.infer({
        messages: [{ role: "user", content: prompt }],
        mode: "balanced",
      });

      const subtasks = JSON.parse(response.content);
      return subtasks.map((st: any) => ({
        id: generateId("sub"),
        instruction: st.instruction,
        agentType: st.agentType as AgentType,
        dependencies: st.dependencies || [],
        status: "pending",
      }));
    } catch (error: any) {
      log.error(`Task decomposition failed: ${error.message}`);
      // Fallback: create single subtask
      return [
        {
          id: generateId("sub"),
          instruction,
          agentType: "executor",
          dependencies: [],
          status: "pending",
        },
      ];
    }
  }

  /**
   * Assign subtasks to available agents
   */
  private async assignSubtasks(task: CoordinationTask): Promise<void> {
    for (const subtask of task.subtasks) {
      const availableAgents = this.getAvailableAgents(subtask.agentType);

      if (availableAgents.length > 0) {
        // Select best agent (simple: first available)
        const agent = availableAgents[0];
        subtask.status = "assigned";
        agent.status = "busy";
        agent.currentTask = subtask.id;

        this.sendMessage({
          from: "coordinator",
          to: agent.id,
          type: "notification",
          content: { action: "assign", subtask },
          taskId: task.id,
        });

        log.info(`Subtask ${subtask.id} assigned to agent ${agent.name}`);
      } else {
        log.warn(
          `No available agent for subtask ${subtask.id} (type: ${subtask.agentType})`,
        );
      }
    }
  }

  /**
   * Execute coordination
   */
  private async executeCoordination(
    task: CoordinationTask,
    timeoutMs: number,
  ): Promise<CoordinationResult> {
    const startTime = nowMs();
    const subtaskResults = new Map<string, any>();
    const agentUsage = new Map<string, number>();

    // Execute subtasks with dependency resolution
    const pendingSubtasks = [...task.subtasks];

    while (pendingSubtasks.length > 0) {
      // Check timeout
      if (nowMs() - startTime > timeoutMs) {
        log.warn(`[${task.id}] Coordination timeout`);
        return {
          success: false,
          taskId: task.id,
          durationMs: nowMs() - startTime,
          subtaskResults,
          agentUsage,
          messages: this.messages.filter((m) => m.taskId === task.id),
        };
      }

      // Find subtasks with satisfied dependencies
      const executable = pendingSubtasks.filter(
        (st) =>
          st.status === "assigned" &&
          st.dependencies.every((depId) => {
            const dep = task.subtasks.find((s) => s.id === depId);
            return dep?.status === "completed";
          }),
      );

      if (executable.length === 0) {
        // Check for deadlocks
        const stuck = pendingSubtasks.filter(
          (st) => st.status !== "completed" && st.status !== "failed",
        );
        if (stuck.length === pendingSubtasks.length) {
          log.error(`[${task.id}] Deadlock detected`);
          return {
            success: false,
            taskId: task.id,
            durationMs: nowMs() - startTime,
            subtaskResults,
            agentUsage,
            messages: this.messages.filter((m) => m.taskId === task.id),
          };
        }
        await sleep(100);
        continue;
      }

      // Execute subtasks in parallel
      await Promise.all(
        executable.map(async (subtask) => {
          subtask.status = "in_progress";
          task.startedAt = nowMs();

          const agent = Array.from(this.agents.values()).find(
            (a) => a.currentTask === subtask.id,
          );
          if (!agent) {
            subtask.status = "failed";
            subtask.error = "Agent not found";
            return;
          }

          try {
            // Simulate subtask execution
            log.info(
              `[${task.id}] Executing subtask ${subtask.id} with agent ${agent.name}`,
            );
            await sleep(1000); // Simulate work

            // Execute via inference
            const result = await this.inferenceEngine.infer({
              messages: [{ role: "user", content: subtask.instruction }],
              mode: "balanced",
            });

            subtask.status = "completed";
            subtask.result = result.content;
            subtaskResults.set(subtask.id, result.content);

            // Update agent stats
            agent.performance.tasksCompleted++;
            agent.status = "idle";
            agent.currentTask = undefined;
            agent.lastActive = nowMs();

            agentUsage.set(agent.id, (agentUsage.get(agent.id) || 0) + 1);

            this.sendMessage({
              from: agent.id,
              to: "coordinator",
              type: "response",
              content: { subtaskId: subtask.id, result: result.content },
              taskId: task.id,
            });
          } catch (error: any) {
            subtask.status = "failed";
            subtask.error = error.message;
            agent.status = "error";

            this.sendMessage({
              from: agent.id,
              to: "coordinator",
              type: "notification",
              content: { subtaskId: subtask.id, error: error.message },
              taskId: task.id,
            });
          }
        }),
      );

      // Remove completed/failed from pending
      for (let i = pendingSubtasks.length - 1; i >= 0; i--) {
        if (
          pendingSubtasks[i].status === "completed" ||
          pendingSubtasks[i].status === "failed"
        ) {
          pendingSubtasks.splice(i, 1);
        }
      }
    }

    // Check if all subtasks completed successfully
    const allCompleted = task.subtasks.every((st) => st.status === "completed");
    task.status = allCompleted ? "completed" : "failed";
    task.completedAt = nowMs();

    return {
      success: allCompleted,
      taskId: task.id,
      durationMs: nowMs() - startTime,
      subtaskResults,
      agentUsage,
      messages: this.messages.filter((m) => m.taskId === task.id),
    };
  }

  /**
   * Send coordination message
   */
  private sendMessage(
    message: Omit<CoordinationMessage, "id" | "timestamp">,
  ): void {
    const fullMessage: CoordinationMessage = {
      ...message,
      id: generateId("msg"),
      timestamp: nowMs(),
    };
    this.messages.push(fullMessage);
    log.debug(
      `Message sent: ${fullMessage.from} -> ${fullMessage.to} (${fullMessage.type})`,
    );
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): CoordinationTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all tasks
   */
  getAllTasks(): CoordinationTask[] {
    return Array.from(this.tasks.values());
  }
}

// Export multi-agent utilities
export const MultiAgentCoordination = {
  MultiAgentCoordinator,
};

export default MultiAgentCoordination;
