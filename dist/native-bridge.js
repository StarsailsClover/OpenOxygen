/**
 * OpenOxygen — Native Bridge v2
 *
 * TypeScript ↔ Rust 绑定层。
 * 优先加载 Rust native 模块，加载失败时 fallback 到纯 TS 实现。
 * 覆盖全部 native 函数：系统信息、截图、输入(v2)、窗口、进程、
 * 剪贴板、注册表、向量检索、视觉、UI Automation、沙箱。
 */
import { createSubsystemLogger } from "./logging/index.js";
const log = createSubsystemLogger("native-bridge");
// ─── Result Types ───────────────────────────────────────────────────────────
error ?  : ;
;
path ?  : ;
width;
height;
durationMs;
error ?  : ;
;
title;
className;
x;
y;
width;
height;
visible;
focused;
;
name;
memoryBytes;
;
score;
;
name;
controlType;
className;
x;
y;
width;
height;
isEnabled;
isOffscreen;
hasKeyboardFocus;
;
y;
width;
height;
area;
aspectRatio;
label;
;
y;
score;
;
physicalHeight;
logicalWidth;
logicalHeight;
dpiX;
dpiY;
scaleFactor;
;
isSystem;
integrityLevel;
canInjectInput;
canAccessUipi;
;
x ?  : ;
y ?  : ;
button ?  : ;
text ?  : ;
keys ?  : ;
delta ?  : ;
delayMs ?  : ;
;
exitCode ?  : ;
stdout;
stderr;
durationMs;
error ?  : ;
timedOut;
;
getSystemInfo: () => { platform; arch; cpuCount; totalMemoryMb; freeMemoryMb; };
// Screen capture
captureScreen;
captureRegion;
// Input v2 — basic
mouseClick;
mouseDoubleClick;
mouseMove;
mouseScroll;
typeText;
sendHotkey;
// Input v2 — smooth
mouseMoveSmooth;
mouseClickSmooth;
replayInputSequence;
// Input v2 — privilege
isElevated: () => boolean;
getPrivilegeInfo: () => PrivilegeInfo;
requestElevation: () => InputResult;
// Input v2 — DPI
getScreenMetrics: () => ScreenMetrics;
logicalToPhysical[];
physicalToLogical[];
// Input v2 — virtual driver
sendMessageToWindow;
clickInWindow;
allowSetForeground: () => InputResult;
// Window management
listWindows: () => WindowInfo[];
getForegroundWindowInfo: () => WindowInfo | null;
focusWindow;
// Clipboard
clipboardGetText: () => string | null;
clipboardSetText;
// Process
listProcesses: () => ProcessInfo[];
killProcess;
// Registry
registryReadString | null;
registryWriteString;
// Vector search (SIMD)
cosineSimilarity;
vectorSearch[];
normalizeVector[];
// Vision — image processing
getImageMeta: (path) => { width; height; channels; sizeBytes; };
cropImage;
resizeImage;
toGrayscale;
imageDiffPercent;
detectEdges;
detectConnectedRegions[];
templateMatch[];
// Vision — UI Automation
getUiElements[];
getElementAtPoint | null;
getFocusedElement: () => UiaElement | null;
// Sandbox
sandboxExec;
;
// ─── Module Loading ─────────────────────────────────────────────────────────
let nativeModule;
 | null;
null;
let loadAttempted = false;
export function loadNativeModule() { }
 | null;
{
    if (loadAttempted)
        return nativeModule;
    loadAttempted = true;
    try {
        const { createRequire } = await_import_module();
        const req = createRequire(import.meta.url);
        const mod = req("@openoxygen/core-native");
        nativeModule = mod;
        log.info(`Native module loaded: ${mod.nativeVersion()}`);
        return mod;
    }
    catch {
        try {
            // Fallback direct path
            const { createRequire } = await_import_module();
            const req = createRequire(import.meta.url);
            const mod = req("../packages/core-native/index.js");
            nativeModule = mod;
            log.info(`Native module loaded (fallback path): ${mod.nativeVersion()}`);
            return mod;
        }
        catch {
            log.warn("Native module not available, using TypeScript fallback");
            return null;
        }
    }
}
function await_import_module() {
    // Dynamic import workaround for ESM
    return require("node");
}
export function isNativeAvailable() {
    return loadNativeModule() !== null;
}
export function requireNative() {
    const mod = loadNativeModule();
    if (!mod) {
        throw new Error("Native module required but not available. Run `npm run build` first.");
    }
    return mod;
}
