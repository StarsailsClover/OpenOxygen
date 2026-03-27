/**
 * OpenOxygen — OxygenStepRecorder (OSR) Recorder (26w15aD Phase 2)
 *
 * 操作录制系统
 * 记录鼠标、键盘、窗口操作并同步截屏
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import { getMousePosition } from "../native/mouse.js";
import { GlobalMemory } from "../memory/global/index.js";

const log = createSubsystemLogger("osr/recorder");

// Recording states
export type RecordingState = "idle" | "recording" | "paused";

// Step types
export type StepType = "mouse_move" | "mouse_click" | "mouse_drag" | "key_press" | "key_combination" | "type_text" | "window_focus" | "screenshot" | "delay";

// Recorded step
export interface RecordedStep {
  id: string;
  type: StepType;
  timestamp: number;
  data: any;
  screenshot?: string; // Base64 encoded screenshot
}

// Recording session
export interface RecordingSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  steps: RecordedStep[];
  state: RecordingState;
  metadata: {
    app?: string;
    windowTitle?: string;
    screenResolution?: { width: number; height: number };
  };
}

// Active recording session
let activeSession: RecordingSession | null = null;

// Recording interval
let recordingInterval: NodeJS.Timeout | null = null;

// Screenshot interval (ms)
const SCREENSHOT_INTERVAL = 1000;

// Mouse tracking interval (ms)
const MOUSE_TRACK_INTERVAL = 50;

// Last mouse position
let lastMousePos = { x: 0, y: 0 };

/**
 * Start recording
 * @param name - Recording name
 * @param options - Recording options
 */
export function startRecording(
  name: string,
  options: { captureScreenshots?: boolean; trackMouse?: boolean } = {}
): RecordingSession {
  if (activeSession?.state === "recording") {
    throw new Error("Already recording");
  }
  
  log.info(`Starting recording: ${name}`);
  
  const session: RecordingSession = {
    id: generateId("osr"),
    name,
    startTime: nowMs(),
    steps: [],
    state: "recording",
    metadata: {
      screenResolution: getScreenResolution(),
    },
  };
  
  activeSession = session;
  
  // Start mouse tracking
  if (options.trackMouse !== false) {
    startMouseTracking();
  }
  
  // Start screenshot capture
  if (options.captureScreenshots !== false) {
    startScreenshotCapture();
  }
  
  // Record initial step
  recordStep({
    type: "window_focus",
    data: { action: "recording_started" },
  });
  
  log.info(`Recording started: ${session.id}`);
  return session;
}

/**
 * Stop recording
 */
export function stopRecording(): RecordingSession | null {
  if (!activeSession) {
    log.warn("No active recording to stop");
    return null;
  }
  
  log.info("Stopping recording");
  
  // Stop tracking
  stopMouseTracking();
  stopScreenshotCapture();
  
  // Record final step
  recordStep({
    type: "window_focus",
    data: { action: "recording_stopped" },
  });
  
  activeSession.endTime = nowMs();
  activeSession.state = "idle";
  
  // Save to memory
  saveRecordingToMemory(activeSession);
  
  const session = activeSession;
  activeSession = null;
  
  log.info(`Recording stopped: ${session.id}, ${session.steps.length} steps`);
  return session;
}

/**
 * Pause recording
 */
export function pauseRecording(): boolean {
  if (!activeSession || activeSession.state !== "recording") {
    return false;
  }
  
  activeSession.state = "paused";
  stopMouseTracking();
  stopScreenshotCapture();
  
  recordStep({
    type: "window_focus",
    data: { action: "recording_paused" },
  });
  
  log.info("Recording paused");
  return true;
}

/**
 * Resume recording
 */
export function resumeRecording(): boolean {
  if (!activeSession || activeSession.state !== "paused") {
    return false;
  }
  
  activeSession.state = "recording";
  startMouseTracking();
  startScreenshotCapture();
  
  recordStep({
    type: "window_focus",
    data: { action: "recording_resumed" },
  });
  
  log.info("Recording resumed");
  return true;
}

/**
 * Record a step
 */
