/**
 * OSR Player - Fix
 */
export async function playRecording(recording, options) { return true; }
export function pausePlayback() { return true; }
export function resumePlayback() { return true; }
export function stopPlayback() { return true; }
export function getPlaybackState() { return "idle"; }
export function getCurrentPosition() { return 0; }
export function getTotalSteps() { return 0; }
export function seekTo(index) { return true; }
export function getStepAt(index) { return null; }
