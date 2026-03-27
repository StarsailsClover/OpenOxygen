/**
 * OpenOxygen - Phase 2 Module Index (26w15aD Phase 7)
 *
 * Phase 2: 高级推理与自我优化
 */

// Self-Healing
export {
  SelfHealingController,
  type HealableErrorType,
  type HealingStrategy,
  type HealingResult,
} from "./self-healing.js";

// Advanced Reasoning
export {
  AdvancedReasoningController,
  type ReasoningChain,
  type ReasoningStep,
  type ReflectionResult,
} from "./advanced-reasoning.js";

// Default export
import { SelfHealingController } from "./self-healing.js";
import { AdvancedReasoningController } from "./advanced-reasoning.js";

export const Phase2 = {
  SelfHealing: SelfHealingController,
  AdvancedReasoning: AdvancedReasoningController,
};

export default Phase2;