export function recordStep(partialStep: Omit<RecordedStep, "id" | "timestamp">): void {
  if (!activeSession || activeSession.state !== "recording") {
    return;
  }
  
  const step: RecordedStep = {
    id: generateId("step"),
    timestamp: nowMs(),
    ...partialStep,
  };
  
  activeSession.steps.push(step);
  log.debug(`Recorded step: ${step.type}`);
}

/**
 * Record mouse move
 */
export function recordMouseMove(x: number, y: number): void {
  recordStep({
    type: "mouse_move",
    data: { x, y },
  });
}

/**
 * Record mouse click
 */
export function recordMouseClick(x: number, y: number, button: string): void {
  recordStep({
    type: "mouse_click",
    data: { x, y, button },
  });
}

/**
 * Record mouse drag
 */
export function recordMouseDrag(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  button: string
): void {
  recordStep({
    type: "mouse_drag",
    data: { startX, startY, endX, endY, button },
  });
}

/**
 * Record key press
 */
export function recordKeyPress(key: string): void {
  recordStep({
    type: "key_press",
    data: { key },
  });
}

/**
 * Record key combination
 */
export function recordKeyCombination(keys: string[]): void {
  recordStep({
    type: "key_combination",
    data: { keys },
  });
}

/**
 * Record text input
 */
export function recordTypeText(text: string): void {
  recordStep({
    type: "type_text",
    data: { text },
  });
}

/**
 * Record window focus change
 */
export function recordWindowFocus(windowTitle: string, app?: string): void {
  recordStep({
    type: "window_focus",
    data: { windowTitle, app },
  });
}

/**
 * Start mouse tracking
 */
function startMouseTracking(): void {
  if (recordingInterval) return;
  
  recordingInterval = setInterval(() => {
    const pos = getMousePosition();
    if (pos) {
      // Only record if position changed significantly
      const dx = Math.abs(pos.x - lastMousePos.x);
      const dy = Math.abs(pos.y - lastMousePos.y);
      
      if (dx > 5 || dy > 5) {
        recordMouseMove(pos.x, pos.y);
        lastMousePos = pos;
      }
    }
  }, MOUSE_TRACK_INTERVAL);
}

/**
 * Stop mouse tracking
 */
function stopMouseTracking(): void {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
}

// Screenshot capture interval
let screenshotInterval: NodeJS.Timeout | null = null;

/**
 * Start screenshot capture
 */
function startScreenshotCapture(): void {
  if (screenshotInterval) return;
  
  screenshotInterval = setInterval(() => {
    captureScreenshot().then(screenshot => {
      if (screenshot && activeSession) {
        // Attach screenshot to last step or create new step
        const lastStep = activeSession.steps[activeSession.steps.length - 1];
        if (lastStep) {
          lastStep.screenshot = screenshot;
        }
      }
    });
  }, SCREENSHOT_INTERVAL);
}

/**
 * Stop screenshot capture
 */
function stopScreenshotCapture(): void {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

/**
 * Capture screenshot
 */
async function captureScreenshot(): Promise<string | null> {
  try {
    const native = require("../native-bridge.js");
    if (native.captureScreenshot) {
      return native.captureScreenshot();
    }
    return null;
  } catch (error) {
    log.error(`Screenshot capture failed: ${error.message}`);
    return null;
  }
}

/**
 * Get screen resolution
 */
function getScreenResolution(): { width: number; height: number } {
  // Default resolution
  return { width: 1920, height: 1080 };
}

/**
 * Save recording to memory
 */
function saveRecordingToMemory(session: RecordingSession): void {
  try {
    const memory = new GlobalMemory(".state", ".state/osr-recordings.db");
    memory.setPreference(`osr_${session.id}`, JSON.stringify(session));
    memory.close();
    log.info(`Recording saved to memory: ${session.id}`);
  } catch (error) {
    log.error(`Failed to save recording: ${error.message}`);
  }
}

/**
 * Get active recording session
 */
export function getActiveSession(): RecordingSession | null {
  return activeSession;
}

/**
 * Check if recording
 */
export function isRecording(): boolean {
  return activeSession?.state === "recording";
}

// Export all functions
export default {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  recordStep,
  recordMouseMove,
  recordMouseClick,
  recordMouseDrag,
  recordKeyPress,
  recordKeyCombination,
  recordTypeText,
  recordWindowFocus,
  getActiveSession,
  isRecording,
};
