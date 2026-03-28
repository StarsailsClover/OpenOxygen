/**
 * OpenOxygen — OxygenStepRecorder (OSR) Module (26w15aD Phase 2)
 *
 * 统一导出 OSR 所有功能
 */
export { startRecording, stopRecording, pauseRecording, resumeRecording, recordStep, recordMouseMove, recordMouseClick, recordMouseDrag, recordKeyPress, recordKeyCombination, recordTypeText, recordWindowFocus, getActiveSession, isRecording, type RecordingSession, type RecordedStep, type StepType, type RecordingState, } from "./recorder.js";
export { playRecording, pausePlayback, resumePlayback, stopPlayback, getPlaybackState, getCurrentPosition, getTotalSteps, seekTo, getStepAt, type PlaybackOptions, type PlaybackSession, type PlaybackState, } from "./player.js";
export { insertStep, deleteStep, modifyStep, applyCoordinateOffset, addDelay, removeScreenshots, optimizeRecording, duplicateStep, moveStep, exportToJSON, importFromJSON, } from "./editor.js";
export declare const OSR: any;
export default OSR;
//# sourceMappingURL=index.d.ts.map