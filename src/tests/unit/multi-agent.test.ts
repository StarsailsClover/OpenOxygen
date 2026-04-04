/**
 * Multi-Agent System Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  findBestAgent,
  delegateTask,
  getAssignment,
  cancelTask,
  getTaskStatistics,
  type Agent,
} from "../../multi-agent/runtime.js";
import {
  sendMessage,
  broadcastMessage,
  onMessage,
  offMessage,
} from "../../multi-agent/communication.js";

describe("Multi-Agent System", () => {
  beforeEach(() => {
    // Clean up registered agents
    const agents = listAgents();
    for (const agent of agents) {
      unregisterAgent(agent.id);
    }
  });

  describe("Agent Registration", () => {
    it("should register an agent", () => {
      const agent = registerAgent({
        name: "test-agent",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: {
          version: "1.0.0",
          platform: "win32",
          maxConcurrentTasks: 1,
        },
      });

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe("test-agent");
      expect(agent.status).toBe("idle");
    });

    it("should unregister an agent", () => {
      const agent = registerAgent({
        name: "test-agent",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: {
          version: "1.0.0",
          platform: "win32",
          maxConcurrentTasks: 1,
        },
      });

      const result = unregisterAgent(agent.id);
      expect(result).toBe(true);
      expect(getAgent(agent.id)).toBeUndefined();
    });

    it("should list all agents", () => {
      registerAgent({
        name: "agent-1",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      registerAgent({
        name: "agent-2",
        type: "coordinator",
        capabilities: ["terminal", "gui"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 5 },
      });

      const agents = listAgents();
      expect(agents).toHaveLength(2);
    });
  });

  describe("Agent Selection", () => {
    it("should find best agent by capability", () => {
      const worker = registerAgent({
        name: "worker",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      registerAgent({
        name: "gui-agent",
        type: "worker",
        capabilities: ["gui"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      const best = findBestAgent(["terminal"]);
      expect(best?.id).toBe(worker.id);
    });

    it("should return null if no agent matches", () => {
      registerAgent({
        name: "worker",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      const best = findBestAgent(["vision"]);
      expect(best).toBeNull();
    });

    it("should not select busy agents", () => {
      registerAgent({
        name: "busy-agent",
        type: "worker",
        capabilities: ["terminal"],
        status: "busy",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      const best = findBestAgent(["terminal"]);
      expect(best).toBeNull();
    });
  });

  describe("Task Delegation", () => {
    it("should delegate task to agent", () => {
      registerAgent({
        name: "worker",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      const assignment = delegateTask("run command", ["terminal"]);
      expect(assignment.id).toBeDefined();
      expect(assignment.status).toBe("assigned");
    });

    it("should throw if no agent available", () => {
      expect(() => {
        delegateTask("run command", ["terminal"]);
      }).toThrow("No available agent");
    });

    it("should cancel task", () => {
      registerAgent({
        name: "worker",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      const assignment = delegateTask("run command", ["terminal"]);
      const result = cancelTask(assignment.id);

      expect(result).toBe(true);
      expect(getAssignment(assignment.id)?.status).toBe("failed");
    });
  });

  describe("Communication", () => {
    it("should send message between agents", () => {
      const messages: any[] = [];

      const agent1 = registerAgent({
        name: "agent-1",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      const agent2 = registerAgent({
        name: "agent-2",
        type: "worker",
        capabilities: ["terminal"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 1 },
      });

      onMessage(agent2.id, (msg) => {
        messages.push(msg);
      });

      sendMessage(agent1.id, agent2.id, "task", { data: "test" });

      expect(messages).toHaveLength(1);
      expect(messages[0].from).toBe(agent1.id);
      expect(messages[0].to).toBe(agent2.id);
    });

    it("should broadcast message to all agents", () => {
      const messages: any[] = [];

      const agent1 = registerAgent({
        name: "agent-1",
        type: "coordinator",
        capabilities: ["terminal"],
        status: "idle",
        metadata: { version: "1.0.0", platform: "win32", maxConcurrentTasks: 5 },
      });

      onMessage("broadcast", (msg) => {
        messages.push(msg);
      });

      broadcastMessage(agent1.id, "heartbeat", { timestamp: Date.now() });

      expect(messages.length).toBeGreaterThan(0);
    });
  });
});
