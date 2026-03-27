/**
 * OpenOxygen - Phase 1 Visual GUI Automation (26w15aD Phase 7)
 *
 * Phase 1: 视觉模型驱动的 GUI 自动化
 * - 基于 UI-TARS/Qwen-VL 的视觉理解
 * - 智能元素定位与操作
 * - 视觉反馈循环
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
import { UITarsController } from "../vision/ui-tars.js";
import { QwenVLController } from "../vision/qwen-vl.js";
import type { InferenceEngine } from "../inference/engine/index.js";
import type { GUIElement } from "../gui/detection.js";

const log = createSubsystemLogger("phase1/visual-gui");

// Visual GUI action
export type VisualGUIAction =
  | { type: "click"; element: GUIElement; reason: string }
  | { type: "type"; element: GUIElement; text: string; reason: string }
  | { type: "scroll"; direction: "up" | "down" | "left" | "right"; amount: number; reason: string }
  | { type: "wait"; durationMs: number; reason: string }
  | { type: "screenshot"; reason: string }
  | { type: "finish"; answer?: string }
  | { type: "fail"; reason: string };

// Visual GUI task
export interface VisualGUITask {
  id: string;
  instruction: string;
  maxSteps: number;
  timeoutMs: number;
  screenshotIntervalMs: number;
}

// Task result
export interface VisualGUITaskResult {
  success: boolean;
  taskId: string;
  steps: number;
  durationMs: number;
  answer?: string;
  error?: string;
  actionHistory: VisualGUIAction[];
}

/**
 * Phase 1 Visual GUI Automation Controller
 */
export class VisualGUIController {
  private uiTars: UITarsController;
  private qwenVL: QwenVLController;
  private inferenceEngine: InferenceEngine;

  constructor(inferenceEngine: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
    this.uiTars = new UITarsController(inferenceEngine);
    this.qwenVL = new QwenVLController(inferenceEngine);
  }

  /**
   * Execute visual GUI task
   */
  async executeTask(
    instruction: string,
    options: {
      maxSteps?: number;
      timeoutMs?: number;
      onStep?: (step: number, action: VisualGUIAction) => void;
      onComplete?: (result: VisualGUITaskResult) => void;
    } = {}
  ): Promise<VisualGUITaskResult> {
    const taskId = generateId("vgt");
    const startTime = nowMs();
    const maxSteps = options.maxSteps || 50;
    const timeoutMs = options.timeoutMs || 300000;

    log.info(`[${taskId}] Starting visual GUI task: ${instruction}`);

    const actionHistory: VisualGUIAction[] = [];
    let step = 0;

    try {
      while (step < maxSteps) {
        // Check timeout
        if (nowMs() - startTime > timeoutMs) {
          log.warn(`[${taskId}] Task timeout`);
          return {
            success: false,
            taskId,
            steps: step,
            durationMs: nowMs() - startTime,
            error: "Task timeout",
            actionHistory,
          };
        }

        step++;
        log.info(`[${taskId}] Step ${step}/${maxSteps}`);

        // Capture screenshot
        const screenshot = await this.captureScreenshot();

        // Analyze with Qwen-VL
        const visualElements = await this.qwenVL.detectUIElements(screenshot);
        log.debug(`[${taskId}] Detected ${visualElements.length} visual elements`);

        // Get next action from UI-TARS
        const prediction = await this.uiTars.executeTask(instruction, {
          initialScreenshot: screenshot,
        });

        // Convert to VisualGUIAction
        const action = await this.convertToAction(prediction, visualElements);
        actionHistory.push(action);

        // Notify callback
        options.onStep?.(step, action);

        // Execute action
        const shouldContinue = await this.executeAction(action);

        if (!shouldContinue) {
          const result: VisualGUITaskResult = {
            success: true,
            taskId,
            steps: step,
            durationMs: nowMs() - startTime,
            answer: (action as any).answer,
            actionHistory,
          };
          options.onComplete?.(result);
          log.info(`[${taskId}] Task completed successfully`);
          return result;
        }

        // Wait between steps
        await sleep(1000);
      }

      log.warn(`[${taskId}] Reached max steps`);
      return {
        success: false,
        taskId,
        steps: step,
        durationMs: nowMs() - startTime,
        error: "Reached maximum steps",
        actionHistory,
      };
    } catch (error: any) {
      log.error(`[${taskId}] Task failed: ${error.message}`);
      return {
        success: false,
        taskId,
        steps: step,
        durationMs: nowMs() - startTime,
        error: error.message,
        actionHistory,
      };
    }
  }

  /**
   * Capture screenshot
   */
  private async captureScreenshot(): Promise<string> {
    // Placeholder - integrate with native screenshot
    log.debug("Capturing screenshot");
    return "base64_placeholder";
  }

  /**
   * Convert UI-TARS prediction to VisualGUIAction
   */
  private async convertToAction(
    prediction: any,
    elements: any[]
  ): Promise<VisualGUIAction> {
    // Map UI-TARS action to VisualGUIAction
    const action = prediction.action;

    switch (action.type) {
      case "click":
        return {
          type: "click",
          element: elements[0] || { id: "unknown", type: "unknown", bounds: { x: action.x, y: action.y, width: 10, height: 10 }, center: { x: action.x, y: action.y }, confidence: 0.8, enabled: true, visible: true, focused: false, source: "vision" },
          reason: prediction.thought,
        };

      case "type":
        return {
          type: "type",
          element: elements[0] || { id: "unknown", type: "input", bounds: { x: 0, y: 0, width: 100, height: 30 }, center: { x: 50, y: 15 }, confidence: 0.8, enabled: true, visible: true, focused: false, source: "vision" },
          text: action.text,
          reason: prediction.thought,
        };

      case "finish":
        return {
          type: "finish",
          answer: action.answer,
        };

      case "fail":
        return {
          type: "fail",
          reason: action.reason,
        };

      default:
        return {
          type: "wait",
          durationMs: 1000,
          reason: "Unknown action type",
        };
    }
  }

  /**
   * Execute visual GUI action
   */
  private async executeAction(action: VisualGUIAction): Promise<boolean> {
    log.info(`Executing action: ${action.type}`);

    switch (action.type) {
      case "click":
        log.debug(`Clicking element at (${action.element.center.x}, ${action.element.center.y})`);
        // await mouseMove(action.element.center.x, action.element.center.y);
        // await mouseClick("left");
        break;

      case "type":
        log.debug(`Typing "${action.text}" into element`);
        // await typeText(action.text);
        break;

      case "scroll":
        log.debug(`Scrolling ${action.direction} by ${action.amount}`);
        break;

      case "wait":
        await sleep(action.durationMs);
        break;

      case "screenshot":
        // Screenshot will be captured in next iteration
        break;

      case "finish":
        log.info(`Task finished: ${action.answer}`);
        return false;

      case "fail":
        log.error(`Task failed: ${action.reason}`);
        return false;

      default:
        log.warn(`Unknown action type: ${(action as any).type}`);
    }

    return true;
  }
}

// Export Phase 1 utilities
export const Phase1VisualGUI = {
  VisualGUIController,
};

export default Phase1VisualGUI;
