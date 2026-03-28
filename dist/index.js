/**
 * OpenOxygen Core - Refactored Entry Point (26w15aD_REFACTOR)
 *
 * Core exports for OpenOxygen framework
 */
// Core modules
export { createRuntime } from './core/runtime.js';
export { createGateway } from './core/gateway.js';
// Memory
export { GlobalMemory, getGlobalMemory } from './memory/global/index.js';
// Native (C++ bindings)
export { mouseMove, mouseClick, mouseDrag, mouseScroll, keyPress, keyCombination, typeText } from './native/index.js';
// Ollama
export { ensureOllamaRunning, getOllamaStatus, isModelAvailable, } from './ollama/index.js';
// Browser
export { launchBrowser, navigate, closeBrowser } from './browser/index.js';
// Multi-Agent
export { registerAgent, delegateTask, resumeTask } from './multi-agent/index.js';
// UI
export { launchWinUI, registerHotkey } from './ui/index.js';
// Execution
export { handleExecutionRequest } from './execution/unified/index.js';
// Tasks
export { registerWorkflow, executeWorkflow, listWorkflows, getWorkflow, deleteWorkflow } from './tasks/workflow-engine.js';
// Utils
export { generateId, nowMs, sleep } from './utils/index.js';
// Version
export const VERSION = '26w15aD_REFACTOR';
/**
 * Initialize OpenOxygen
 */
export async function initialize(config = {}) {
    console.log(`OpenOxygen ${VERSION} initializing...`);
    // Initialize core
    const { createRuntime } = await import('./core/runtime.js');
    const { getGlobalMemory } = await import('./memory/global/index.js');
    const runtime = createRuntime(config);
    const memory = getGlobalMemory();
    console.log('OpenOxygen initialized successfully');
    return {
        runtime,
        memory,
    };
}
//# sourceMappingURL=index.js.map