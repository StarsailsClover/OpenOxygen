/**
 * OpenOxygen - Vision Module Index (26w15aD Phase 7)
 *
 * Visual understanding and GUI automation using vision models
 */

// UI-TARS
export {
  UITarsController,
  type UITarsAction,
  type UITarsPrediction,
  type UITarsConfig,
} from "./ui-tars.js";

// Qwen-VL
export {
  QwenVLController,
  type QwenVLConfig,
  type VisualElement,
  type VisualAnalysis,
} from "./qwen-vl.js";

// Default exports
import { UITarsController } from "./ui-tars.js";
import { QwenVLController } from "./qwen-vl.js";

export const Vision = {
  UITars: UITarsController,
  QwenVL: QwenVLController,
};

export default Vision;
