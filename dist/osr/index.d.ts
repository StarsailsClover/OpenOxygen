/**
 * OpenOxygen — OxygenStepRecorder (OSR) Module (26w15aD Phase 2)
 *
 * 统一导出 OSR 所有功能
 */
export { startRecording, stopRecording, pauseRecording, resumeRecording, recordStep, recordMouseMove, recordMouseClick, recordMouseDrag, recordKeyPress, recordKeyCombination, recordTypeText, recordWindowFocus, getActiveSession, isRecording, type RecordingSession, type RecordedStep, type StepType, type RecordingState, } from "./recorder.js";
export { playRecording, pausePlayback, resumePlayback, stopPlayback, getPlaybackState, getCurrentPosition, getTotalSteps, seekTo, getStepAt, type PlaybackOptions, type PlaybackSession, type PlaybackState, } from "./player.js";
export { insertStep, deleteStep, modifyStep, applyCoordinateOffset, addDelay, removeScreenshots, optimizeRecording, duplicateStep, moveStep, exportToJSON, importFromJSON, } from "./editor.js";
import * as recorder from "./recorder.js";
import * as player from "./player.js";
import * as editor from "./editor.js";
export declare const OSR: {
    insertStep(recording: recorder.RecordingSession, index: number, step: Omit<recorder.RecordedStep, "id" | "timestamp">): recorder.RecordingSession;
    deleteStep(recording: recorder.RecordingSession, index: number): recorder.RecordingSession;
    modifyStep(recording: recorder.RecordingSession, index: number, updates: Partial<recorder.RecordedStep>): recorder.RecordingSession;
    applyCoordinateOffset(recording: recorder.RecordingSession, offsetX: number, offsetY: number): recorder.RecordingSession;
    addDelay(recording: recorder.RecordingSession, index: number, durationMs: number): recorder.RecordingSession;
    removeScreenshots(recording: recorder.RecordingSession): recorder.RecordingSession;
    optimizeRecording(recording: recorder.RecordingSession): recorder.RecordingSession;
    duplicateStep(recording: recorder.RecordingSession, index: number): recorder.RecordingSession;
    moveStep(recording: recorder.RecordingSession, fromIndex: number, toIndex: number): recorder.RecordingSession;
    exportToJSON(recording: recorder.RecordingSession): string;
    importFromJSON(json: string): recorder.RecordingSession;
    default: {
        insertStep: typeof editor.insertStep;
        deleteStep: typeof editor.deleteStep;
        modifyStep: typeof editor.modifyStep;
        applyCoordinateOffset: typeof editor.applyCoordinateOffset;
        addDelay: typeof editor.addDelay;
        removeScreenshots: typeof editor.removeScreenshots;
        optimizeRecording: typeof editor.optimizeRecording;
        duplicateStep: typeof editor.duplicateStep;
        moveStep: typeof editor.moveStep;
        exportToJSON: typeof editor.exportToJSON;
        importFromJSON: typeof editor.importFromJSON;
    };
    playRecording(recording: recorder.RecordingSession, options?: player.PlaybackOptions): Promise<boolean>;
    pausePlayback(): boolean;
    resumePlayback(): boolean;
    stopPlayback(): boolean;
    getPlaybackState(): player.PlaybackState;
    getCurrentPosition(): number;
    getTotalSteps(): number;
    seekTo(index: number): boolean;
    getStepAt(index: number): recorder.RecordedStep | null;
    startRecording(name: string, options?: {
        captureScreenshots?: boolean;
        trackMouse?: boolean;
    }): recorder.RecordingSession;
    stopRecording(): recorder.RecordingSession | null;
    pauseRecording(): boolean;
    resumeRecording(): boolean;
    recordStep(partialStep: Omit<recorder.RecordedStep, "id" | "timestamp">): void;
    recordMouseMove(x: number, y: number): void;
    recordMouseClick(x: number, y: number, button: string): void;
    recordMouseDrag(startX: number, startY: number, endX: number, endY: number, button: string): void;
    recordKeyPress(key: string): void;
    recordKeyCombination(keys: string[]): void;
    recordTypeText(text: string): void;
    recordWindowFocus(windowTitle: string, app?: string): void;
    getActiveSession(): recorder.RecordingSession | null;
    isRecording(): boolean;
};
export default OSR;
//# sourceMappingURL=index.d.ts.map