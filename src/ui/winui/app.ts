/**
 * OpenOxygen — WinUI 3 Desktop Application (26w15aD Phase 6)
 *
 * 基于 WinUI 3 的桌面应用
 * 现代化 UI 设计，悬浮窗模式，聊天式交互
 */

import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";

const log = createSubsystemLogger("ui/winui");

// App states
export type AppState = "closed" | "opening" | "running" | "minimized" | "error";

// Window modes
export type WindowMode = "normal" | "compact" | "floating" | "fullscreen";

// App configuration
export interface WinUIAppConfig {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  mode?: WindowMode;
  alwaysOnTop?: boolean;
  opacity?: number;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: {
    executionTime?: number;
    mode?: string;
    success?: boolean;
  };
}

// WinUI App instance
export interface WinUIApp {
  id: string;
  state: AppState;
  config: WinUIAppConfig;
  messages: ChatMessage[];
  window?: any; // WinUI window reference
}

// Active app instance
let activeApp: WinUIApp | null = null;

// Message handlers
const messageHandlers: ((msg: ChatMessage) => void)[] = [];

/**
 * Launch WinUI application
 * @param config - App configuration
 */
export async function launchWinUI(config: WinUIAppConfig = {}): Promise<WinUIApp> {
  if (activeApp?.state === "running") {
    log.warn("WinUI app already running");
    return activeApp;
  }
  
  log.info("Launching WinUI application");
  
  const app: WinUIApp = {
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
  } catch (error) {
    app.state = "error";
    log.error(`Failed to launch WinUI: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize WinUI window
 */
async function initializeWinUIWindow(app: WinUIApp): Promise<void> {
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
function addMessage(app: WinUIApp, message: ChatMessage): void {
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
export function addUserMessage(app: WinUIApp, content: string): ChatMessage {
  const message: ChatMessage = {
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
export function addAssistantMessage(
  app: WinUIApp,
  content: string,
  metadata?: ChatMessage["metadata"]
): ChatMessage {
  const message: ChatMessage = {
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
export function addSystemMessage(app: WinUIApp, content: string): ChatMessage {
  const message: ChatMessage = {
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
export function showWindow(): void {
  if (activeApp?.window) {
    activeApp.window.show();
    activeApp.state = "running";
  }
}

/**
 * Hide window
 */
export function hideWindow(): void {
  if (activeApp?.window) {
    activeApp.window.hide();
  }
}

/**
 * Minimize window
 */
export function minimizeWindow(): void {
  if (activeApp?.window) {
    activeApp.window.minimize();
    activeApp.state = "minimized";
  }
}

/**
 * Close application
 */
export function closeWinUI(): void {
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
export function setWindowMode(mode: WindowMode): void {
  if (!activeApp) return;
  
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
export function onMessage(handler: (msg: ChatMessage) => void): void {
  messageHandlers.push(handler);
}

/**
 * Unregister message handler
 */
export function offMessage(handler: (msg: ChatMessage) => void): void {
  const index = messageHandlers.indexOf(handler);
  if (index > -1) {
    messageHandlers.splice(index, 1);
  }
}

/**
 * Get chat history
 */
export function getChatHistory(): ChatMessage[] {
  return activeApp?.messages || [];
}

/**
 * Clear chat history
 */
export function clearChatHistory(): void {
  if (activeApp) {
    activeApp.messages = [];
  }
}

/**
 * Get active app
 */
export function getActiveApp(): WinUIApp | null {
  return activeApp;
}

/**
 * Check if app is running
 */
export function isAppRunning(): boolean {
  return activeApp?.state === "running";
}

// Helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
