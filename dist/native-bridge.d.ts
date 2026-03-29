/**
 * OpenOxygen �?Native Bridge v2
 *
 * TypeScript �?Rust 绑定层�? * 优先加载 Rust native 模块，加载失败时 fallback 到纯 TS 实现�? * 覆盖全部 native 函数：系统信息、截图、输�?v2)、窗口、进程�? * 剪贴板、注册表、向量检索、视觉、UI Automation、沙箱�? */
type InputResult = {
    success: boolean;
    error?: string;
};
type CaptureResult = {
    success: boolean;
    path?: string;
    width: number;
    height: number;
    durationMs: number;
    error?: string;
};
type WindowInfo = {
    hwnd: number;
    title: string;
    className: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    focused: boolean;
};
type ProcessInfo = {
    pid: number;
    name: string;
    memoryBytes: number;
};
type VectorSearchResult = {
    index: number;
    score: number;
};
type UiaElement = {
    automationId: string;
    name: string;
    controlType: string;
    className: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isEnabled: boolean;
    isOffscreen: boolean;
    hasKeyboardFocus: boolean;
};
type DetectedRegion = {
    x: number;
    y: number;
    width: number;
    height: number;
    area: number;
    aspectRatio: number;
    label: string;
};
type TemplateMatch = {
    x: number;
    y: number;
    score: number;
};
type ScreenMetrics = {
    physicalWidth: number;
    physicalHeight: number;
    logicalWidth: number;
    logicalHeight: number;
    dpiX: number;
    dpiY: number;
    scaleFactor: number;
};
type PrivilegeInfo = {
    isAdmin: boolean;
    isSystem: boolean;
    integrityLevel: string;
    canInjectInput: boolean;
    canAccessUipi: boolean;
};
type InputAction = {
    actionType: string;
    x?: number;
    y?: number;
    button?: string;
    text?: string;
    keys?: string;
    delta?: number;
    delayMs?: number;
};
type SandboxResult = {
    success: boolean;
    exitCode?: number;
    stdout: string;
    stderr: string;
    durationMs: number;
    error?: string;
    timedOut: boolean;
};
export type NativeModule = {
    nativeVersion: () => string;
    getSystemInfo: () => {
        platform: string;
        arch: string;
        cpuCount: number;
        totalMemoryMb: number;
        freeMemoryMb: number;
    };
    captureScreen: (outputPath: string) => CaptureResult;
    captureRegion: (x: number, y: number, width: number, height: number, outputPath: string) => CaptureResult;
    mouseClick: (x: number, y: number, button: string) => InputResult;
    mouseDoubleClick: (x: number, y: number) => InputResult;
    mouseMove: (x: number, y: number) => InputResult;
    mouseScroll: (delta: number) => InputResult;
    typeText: (text: string) => InputResult;
    sendHotkey: (keys: string) => InputResult;
    mouseMoveSmooth: (x: number, y: number, durationMs?: number, curve?: string) => InputResult;
    mouseClickSmooth: (x: number, y: number, button?: string, moveDurationMs?: number) => InputResult;
    replayInputSequence: (actions: InputAction[]) => InputResult;
    isElevated: () => boolean;
    getPrivilegeInfo: () => PrivilegeInfo;
    requestElevation: () => InputResult;
    getScreenMetrics: () => ScreenMetrics;
    logicalToPhysical: (x: number, y: number) => number[];
    physicalToLogical: (x: number, y: number) => number[];
    sendMessageToWindow: (hwnd: number, message: string, keyCode?: number, text?: string) => InputResult;
    clickInWindow: (hwnd: number, x: number, y: number, button?: string) => InputResult;
    allowSetForeground: () => InputResult;
    listWindows: () => WindowInfo[];
    getForegroundWindowInfo: () => WindowInfo | null;
    focusWindow: (hwnd: number) => boolean;
    clipboardGetText: () => string | null;
    clipboardSetText: (text: string) => InputResult;
    listProcesses: () => ProcessInfo[];
    killProcess: (pid: number) => boolean;
    registryReadString: (keyPath: string, valueName: string) => string | null;
    registryWriteString: (keyPath: string, valueName: string, value: string) => InputResult;
    cosineSimilarity: (a: number[], b: number[]) => number;
    vectorSearch: (query: number[], documents: number[][], topK: number, minScore?: number) => VectorSearchResult[];
    normalizeVector: (v: number[]) => number[];
    getImageMeta: (path: string) => {
        width: number;
        height: number;
        channels: number;
        sizeBytes: number;
    };
    cropImage: (inputPath: string, outputPath: string, x: number, y: number, width: number, height: number) => boolean;
    resizeImage: (inputPath: string, outputPath: string, width: number, height: number) => boolean;
    toGrayscale: (inputPath: string, outputPath: string) => boolean;
    imageDiffPercent: (pathA: string, pathB: string) => number;
    detectEdges: (inputPath: string, outputPath: string, threshold?: number) => boolean;
    detectConnectedRegions: (edgeImagePath: string, minArea?: number, maxRegions?: number) => DetectedRegion[];
    templateMatch: (screenshotPath: string, templatePath: string, threshold?: number) => TemplateMatch[];
    getUiElements: (hwnd: number | null) => UiaElement[];
    getElementAtPoint: (x: number, y: number) => UiaElement | null;
    getFocusedElement: () => UiaElement | null;
    sandboxExec: (command: string, args: string[], cwd: string | null, config: {
        timeoutMs: number;
        maxMemoryMb: number;
    }) => SandboxResult;
};
export declare function loadNativeModule(): NativeModule | null;
export declare function isNativeAvailable(): boolean;
export declare function requireNative(): NativeModule;
export {};
//# sourceMappingURL=native-bridge.d.ts.map
