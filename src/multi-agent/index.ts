/**
<<<<<<< HEAD
 * OpenOxygen �?Multi-Agent Module (26w15aD Phase 5)
=======
 * OpenOxygen - Multi-Agent Module
>>>>>>> dev
 *
 * 统一导出�?Agent 功能
 */

// Runtime
export {
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
  type Agent,
  type AgentType,
  type AgentCapability,
  type AgentStatus,
  type TaskAssignment,
} from "./runtime.js";

// Communication
export {
  sendMessage,
  broadcastMessage,
  onMessage,
  offMessage,
  requestTask,
  sendResult,
  sendError,
  sendHeartbeat,
  type AgentMessage,
  type MessageType,
} from "./communication.js";

// Default export
import * as runtime from "./runtime.js";
import * as communication from "./communication.js";

export const MultiAgent = {
  ...runtime,
  ...communication,
};

export default MultiAgent;
