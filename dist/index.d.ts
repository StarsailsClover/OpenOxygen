/**
 * OpenOxygen — Main Entry Point (26w15aD)
 *
 * 统一导出所有核心模块
 */
export { createRuntime } from "./core/runtime/index.js";
export { createGateway } from "./core/gateway/index.js";
export { createConfig } from "./core/config/index.js";
export { GlobalMemory, getGlobalMemory } from "./memory/global/index.js";
export * from "./execution/terminal/index.js";
export * from "./execution/unified/index.js";
export * from "./execution/edge-automation/index.js";
export * from "./execution/qq-automation/index.js";
export * from "./agent/orchestrator/index.js";
export * from "./agent/communication/index.js";
export * from "./tasks/workflow-engine.js";
export * from "./tasks/document-generator.js";
export * from "./utils/index.js";
export * from "./input/index.js";
export * from "./output/index.js";
export * from "./native/index.js";
export declare const VERSION = "26w15aD";
/**
 * Initialize OpenOxygen
 */
export declare function initialize(config?: {}): Promise<{
    runtime: any;
    memory: any;
    version: string;
}>;
declare const _default: {
    VERSION: string;
    initialize: typeof initialize;
};
export default _default;
//# sourceMappingURL=index.d.ts.map