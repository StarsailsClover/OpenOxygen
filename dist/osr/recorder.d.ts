/**
 * OpenOxygen — OxygenStepRecorder (OSR) Recorder (26w15aD Phase 2)
 *
 * 操作录制系统
 * 记录鼠标、键盘、窗口操作并同步截屏
 */
export type RecordingState = "idle" | "recording" | "paused";
export type StepType = "mouse_move" | "mouse_click" | "mouse_drag" | "key_press" | "key_combination" | "type_text" | "window_focus" | "screenshot" | "delay";
export interface RecordedStep {
    id: string;
    type: StepType;
    timestamp: number;
    data: any;
    screenshot?: string;
}
export interface RecordingSession {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    steps: RecordedStep[];
    state: RecordingState;
    metadata: {
        app?: string;
        windowTitle?: string;
        screenResolution?: {
            width: number;
            height: number;
        };
    };
}
/**
 * Start recording
 * @param name - Recording name
 * @param options - Recording options
 */
export declare function startRecording(name: string, options?: {
    captureScreenshots?: boolean;
    trackMouse?: boolean;
}): RecordingSession;
/**
 * Stop recording
 */
export declare function stopRecording(): RecordingSession | null;
/**
 * Pause recording
 */
export declare function pauseRecording(): boolean;
/**
 * Resume recording
 */
export declare function resumeRecording(): boolean;
/**
 * Record a step
 */
export declare function recordStep(partialStep: Omit<RecordedStep, "id" | "timestamp">): void;
/**
 * Record mouse move
 */
export declare function recordMouseMove(x: number, y: number): void;
/**
 * Record mouse click
 */
export declare function recordMouseClick(x: number, y: number, button: string): void;
/**
 * Record mouse drag
 */
export declare function recordMouseDrag(startX: number, startY: number, endX: number, endY: number, button: string): void;
/**
 * Record key press
 */
export declare function recordKeyPress(key: string): void;
/**
 * Record key combination
 */
export declare function recordKeyCombination(keys: string[]): void;
/**
 * Record text input
 */
export declare function recordTypeText(text: string): void;
/**
 * Record window focus change
 */
export declare function recordWindowFocus(windowTitle: string, app?: string): void;
/**
 * Get active recording session
 */
export declare function getActiveSession(): RecordingSession | null;
/**
 * Check if recording
 */
export declare function isRecording(): boolean;
declare const _default: {
    startRecording: typeof startRecording;
    stopRecording: typeof stopRecording;
    pauseRecording: typeof pauseRecording;
    resumeRecording: typeof resumeRecording;
    recordStep: typeof recordStep;
    recordMouseMove: typeof recordMouseMove;
    recordMouseClick: typeof recordMouseClick;
    recordMouseDrag: typeof recordMouseDrag;
    recordKeyPress: typeof recordKeyPress;
    recordKeyCombination: typeof recordKeyCombination;
    recordTypeText: typeof recordTypeText;
    recordWindowFocus: typeof recordWindowFocus;
    getActiveSession: typeof getActiveSession;
    isRecording: typeof isRecording;
};
export default _default;
//# sourceMappingURL=recorder.d.ts.map