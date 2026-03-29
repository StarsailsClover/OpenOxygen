/**
 * OpenOxygen �?OxygenStepRecorder (OSR) Player (26w15aD Phase 2)
 *
 * 操作回放系统
 * 按时间戳回放录制的操�?
 */

import { createSubsystemLogger } from "../logging/index.js";
import { sleep } from "../utils/index.js";
import {
  mouseMove,
  mouseClick,
  mouseDoubleClick,
  mouseDrag,
  mouseScroll,
} from "../native/mouse.js";
import { keyPress, keyCombination, typeText } from "../native/keyboard.js";
import type { RecordedStep, RecordingSession, StepType } from "./recorder.js";

const log = createSubsystemLogger("osr/player");

// Playback states
export type PlaybackState = "idle" | "playing" | "paused" | "stopped";

// Playback options
export interface PlaybackOptions {
  speed?: number; // 0.5, 1, 2, etc.
  startIndex?: number;
  endIndex?: number;
  onStep?: (step: RecordedStep, index: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// Playback session
export interface PlaybackSession {
  recording: RecordingSession;
  state: PlaybackState;
  currentIndex: number;
  options: PlaybackOptions;
}

// Active playback
let activePlayback: PlaybackSession | null = null;

// Playback abort controller
let abortController: AbortController | null = null;

/**
 * Play recording
 * @param recording - Recording session to play
 * @param options - Playback options
 */
export async function playRecording(
  recording: RecordingSession,
  options: PlaybackOptions = {},
): Promise<boolean> {
  if (activePlayback?.state === "playing") {
    log.warn("Already playing a recording");
    return false;
  }

  log.info(
    `Starting playback: ${recording.name} (${recording.steps.length} steps)`,
  );

  const speed = options.speed || 1;
  const startIndex = options.startIndex || 0;
  const endIndex = options.endIndex || recording.steps.length - 1;

  activePlayback = {
    recording,
    state: "playing",
    currentIndex: startIndex,
    options,
  };

  abortController = new AbortController();

  try {
    for (let i = startIndex; i <= endIndex && i < recording.steps.length; i++) {
      // Check if aborted
      if (abortController.signal.aborted) {
        log.info("Playback aborted");
        break;
      }

      // Check if paused
      while (activePlayback.state === "paused") {
        await sleep(100);
        if (abortController.signal.aborted) break;
      }

      if (abortController.signal.aborted) break;

      const step = recording.steps[i];
      activePlayback.currentIndex = i;

      log.debug(
        `Playing step ${i + 1}/${recording.steps.length}: ${step.type}`,
      );

      // Execute step
      await executeStep(step, speed);

      // Call step callback
      options.onStep?.(step, i);

      // Calculate delay to next step
      if (i < endIndex && i < recording.steps.length - 1) {
        const nextStep = recording.steps[i + 1];
        const delay = (nextStep.timestamp - step.timestamp) / speed;

        // Minimum delay of 50ms, maximum of 5000ms
        const actualDelay = Math.max(50, Math.min(delay, 5000));

        await sleep(actualDelay);
      }
    }

    log.info("Playback completed");
    options.onComplete?.();
  } catch (error) {
    log.error(`Playback error: ${error.message}`);
    options.onError?.(error as Error);
  } finally {
    activePlayback = null;
    abortController = null;
  }

  return true;
}

/**
 * Execute a single step
 */
async function executeStep(step: RecordedStep, speed: number): Promise<void> {
  switch (step.type) {
    case "mouse_move":
      await executeMouseMove(step.data);
      break;
    case "mouse_click":
      await executeMouseClick(step.data);
      break;
    case "mouse_drag":
      await executeMouseDrag(step.data);
      break;
    case "key_press":
      await executeKeyPress(step.data);
      break;
    case "key_combination":
      await executeKeyCombination(step.data);
      break;
    case "type_text":
      await executeTypeText(step.data, speed);
      break;
    case "window_focus":
      // Window focus changes are informational
      log.debug(`Window focus: ${step.data.windowTitle || step.data.action}`);
      break;
    case "delay":
      await sleep(step.data.duration / speed);
      break;
    default:
      log.warn(`Unknown step type: ${step.type}`);
  }
}

/**
 * Execute mouse move
 */
async function executeMouseMove(data: { x: number; y: number }): Promise<void> {
  mouseMove(data.x, data.y);
}

/**
 * Execute mouse click
 */
async function executeMouseClick(data: {
  x: number;
  y: number;
  button: string;
}): Promise<void> {
  mouseMove(data.x, data.y);
  await sleep(50);
  mouseClick(data.button as any);
}

/**
 * Execute mouse drag
 */
async function executeMouseDrag(data: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  button: string;
}): Promise<void> {
  mouseDrag(data.startX, data.startY, data.endX, data.endY, data.button as any);
}

/**
 * Execute key press
 */
async function executeKeyPress(data: { key: string }): Promise<void> {
  keyPress(data.key as any);
}

/**
 * Execute key combination
 */
async function executeKeyCombination(data: { keys: string[] }): Promise<void> {
  keyCombination(data.keys as any);
}

/**
 * Execute type text
 */
async function executeTypeText(
  data: { text: string },
  speed: number,
): Promise<void> {
  // Type text with speed adjustment
  const delay = Math.max(10, 50 / speed);

  for (const char of data.text) {
    typeText(char);
    await sleep(delay);
  }
}

/**
 * Pause playback
 */
export function pausePlayback(): boolean {
  if (!activePlayback || activePlayback.state !== "playing") {
    return false;
  }

  activePlayback.state = "paused";
  log.info("Playback paused");
  return true;
}

/**
 * Resume playback
 */
export function resumePlayback(): boolean {
  if (!activePlayback || activePlayback.state !== "paused") {
    return false;
  }

  activePlayback.state = "playing";
  log.info("Playback resumed");
  return true;
}

/**
 * Stop playback
 */
export function stopPlayback(): boolean {
  if (!activePlayback) {
    return false;
  }

  abortController?.abort();
  activePlayback.state = "stopped";
  log.info("Playback stopped");
  return true;
}

/**
 * Get playback state
 */
export function getPlaybackState(): PlaybackState {
  return activePlayback?.state || "idle";
}

/**
 * Get current playback position
 */
export function getCurrentPosition(): number {
  return activePlayback?.currentIndex || 0;
}

/**
 * Get total steps
 */
export function getTotalSteps(): number {
  return activePlayback?.recording.steps.length || 0;
}

/**
 * Seek to specific step
 * @param index - Step index to seek to
 */
export function seekTo(index: number): boolean {
  if (!activePlayback) {
    return false;
  }

  if (index < 0 || index >= activePlayback.recording.steps.length) {
    return false;
  }

  activePlayback.currentIndex = index;
  log.info(`Seeked to step ${index}`);
  return true;
}

/**
 * Get step at index
 */
export function getStepAt(index: number): RecordedStep | null {
  if (!activePlayback) {
    return null;
  }

  return activePlayback.recording.steps[index] || null;
}

// Export all functions
export default {
  playRecording,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  getPlaybackState,
  getCurrentPosition,
  getTotalSteps,
  seekTo,
  getStepAt,
};
