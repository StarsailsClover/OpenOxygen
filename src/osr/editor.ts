/**
 * OpenOxygen �?OxygenStepRecorder (OSR) Editor (26w15aD Phase 2)
 *
 * 录制文件编辑�?
 * 插入/删除/修改操作步骤
 */

import { createSubsystemLogger } from "../logging/index.js";
import type { RecordedStep, RecordingSession } from "./recorder.js";

const log = createSubsystemLogger("osr/editor");

/**
 * Insert step at index
 * @param recording - Recording session
 * @param index - Index to insert at
 * @param step - Step to insert
 */
export function insertStep(
  recording: RecordingSession,
  index: number,
  step: Omit<RecordedStep, "id" | "timestamp">,
): RecordingSession {
  const { generateId, nowMs } = require("../utils/index.js");

  const newStep: RecordedStep = {
    id: generateId("step"),
    timestamp: nowMs(),
    ...step,
  };

  recording.steps.splice(index, 0, newStep);

  // Re-timestamp subsequent steps
  for (let i = index + 1; i < recording.steps.length; i++) {
    recording.steps[i].timestamp += 100; // Add 100ms delay
  }

  log.info(`Inserted step at index ${index}`);
  return recording;
}

/**
 * Delete step at index
 * @param recording - Recording session
 * @param index - Index to delete
 */
export function deleteStep(
  recording: RecordingSession,
  index: number,
): RecordingSession {
  if (index < 0 || index >= recording.steps.length) {
    throw new Error(`Invalid step index: ${index}`);
  }

  recording.steps.splice(index, 1);
  log.info(`Deleted step at index ${index}`);

  return recording;
}

/**
 * Modify step at index
 * @param recording - Recording session
 * @param index - Index to modify
 * @param updates - Updates to apply
 */
export function modifyStep(
  recording: RecordingSession,
  index: number,
  updates: Partial<RecordedStep>,
): RecordingSession {
  if (index < 0 || index >= recording.steps.length) {
    throw new Error(`Invalid step index: ${index}`);
  }

  const step = recording.steps[index];
  Object.assign(step, updates);

  log.info(`Modified step at index ${index}`);
  return recording;
}

/**
 * Apply coordinate offset to all mouse steps
 * @param recording - Recording session
 * @param offsetX - X offset
 * @param offsetY - Y offset
 */
export function applyCoordinateOffset(
  recording: RecordingSession,
  offsetX: number,
  offsetY: number,
): RecordingSession {
  for (const step of recording.steps) {
    switch (step.type) {
      case "mouse_move":
        step.data.x += offsetX;
        step.data.y += offsetY;
        break;
      case "mouse_click":
        step.data.x += offsetX;
        step.data.y += offsetY;
        break;
      case "mouse_drag":
        step.data.startX += offsetX;
        step.data.startY += offsetY;
        step.data.endX += offsetX;
        step.data.endY += offsetY;
        break;
    }
  }

  log.info(`Applied coordinate offset (${offsetX}, ${offsetY})`);
  return recording;
}

/**
 * Add delay step
 * @param recording - Recording session
 * @param index - Index to insert at
 * @param durationMs - Delay duration
 */
export function addDelay(
  recording: RecordingSession,
  index: number,
  durationMs: number,
): RecordingSession {
  return insertStep(recording, index, {
    type: "delay",
    data: { duration: durationMs },
  });
}

/**
 * Remove all screenshots to reduce file size
 * @param recording - Recording session
 */
export function removeScreenshots(
  recording: RecordingSession,
): RecordingSession {
  for (const step of recording.steps) {
    delete step.screenshot;
  }

  log.info("Removed all screenshots");
  return recording;
}

/**
 * Optimize recording by removing redundant steps
 * @param recording - Recording session
 */
export function optimizeRecording(
  recording: RecordingSession,
): RecordingSession {
  const optimized: RecordedStep[] = [];
  let lastMousePos = { x: -1, y: -1 };

  for (const step of recording.steps) {
    // Skip redundant mouse moves
    if (step.type === "mouse_move") {
      const dx = Math.abs(step.data.x - lastMousePos.x);
      const dy = Math.abs(step.data.y - lastMousePos.y);

      if (dx < 5 && dy < 5) {
        continue; // Skip small movements
      }

      lastMousePos = { x: step.data.x, y: step.data.y };
    }

    optimized.push(step);
  }

  recording.steps = optimized;
  log.info(
    `Optimized recording: ${optimized.length} steps (removed ${recording.steps.length - optimized.length})`,
  );

  return recording;
}

/**
 * Duplicate step
 * @param recording - Recording session
 * @param index - Index to duplicate
 */
export function duplicateStep(
  recording: RecordingSession,
  index: number,
): RecordingSession {
  if (index < 0 || index >= recording.steps.length) {
    throw new Error(`Invalid step index: ${index}`);
  }

  const step = recording.steps[index];
  const { generateId, nowMs } = require("../utils/index.js");

  const duplicated: RecordedStep = {
    ...step,
    id: generateId("step"),
    timestamp: nowMs(),
  };

  recording.steps.splice(index + 1, 0, duplicated);

  log.info(`Duplicated step at index ${index}`);
  return recording;
}

/**
 * Move step to new position
 * @param recording - Recording session
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 */
export function moveStep(
  recording: RecordingSession,
  fromIndex: number,
  toIndex: number,
): RecordingSession {
  if (fromIndex < 0 || fromIndex >= recording.steps.length) {
    throw new Error(`Invalid source index: ${fromIndex}`);
  }

  if (toIndex < 0 || toIndex >= recording.steps.length) {
    throw new Error(`Invalid destination index: ${toIndex}`);
  }

  const [step] = recording.steps.splice(fromIndex, 1);
  recording.steps.splice(toIndex, 0, step);

  log.info(`Moved step from ${fromIndex} to ${toIndex}`);
  return recording;
}

/**
 * Export recording to JSON
 * @param recording - Recording session
 */
export function exportToJSON(recording: RecordingSession): string {
  return JSON.stringify(recording, null, 2);
}

/**
 * Import recording from JSON
 * @param json - JSON string
 */
export function importFromJSON(json: string): RecordingSession {
  return JSON.parse(json);
}

// Export all functions
export default {
  insertStep,
  deleteStep,
  modifyStep,
  applyCoordinateOffset,
  addDelay,
  removeScreenshots,
  optimizeRecording,
  duplicateStep,
  moveStep,
  exportToJSON,
  importFromJSON,
};
