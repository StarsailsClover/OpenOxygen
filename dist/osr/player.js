/**
 * OpenOxygen �?OxygenStepRecorder (OSR) Player (26w15aD Phase 2)
 *
 * 操作回放系统
 * 按时间戳回放录制的操�?
 */
import { createSubsystemLogger } from "../logging/index.js";
import { sleep } from "../utils/index.js";
import { mouseMove, mouseClick, mouseDrag, } from "../native/mouse.js";
import { keyPress, keyCombination, typeText } from "../native/keyboard.js";
const log = createSubsystemLogger("osr/player");
// Active playback
let activePlayback = null;
// Playback abort controller
let abortController = null;
/**
 * Play recording
 * @param recording - Recording session to play
 * @param options - Playback options
 */
export async function playRecording(recording, options = {}) {
    if (activePlayback?.state === "playing") {
        log.warn("Already playing a recording");
        return false;
    }
    log.info(`Starting playback: ${recording.name} (${recording.steps.length} steps)`);
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
                if (abortController.signal.aborted)
                    break;
            }
            if (abortController.signal.aborted)
                break;
            const step = recording.steps[i];
            activePlayback.currentIndex = i;
            log.debug(`Playing step ${i + 1}/${recording.steps.length}: ${step.type}`);
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
    }
    catch (error) {
        log.error(`Playback error: ${error.message}`);
        options.onError?.(error);
    }
    finally {
        activePlayback = null;
        abortController = null;
    }
    return true;
}
/**
 * Execute a single step
 */
async function executeStep(step, speed) {
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
async function executeMouseMove(data) {
    mouseMove(data.x, data.y);
}
/**
 * Execute mouse click
 */
async function executeMouseClick(data) {
    mouseMove(data.x, data.y);
    await sleep(50);
    mouseClick(data.button);
}
/**
 * Execute mouse drag
 */
async function executeMouseDrag(data) {
    mouseDrag(data.startX, data.startY, data.endX, data.endY, data.button);
}
/**
 * Execute key press
 */
async function executeKeyPress(data) {
    keyPress(data.key);
}
/**
 * Execute key combination
 */
async function executeKeyCombination(data) {
    keyCombination(data.keys);
}
/**
 * Execute type text
 */
async function executeTypeText(data, speed) {
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
export function pausePlayback() {
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
export function resumePlayback() {
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
export function stopPlayback() {
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
export function getPlaybackState() {
    return activePlayback?.state || "idle";
}
/**
 * Get current playback position
 */
export function getCurrentPosition() {
    return activePlayback?.currentIndex || 0;
}
/**
 * Get total steps
 */
export function getTotalSteps() {
    return activePlayback?.recording.steps.length || 0;
}
/**
 * Seek to specific step
 * @param index - Step index to seek to
 */
export function seekTo(index) {
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
export function getStepAt(index) {
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
