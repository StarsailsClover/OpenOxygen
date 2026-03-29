/**
 * OpenOxygen �?OxygenStepRecorder (OSR) Editor (26w15aD Phase 2)
 *
 * 录制文件编辑�? * 插入/删除/修改操作步骤
 */
import type { RecordedStep, RecordingSession } from "./recorder.js";
/**
 * Insert step at index
 * @param recording - Recording session
 * @param index - Index to insert at
 * @param step - Step to insert
 */
export declare function insertStep(recording: RecordingSession, index: number, step: Omit<RecordedStep, "id" | "timestamp">): RecordingSession;
/**
 * Delete step at index
 * @param recording - Recording session
 * @param index - Index to delete
 */
export declare function deleteStep(recording: RecordingSession, index: number): RecordingSession;
/**
 * Modify step at index
 * @param recording - Recording session
 * @param index - Index to modify
 * @param updates - Updates to apply
 */
export declare function modifyStep(recording: RecordingSession, index: number, updates: Partial<RecordedStep>): RecordingSession;
/**
 * Apply coordinate offset to all mouse steps
 * @param recording - Recording session
 * @param offsetX - X offset
 * @param offsetY - Y offset
 */
export declare function applyCoordinateOffset(recording: RecordingSession, offsetX: number, offsetY: number): RecordingSession;
/**
 * Add delay step
 * @param recording - Recording session
 * @param index - Index to insert at
 * @param durationMs - Delay duration
 */
export declare function addDelay(recording: RecordingSession, index: number, durationMs: number): RecordingSession;
/**
 * Remove all screenshots to reduce file size
 * @param recording - Recording session
 */
export declare function removeScreenshots(recording: RecordingSession): RecordingSession;
/**
 * Optimize recording by removing redundant steps
 * @param recording - Recording session
 */
export declare function optimizeRecording(recording: RecordingSession): RecordingSession;
/**
 * Duplicate step
 * @param recording - Recording session
 * @param index - Index to duplicate
 */
export declare function duplicateStep(recording: RecordingSession, index: number): RecordingSession;
/**
 * Move step to new position
 * @param recording - Recording session
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 */
export declare function moveStep(recording: RecordingSession, fromIndex: number, toIndex: number): RecordingSession;
/**
 * Export recording to JSON
 * @param recording - Recording session
 */
export declare function exportToJSON(recording: RecordingSession): string;
/**
 * Import recording from JSON
 * @param json - JSON string
 */
export declare function importFromJSON(json: string): RecordingSession;
declare const _default: {
    insertStep: typeof insertStep;
    deleteStep: typeof deleteStep;
    modifyStep: typeof modifyStep;
    applyCoordinateOffset: typeof applyCoordinateOffset;
    addDelay: typeof addDelay;
    removeScreenshots: typeof removeScreenshots;
    optimizeRecording: typeof optimizeRecording;
    duplicateStep: typeof duplicateStep;
    moveStep: typeof moveStep;
    exportToJSON: typeof exportToJSON;
    importFromJSON: typeof importFromJSON;
};
export default _default;
//# sourceMappingURL=editor.d.ts.map
