/**
 * OpenOxygen - Phase 1 Module Index (26w15aD Phase 7)
 *
 * Phase 1: 视觉模型驱动的 GUI 自动化 + 多 Agent 协调
 */

// Visual GUI Automation
export {
  VisualGUIController,
  type VisualGUIAction,
  type VisualGUITask,
  type VisualGUITaskResult,
} from "./visual-gui.js";

// Multi-Agent Coordination
export {
  MultiAgentCoordinator,
  type Agent,
  type AgentType,
  type CoordinationTask,
  type CoordinationResult,
} from "./multi-agent.js";

// Default export
import { VisualGUIController } from "./visual-gui.js";
import { MultiAgentCoordinator } from "./multi-agent.js";

export const Phase1 = {
  VisualGUI: VisualGUIController,
  MultiAgent: MultiAgentCoordinator,
};

export default Phase1;
