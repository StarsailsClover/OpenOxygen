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
// ─── Module Loading ─────────────────────────────────────────────────────────
let nativeModule = null;
let loadAttempted = false;
export function loadNativeModule() {
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
            // Fallback: try direct path
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
    return require("node:module");
}
export function isNativeAvailable() {
    return loadNativeModule() !== null;
}
export function requireNative() {
    const mod = loadNativeModule();
    if (!mod) {
        throw new Error("Native module required but not available. Run `npm run build:native` first.");
    }
    return mod;
}
//# sourceMappingURL=native-bridge.js.map