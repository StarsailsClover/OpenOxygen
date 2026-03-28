/**
 * OpenOxygen — Plugin SDK
 *
 * 插件开发 SDK：提供类型定义和辅助函数，供第三方插件开发者使用。
 * 兼容 OpenClaw 的 plugin-sdk 导出接口。
 */
addHook;
addTool;
onActivate;
PluginBuilder;
onDeactivate;
PluginBuilder;
build: () => OxygenPluginDefinition;
;
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
 *     parameters } },
 *     execute (params) => ({ success, output.input, durationMs }),
 *   })
 *   .build();
 * ```
 */
export function definePlugin() {
    let manifest = { name: "unnamed", version: "0.0.0", entryPoint: "index.js" };
    const hooks = [];
    const tools;
    <OxygenPluginDefinition />;
    ["tools"] > ;
    [];
    let activateHandler;
     | undefined;
    let deactivateHandler;
     | undefined;
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
                hooks, : .length > 0 ? hooks : ,
                tools, : .length > 0 ? tools : ,
                activate,
                deactivate,
            };
        },
    };
    return builder;
}
// ─── Tool Helpers ───────────────────────────────────────────────────────────
export function createToolResult(output, durationMs = 0) {
    return { success, output, durationMs };
}
export function createToolError(error, durationMs = 0) {
    return { success, error, durationMs };
}
