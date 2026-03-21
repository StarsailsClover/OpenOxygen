/**
 * OSR Recorder - Fix
 */
export function startRecording(name, options) {
  return { id: "rec-" + Date.now(), name, state: "recording", steps: [], startTime: Date.now() };
}
export function stopRecording() { return { id: "rec-" + Date.now(), steps: [], endTime: Date.now() }; }
export function pauseRecording() { return true; }
export function resumeRecording() { return true; }
export function recordStep(step) {}
export function recordMouseMove(x, y) {}
export function recordMouseClick(x, y, button) {}
export function recordMouseDrag(startX, startY, endX, endY, button) {}
export function recordKeyPress(key) {}
export function recordKeyCombination(keys) {}
export function recordTypeText(text) {}
export function recordWindowFocus(windowTitle, app) {}
export function getActiveSession() { return null; }
export function isRecording() { return false; }
