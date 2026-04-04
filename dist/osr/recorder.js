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
// Active recording session
let activeSession = null;
// Recording interval
let recordingInterval = null;
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
export function startRecording(name, options = {}) {
    if (activeSession?.state === "recording") {
        throw new Error("Recording already in progress");
    }
    const session = {
<<<<<<< HEAD
        id: generateId("osr"),
=======
        id: generateId("rec"),
>>>>>>> dev
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
<<<<<<< HEAD
    // Record initial step
    recordStep({
        type: "window_focus",
        data: { action: "recording_started" },
    });
    log.info(`Recording started: ${session.id}`);
=======
>>>>>>> dev
    return session;
}
/**
 * Stop recording
 */
export function stopRecording() {
    if (!activeSession) {
        log.warn("No active recording to stop");
        return null;
    }
<<<<<<< HEAD
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
=======
    // Stop recording loops
    stopRecordingLoops();
>>>>>>> dev
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
export function pauseRecording() {
    if (!activeSession || activeSession.state !== "recording") {
        return false;
    }
    activeSession.state = "paused";
<<<<<<< HEAD
    stopMouseTracking();
    stopScreenshotCapture();
    recordStep({
        type: "window_focus",
        data: { action: "recording_paused" },
    });
=======
    stopRecordingLoops();
>>>>>>> dev
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
<<<<<<< HEAD
    recordStep({
        type: "window_focus",
        data: { action: "recording_resumed" },
    });
=======
>>>>>>> dev
    log.info("Recording resumed");
    return true;
}
/**
 * Add step to recording
 */
<<<<<<< HEAD
export function recordStep(partialStep) {
=======
export function addStep(type, data, screenshot) {
>>>>>>> dev
    if (!activeSession || activeSession.state !== "recording") {
        return null;
    }
    const step = {
        id: generateId("step"),
<<<<<<< HEAD
        timestamp: nowMs(),
        ...partialStep,
=======
        type,
        timestamp: nowMs(),
        data,
        screenshot,
>>>>>>> dev
    };
    activeSession.steps.push(step);
    return step;
}
/**
 * Get active session
 */
<<<<<<< HEAD
export function recordMouseMove(x, y) {
    recordStep({
        type: "mouse_move",
        data: { x, y },
    });
}
/**
 * Record mouse click
 */
export function recordMouseClick(x, y, button) {
    recordStep({
        type: "mouse_click",
        data: { x, y, button },
    });
}
/**
 * Record mouse drag
 */
export function recordMouseDrag(startX, startY, endX, endY, button) {
    recordStep({
        type: "mouse_drag",
        data: { startX, startY, endX, endY, button },
    });
}
/**
 * Record key press
 */
export function recordKeyPress(key) {
    recordStep({
        type: "key_press",
        data: { key },
    });
}
/**
 * Record key combination
 */
export function recordKeyCombination(keys) {
    recordStep({
        type: "key_combination",
        data: { keys },
    });
}
/**
 * Record text input
 */
export function recordTypeText(text) {
    recordStep({
        type: "type_text",
        data: { text },
    });
}
/**
 * Record window focus change
 */
export function recordWindowFocus(windowTitle, app) {
    recordStep({
        type: "window_focus",
        data: { windowTitle, app },
    });
=======
export function getActiveSession() {
    return activeSession;
>>>>>>> dev
}
/**
 * Start mouse tracking
 */
function startMouseTracking() {
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
        }
        catch (error) {
            log.error(`Mouse tracking error: ${error}`);
        }
    };
    recordingInterval = setInterval(trackMouse, MOUSE_TRACK_INTERVAL);
}
/**
 * Start screenshot capture
 */
function startScreenshotCapture() {
    const capture = async () => {
        if (!activeSession || activeSession.state !== "recording") {
            return;
        }
        try {
            // TODO: Implement screenshot capture
            // const screenshot = await captureScreenshot();
            // addStep("screenshot", { timestamp: nowMs() }, screenshot);
        }
        catch (error) {
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
function stopRecordingLoops() {
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
}
<<<<<<< HEAD
// Screenshot capture interval
let screenshotInterval = null;
/**
 * Start screenshot capture
 */
function startScreenshotCapture() {
    if (screenshotInterval)
        return;
    screenshotInterval = setInterval(() => {
        captureScreenshot().then((screenshot) => {
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
async function captureScreenshot() {
    try {
        const native = require("../native-bridge.js");
        if (native.captureScreenshot) {
            return native.captureScreenshot();
        }
        return null;
    }
    catch (error) {
        log.error(`Screenshot capture failed: ${error.message}`);
        return null;
    }
}
=======
>>>>>>> dev
/**
 * Get screen resolution
 */
function getScreenResolution() {
<<<<<<< HEAD
    // Default resolution
=======
    // TODO: Get actual screen resolution
>>>>>>> dev
    return { width: 1920, height: 1080 };
}
/**
 * Get mouse position
 */
async function getMousePosition() {
    // TODO: Get actual mouse position from native module
    return { x: 0, y: 0 };
}
/**
 * Export recording to file
 */
export function exportRecording(session, format = "json") {
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
export function importRecording(data) {
    try {
        return JSON.parse(data);
    }
    catch (error) {
        throw new Error(`Failed to import recording: ${error}`);
    }
}
<<<<<<< HEAD
/**
 * Get active recording session
 */
export function getActiveSession() {
    return activeSession;
}
/**
 * Check if recording
 */
export function isRecording() {
    return activeSession?.state === "recording";
}
// Export all functions
=======
>>>>>>> dev
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
