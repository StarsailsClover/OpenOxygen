/**
 * OpenOxygen - GUI Module Index (26w15aD Phase 7)
 *
 * GUI automation and element detection
 */

// Element detection
export {
  detectElements,
  findElementByText,
  findElementsByType,
  findElementAtPosition,
  waitForElement,
  getElementHierarchy,
  clearElementCache,
  type GUIElement,
  type GUIElementType,
  type DetectionOptions,
} from "./detection.js";

// Default export
import * as detection from "./detection.js";

export const GUI = {
  ...detection,
};

export default GUI;
