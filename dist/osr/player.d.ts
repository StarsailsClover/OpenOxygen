/**
 * OpenOxygen �?OxygenStepRecorder (OSR) Player (26w15aD Phase 2)
 *
 * 操作回放系统
 * 按时间戳回放录制的操�? */
import type { RecordedStep, RecordingSession } from "./recorder.js";
export type PlaybackState = "idle" | "playing" | "paused" | "stopped";
export interface PlaybackOptions {
    speed?: number;
    startIndex?: number;
    endIndex?: number;
    onStep?: (step: RecordedStep, index: number) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
}
export interface PlaybackSession {
    recording: RecordingSession;
    state: PlaybackState;
    currentIndex: number;
    options: PlaybackOptions;
}
/**
 * Play recording
 * @param recording - Recording session to play
 * @param options - Playback options
 */
export declare function playRecording(recording: RecordingSession, options?: PlaybackOptions): Promise<boolean>;
/**
 * Pause playback
 */
export declare function pausePlayback(): boolean;
/**
 * Resume playback
 */
export declare function resumePlayback(): boolean;
/**
 * Stop playback
 */
export declare function stopPlayback(): boolean;
/**
 * Get playback state
 */
export declare function getPlaybackState(): PlaybackState;
/**
 * Get current playback position
 */
export declare function getCurrentPosition(): number;
/**
 * Get total steps
 */
export declare function getTotalSteps(): number;
/**
 * Seek to specific step
 * @param index - Step index to seek to
 */
export declare function seekTo(index: number): boolean;
/**
 * Get step at index
 */
export declare function getStepAt(index: number): RecordedStep | null;
declare const _default: {
    playRecording: typeof playRecording;
    pausePlayback: typeof pausePlayback;
    resumePlayback: typeof resumePlayback;
    stopPlayback: typeof stopPlayback;
    getPlaybackState: typeof getPlaybackState;
    getCurrentPosition: typeof getCurrentPosition;
    getTotalSteps: typeof getTotalSteps;
    seekTo: typeof seekTo;
    getStepAt: typeof getStepAt;
};
export default _default;
//# sourceMappingURL=player.d.ts.map
