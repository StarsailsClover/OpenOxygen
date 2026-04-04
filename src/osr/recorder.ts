/**
<<<<<<< HEAD
 * OpenOxygen �?OxygenStepRecorder (OSR) Recorder (26w15aD Phase 2)
=======
 * OpenOxygen - OSR Recorder
>>>>>>> dev
 *
 * 操作录制系统
 * 记录鼠标、键盘、窗口操作并同步截图
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";

const log = createSubsystemLogger("osr/recorder");

// Recording states
export type RecordingState = "idle" | "recording" | "paused";

// Step types
export type StepType =
  | "mouse_move"
  | "mouse_click"
  | "mouse_drag"
  | "key_press"
  | "key_combination"
  | "type_text"
  | "window_focus"
  | "screenshot"
  | "delay";

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
  options: { captureScreenshots?: boolean; trackMouse?: boolean } = {},
): RecordingSession {
  if (activeSession?.state === "recording") {
    throw new Error("Recording already in progress");
  }

  const session: RecordingSession = {
    id: generateId("rec"),
    name,
    startTime: nowMs(),
    steps: [],
    state: "recording",
    metadata: {
      screenResolution: getScreenResolution(),
    },
  };

  activeSession = session;
  log.info(`Started recording: ${name} (${session.id})`);

  // Start recording loops
  if (options.trackMouse !== false) {
    startMouseTracking();
  }
  
  if (options.captureScreenshots !== false) {
    startScreenshotCapture();
  }

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

  // Stop recording loops
  stopRecordingLoops();

  activeSession.state = "idle";
  activeSession.endTime = nowMs();

  const session = { ...activeSession };
  log.info(`Stopped recording: ${session.name} (${session.steps.length} steps)`);
  
  activeSession = null;
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
  stopRecordingLoops();
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
  log.info("Recording resumed");
  return true;
}

/**
 * Add step to recording
 */
export function addStep(
  type: StepType,
  data: any,
  screenshot?: string,
): RecordedStep | null {
  if (!activeSession || activeSession.state !== "recording") {
    return null;
  }

  const step: RecordedStep = {
    id: generateId("step"),
    type,
    timestamp: nowMs(),
    data,
    screenshot,
  };

  activeSession.steps.push(step);
  return step;
}

/**
 * Get active session
 */
export function getActiveSession(): RecordingSession | null {
  return activeSession;
}

/**
 * Start mouse tracking
 */
function startMouseTracking(): void {
  // TODO: Implement native mouse tracking
  // For now, use polling approach
  const trackMouse = async () => {
    if (!activeSession || activeSession.state !== "recording") {
      return;
    }

    try {
      // Get current mouse position (placeholder)
      const pos = await getMousePosition();
      
      // Only record if position changed significantly
      const dx = Math.abs(pos.x - lastMousePos.x);
      const dy = Math.abs(pos.y - lastMousePos.y);
      
      if (dx > 5 || dy > 5) {
        addStep("mouse_move", { x: pos.x, y: pos.y });
        lastMousePos = pos;
      }
    } catch (error) {
      log.error(`Mouse tracking error: ${error}`);
    }
  };

  recordingInterval = setInterval(trackMouse, MOUSE_TRACK_INTERVAL);
}

/**
 * Start screenshot capture
 */
function startScreenshotCapture(): void {
  const capture = async () => {
    if (!activeSession || activeSession.state !== "recording") {
      return;
    }

    try {
      // TODO: Implement screenshot capture
      // const screenshot = await captureScreenshot();
      // addStep("screenshot", { timestamp: nowMs() }, screenshot);
    } catch (error) {
      log.error(`Screenshot capture error: ${error}`);
    }
  };

  // Capture immediately and then periodically
  capture();
  setInterval(capture, SCREENSHOT_INTERVAL);
}

/**
 * Stop recording loops
 */
function stopRecordingLoops(): void {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
}

/**
 * Get screen resolution
 */
function getScreenResolution(): { width: number; height: number } {
  // TODO: Get actual screen resolution
  return { width: 1920, height: 1080 };
}

/**
 * Get mouse position
 */
async function getMousePosition(): Promise<{ x: number; y: number }> {
  // TODO: Get actual mouse position from native module
  return { x: 0, y: 0 };
}

/**
 * Export recording to file
 */
export function exportRecording(
  session: RecordingSession,
  format: "json" | "osr" = "json",
): string {
  if (format === "json") {
    return JSON.stringify(session, null, 2);
  }
  
  // OSR format (custom binary format)
  // TODO: Implement binary serialization
  return JSON.stringify(session);
}

/**
 * Import recording from file
 */
export function importRecording(data: string): RecordingSession {
  try {
    return JSON.parse(data) as RecordingSession;
  } catch (error) {
    throw new Error(`Failed to import recording: ${error}`);
  }
}

// === Exports ===

export {
  exportRecording,
  importRecording,
};

export default {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  addStep,
  getActiveSession,
  exportRecording,
  importRecording,
};
