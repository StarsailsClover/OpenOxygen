/**
 * OpenOxygen �?OxygenStepRecorder (OSR) Module (26w15aD Phase 2)
 *
 * 统一导出 OSR 所有功�? */

// Recorder
export {
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
  type RecordingSession,
  type RecordedStep,
  type StepType,
  type RecordingState,
} from "./recorder.js";

// Player
export {
  playRecording,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  getPlaybackState,
  getCurrentPosition,
  getTotalSteps,
  seekTo,
  getStepAt,
  type PlaybackOptions,
  type PlaybackSession,
  type PlaybackState,
} from "./player.js";

// Editor
export {
  insertStep,
  deleteStep,
  modifyStep,
  applyCoordinateOffset,
  addDelay,
  removeScreenshots,
  optimizeRecording,
  duplicateStep,
  moveStep,
  exportToJSON,
  importFromJSON,
} from "./editor.js";

// Default export
import * as recorder from "./recorder.js";
import * as player from "./player.js";
import * as editor from "./editor.js";

export const OSR = {
  ...recorder,
  ...player,
  ...editor,
};

export default OSR;
