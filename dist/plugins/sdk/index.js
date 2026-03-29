/**
 * OpenOxygen �?Plugin SDK
 *
 * 插件开�?SDK：提供类型定义和辅助函数，供第三方插件开发者使用�?
 * 兼容 OpenClaw �?plugin-sdk 导出接口�?
 */
/**
 * Fluent builder for creating OpenOxygen plugins.
 *
 * @example
 * ```ts
 * import { definePlugin } from "openoxygen/plugin-sdk";
 *
 * export default definePlugin()
 *   .setManifest({ name: "my-plugin", version: "1.0.0", entryPoint: "index.js" })
 *   .addHook("on-message", async (ctx, payload) => {
 *     ctx.logger.log("Message received:", payload);
 *     return payload;
 *   })
 *   .addTool({
 *     name: "my-tool",
 *     description: "Does something useful",
 *     parameters: { type: "object", properties: { input: { type: "string" } } },
 *     execute: async (params) => ({ success: true, output: params.input, durationMs: 0 }),
 *   })
 *   .build();
 * ```
 */
export function definePlugin() {
    let manifest = {
        name: "unnamed",
        version: "0.0.0",
        entryPoint: "index.js",
    };
    const hooks = [];
    const tools = [];
    let activateHandler;
    let deactivateHandler;
    const builder = {
        setManifest(m) {
            manifest = m;
            return builder;
        },
        addHook(phase, handler, priority) {
            hooks.push({ phase, handler, priority });
            return builder;
        },
        addTool(tool) {
            tools.push(tool);
            return builder;
        },
        onActivate(handler) {
            activateHandler = handler;
            return builder;
        },
        onDeactivate(handler) {
            deactivateHandler = handler;
            return builder;
        },
        build() {
            return {
                manifest,
                hooks: hooks.length > 0 ? hooks : undefined,
                tools: tools.length > 0 ? tools : undefined,
                activate: activateHandler,
                deactivate: deactivateHandler,
            };
        },
    };
    return builder;
}
// ─── Tool Helpers ───────────────────────────────────────────────────────────
export function createToolResult(output, durationMs = 0) {
    return { success: true, output, durationMs };
}
export function createToolError(error, durationMs = 0) {
    return { success: false, error, durationMs };
}
