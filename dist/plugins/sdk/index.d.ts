/**
 * OpenOxygen — Plugin SDK
 *
 * 插件开发 SDK：提供类型定义和辅助函数，供第三方插件开发者使用。
 * 兼容 OpenClaw 的 plugin-sdk 导出接口。
 */
import type { OxygenPluginDefinition, PluginContext, PluginHook, PluginHookPhase, PluginManifest, SystemOperation, ToolResult } from "../../types/index.js";
export type { OxygenPluginDefinition, PluginContext, PluginHook, PluginHookPhase, PluginManifest, SystemOperation, ToolResult, };
export type PluginBuilder = {
    setManifest: (manifest: PluginManifest) => PluginBuilder;
    addHook: (phase: PluginHookPhase, handler: PluginHook["handler"], priority?: number) => PluginBuilder;
    addTool: (tool: NonNullable<OxygenPluginDefinition["tools"]>[number]) => PluginBuilder;
    onActivate: (handler: (ctx: PluginContext) => Promise<void>) => PluginBuilder;
    onDeactivate: (handler: (ctx: PluginContext) => Promise<void>) => PluginBuilder;
    build: () => OxygenPluginDefinition;
};
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
export declare function definePlugin(): PluginBuilder;
export declare function createToolResult(output: unknown, durationMs?: number): ToolResult;
export declare function createToolError(error: string, durationMs?: number): ToolResult;
//# sourceMappingURL=index.d.ts.map