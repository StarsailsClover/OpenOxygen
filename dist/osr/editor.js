/**
 * OSR Editor - Fix
 */
export function insertStep(recording, index, step) { return recording; }
export function deleteStep(recording, index) { return recording; }
export function modifyStep(recording, index, updates) { return recording; }
export function applyCoordinateOffset(recording, offsetX, offsetY) { return recording; }
export function addDelay(recording, index, durationMs) { return recording; }
export function removeScreenshots(recording) { return recording; }
export function optimizeRecording(recording) { return recording; }
export function duplicateStep(recording, index) { return recording; }
export function moveStep(recording, fromIndex, toIndex) { return recording; }
export function exportToJSON(recording) { return JSON.stringify(recording); }
export function importFromJSON(json) { return JSON.parse(json); }
