/**
 * OpenOxygen Core - Refactored Entry Point (26w15aD_REFACTOR)
 *
 * Core exports for OpenOxygen framework
 */
export { createRuntime } from './core/runtime.js';
export { createGateway } from './core/gateway.js';
export { GlobalMemory, getGlobalMemory } from './memory/global/index.js';
export { mouseMove, mouseClick, mouseDrag, mouseScroll, keyPress, keyCombination, typeText } from './native/index.js';
export { ensureOllamaRunning, getOllamaStatus, isModelAvailable, } from './ollama/index.js';
export { launchBrowser, navigate, closeBrowser } from './browser/index.js';
export { registerAgent, delegateTask, resumeTask } from './multi-agent/index.js';
export { launchWinUI, registerHotkey } from './ui/index.js';
export { handleExecutionRequest } from './execution/unified/index.js';
export { registerWorkflow, executeWorkflow, listWorkflows, getWorkflow, deleteWorkflow } from './tasks/workflow-engine.js';
export { generateId, nowMs, sleep } from './utils/index.js';
export declare const VERSION = "26w15aD_REFACTOR";
/**
 * Initialize OpenOxygen
 */
export declare function initialize(config?: {}): Promise<{
    runtime: any;
    memory: any;
}>;
//# sourceMappingURL=index.d.ts.map