/**
 * OpenOxygen — Main Entry Point (26w15aD)
 *
 * 统一导出所有核心模块
 */
// Core
export { createRuntime } from "./core/runtime/index.js";
export { createGateway } from "./core/gateway/index.js";
export { createConfig } from "./core/config/index.js";
// Memory
export { GlobalMemory, getGlobalMemory } from "./memory/global/index.js";
// Execution
export * from "./execution/terminal/index.js";
export * from "./execution/unified/index.js";
export * from "./execution/edge-automation/index.js";
export * from "./execution/qq-automation/index.js";
// Agent
export * from "./agent/orchestrator/index.js";
export * from "./agent/communication/index.js";
// Tasks
export * from "./tasks/workflow-engine.js";
export * from "./tasks/document-generator.js";
// Utils
export * from "./utils/index.js";
// Input/Output - Phase 1
export * from "./input/index.js";
export * from "./output/index.js";
// Native Bridge - Phase 1
export * from "./native/index.js";
// Version
export const VERSION = "26w15aD";
/**
 * Initialize OpenOxygen
 */
export async function initialize(config = {}) {
    console.log(`OpenOxygen ${VERSION} initializing...`);
    const runtime = createRuntime(config);
    const memory = getGlobalMemory();
    console.log("OpenOxygen initialized successfully");
    return { runtime, memory, version: VERSION };
}
export default { VERSION, initialize };
//# sourceMappingURL=index.js.map