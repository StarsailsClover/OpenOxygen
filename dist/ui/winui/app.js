/**
 * OpenOxygen — WinUI 3 Desktop Application (26w15aD Phase 6)
 *
 * 基于 WinUI 3 的桌面应用
 * 现代化 UI 设计，悬浮窗模式，聊天式交互
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("ui/winui");
// Active app instance
let activeApp = null;
// Message handlers
const messageHandlers = [];
/**
 * Launch WinUI application
 * @param config - App configuration
 */
export async function launchWinUI(config = {}) {
    if (activeApp?.state === "running") {
        log.warn("WinUI app already running");
        return activeApp;
    }
    log.info("Launching WinUI application");
    const app = {
        id: generateId("winui"),
        state: "opening",
        config: {
            width: config.width || 800,
            height: config.height || 600,
            mode: config.mode || "normal",
            alwaysOnTop: config.alwaysOnTop ?? false,
            opacity: config.opacity ?? 1.0,
            ...config,
        },
        messages: [],
    };
    activeApp = app;
    try {
        // Initialize WinUI window
        await initializeWinUIWindow(app);
        app.state = "running";
        log.info(`WinUI app launched: ${app.id}`);
        // Add welcome message
        addSystemMessage(app, "欢迎使用 OpenOxygen！输入指令开始操作。");
        return app;
    }
    catch (error) {
        app.state = "error";
        log.error(`Failed to launch WinUI: ${error.message}`);
        throw error;
    }
}
/**
 * Initialize WinUI window
 */
async function initializeWinUIWindow(app) {
    log.debug("Initializing WinUI window");
    // This would use WinUI 3 APIs
    // For now, create a placeholder
    app.window = {
        id: app.id,
        show: () => log.debug("Window shown"),
        hide: () => log.debug("Window hidden"),
        minimize: () => log.debug("Window minimized"),
        close: () => log.debug("Window closed"),
    };
    // Simulate initialization
    await sleep(500);
}
/**
 * Add message to chat
 */
function addMessage(app, message) {
    app.messages.push(message);
    // Notify handlers
    for (const handler of messageHandlers) {
        handler(message);
    }
    // Limit message history
    if (app.messages.length > 100) {
        app.messages = app.messages.slice(-100);
    }
}
/**
 * Add user message
 */
export function addUserMessage(app, content) {
    const message = {
        id: generateId("msg"),
        role: "user",
        content,
        timestamp: nowMs(),
    };
    addMessage(app, message);
    return message;
}
/**
 * Add assistant message
 */
export function addAssistantMessage(app, content, metadata) {
    const message = {
        id: generateId("msg"),
        role: "assistant",
        content,
        timestamp: nowMs(),
        metadata,
    };
    addMessage(app, message);
    return message;
}
/**
 * Add system message
 */
export function addSystemMessage(app, content) {
    const message = {
        id: generateId("msg"),
        role: "system",
        content,
        timestamp: nowMs(),
    };
    addMessage(app, message);
    return message;
}
/**
 * Show window
 */
export function showWindow() {
    if (activeApp?.window) {
        activeApp.window.show();
        activeApp.state = "running";
    }
}
/**
 * Hide window
 */
export function hideWindow() {
    if (activeApp?.window) {
        activeApp.window.hide();
    }
}
/**
 * Minimize window
 */
export function minimizeWindow() {
    if (activeApp?.window) {
        activeApp.window.minimize();
        activeApp.state = "minimized";
    }
}
/**
 * Close application
 */
export function closeWinUI() {
    if (activeApp?.window) {
        activeApp.window.close();
        activeApp.state = "closed";
        activeApp = null;
        log.info("WinUI app closed");
    }
}
/**
 * Set window mode
 * @param mode - Window mode
 */
export function setWindowMode(mode) {
    if (!activeApp)
        return;
    activeApp.config.mode = mode;
    log.debug(`Window mode set to: ${mode}`);
    // Apply mode changes
    switch (mode) {
        case "compact":
            activeApp.config.width = 400;
            activeApp.config.height = 600;
            break;
        case "floating":
            activeApp.config.alwaysOnTop = true;
            break;
        case "normal":
            activeApp.config.width = 800;
            activeApp.config.height = 600;
            activeApp.config.alwaysOnTop = false;
            break;
    }
}
/**
 * Register message handler
 */
export function onMessage(handler) {
    messageHandlers.push(handler);
}
/**
 * Unregister message handler
 */
export function offMessage(handler) {
    const index = messageHandlers.indexOf(handler);
    if (index > -1) {
        messageHandlers.splice(index, 1);
    }
}
/**
 * Get chat history
 */
export function getChatHistory() {
    return activeApp?.messages || [];
}
/**
 * Clear chat history
 */
export function clearChatHistory() {
    if (activeApp) {
        activeApp.messages = [];
    }
}
/**
 * Get active app
 */
export function getActiveApp() {
    return activeApp;
}
/**
 * Check if app is running
 */
export function isAppRunning() {
    return activeApp?.state === "running";
}
// Helper
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Export
export default {
    launchWinUI,
    addUserMessage,
    addAssistantMessage,
    addSystemMessage,
    showWindow,
    hideWindow,
    minimizeWindow,
    closeWinUI,
    setWindowMode,
    onMessage,
    offMessage,
    getChatHistory,
    clearChatHistory,
    getActiveApp,
    isAppRunning,
};
