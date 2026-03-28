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
export 

// Step types
export 

// Recorded step
export 

// Recording session
export ;
}

// Active recording session
let activeSession | null = null;

// Recording interval
let recordingInterval.Timeout | null = null;

// Screenshot interval (ms)
const SCREENSHOT_INTERVAL = 1000;

// Mouse tracking interval (ms)
const MOUSE_TRACK_INTERVAL = 50;

// Last mouse position
let lastMousePos = { x, y };

/**
 * Start recording
 * @param name - Recording name
 * @param options - Recording options
 */
export function startRecording(
  name,
  options = {}
) {
  if (activeSession?.state === "recording") {
    throw new Error("Already recording");
  }
  
  log.info(`Starting recording: ${name}`);
  
  const session = {
    id("osr"),
    name,
    startTime(),
    steps: [],
    state: "recording",
    metadata,
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
    data,
  });
  
  log.info(`Recording started: ${session.id}`);
  return session;
}

/**
 * Stop recording
 */
export function stopRecording() | null {
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
    data,
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
export function pauseRecording() {
  if (!activeSession || activeSession.state !== "recording") {
    return false;
  }
  
  activeSession.state = "paused";
  stopMouseTracking();
  stopScreenshotCapture();
  
  recordStep({
    type: "window_focus",
    data,
  });
  
  log.info("Recording paused");
  return true;
}

/**
 * Resume recording
 */
export function resumeRecording() {
  if (!activeSession || activeSession.state !== "paused") {
    return false;
  }
  
  activeSession.state = "recording";
  startMouseTracking();
  startScreenshotCapture();
  
  recordStep({
    type: "window_focus",
    data,
  });
  
  log.info("Recording resumed");
  return true;
}

/**
 * Record a step
 */
export function recordStep(partialStep<RecordedStep, "id" | "timestamp">) {
  if (!activeSession || activeSession.state !== "recording") {
    return;
  }
  
  const step = {
    id("step"),
    timestamp(),
    ...partialStep,
  };
  
  activeSession.steps.push(step);
  log.debug(`Recorded step: ${step.type}`);
}

/**
 * Record mouse move
 */
export function recordMouseMove(x, y) {
  recordStep({
    type: "mouse_move",
    data,
  });
}

/**
 * Record mouse click
 */
export function recordMouseClick(x, y, button) {
  recordStep({
    type: "mouse_click",
    data,
  });
}

/**
 * Record mouse drag
 */
export function recordMouseDrag(
  startX,
  startY,
  endX,
  endY,
  button
) {
  recordStep({
    type: "mouse_drag",
    data,
  });
}

/**
 * Record key press
 */
export function recordKeyPress(key) {
  recordStep({
    type: "key_press",
    data,
  });
}

/**
 * Record key combination
 */
export function recordKeyCombination(keys) {
  recordStep({
    type: "key_combination",
    data,
  });
}

/**
 * Record text input
 */
export function recordTypeText(text) {
  recordStep({
    type: "type_text",
    data,
  });
}

/**
 * Record window focus change
 */
export function recordWindowFocus(windowTitle, app?) {
  recordStep({
    type: "window_focus",
    data,
  });
}

/**
 * Start mouse tracking
 */
function startMouseTracking() {
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
function stopMouseTracking() {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
}

// Screenshot capture interval
let screenshotInterval.Timeout | null = null;

/**
 * Start screenshot capture
 */
function startScreenshotCapture() {
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
function stopScreenshotCapture() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

/**
 * Capture screenshot
 */
async function captureScreenshot()<string | null> {
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
function getScreenResolution() {
  // Default resolution
  return { width, height };
}

/**
 * Save recording to memory
 */
function saveRecordingToMemory(session) {
  try {
    const memory = new GlobalMemory(".state");
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
export function getActiveSession() | null {
  return activeSession;
}

/**
 * Check if recording
 */
export function isRecording() {
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
