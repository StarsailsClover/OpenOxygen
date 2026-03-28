/**
 * OpenOxygen - Natural Language Module Index (26w15aF Phase A.3)
 *
 * P-2: 自然语言任务编排系统
 */

// Task Orchestrator
export {
  NaturalLanguageOrchestrator,
  type TaskIntent,
  type ScriptComponent,
  type WorkflowStep,
  type GeneratedWorkflow,
  type ExecutionResult,
} from "./task-orchestrator.js";

// Export component library separately
export { COMPONENT_LIBRARY } from "./task-orchestrator.js"; // ...existing code...

// Default export
import { NaturalLanguageOrchestrator } from "./task-orchestrator.js";

export const NaturalLanguage = {
  Orchestrator: NaturalLanguageOrchestrator,
};

export default NaturalLanguage;
