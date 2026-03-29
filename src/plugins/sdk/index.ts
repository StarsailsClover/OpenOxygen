/**
 * OpenOxygen — Plugin SDK
 *
 * 插件开发 SDK：提供类型定义和辅助函数，供第三方插件开发者使用。
 * 兼容 OpenClaw 的 plugin-sdk 导出接口。
 */

import type {
  OxygenPluginDefinition,
  PluginContext,
  PluginHook,
  PluginHookPhase,
  PluginManifest,
  SystemOperation,
  ToolResult,
} from "../../types/index.js";

// ─── Re-exports for SDK consumers ──────────────────────────────────────────

export type {
  OxygenPluginDefinition,
  PluginContext,
  PluginHook,
  PluginHookPhase,
  PluginManifest,
  SystemOperation,
  ToolResult,
};

// ─── Plugin Builder ─────────────────────────────────────────────────────────

export type PluginBuilder = {
  setManifest: (manifest: PluginManifest) => PluginBuilder;
  addHook: (
    phase: PluginHookPhase,
    handler: PluginHook["handler"],
    priority?: number,
  ) => PluginBuilder;
  addTool: (
    tool: NonNullable<OxygenPluginDefinition["tools"]>[number],
  ) => PluginBuilder;
  onActivate: (handler: (ctx: PluginContext) => Promise<void>) => PluginBuilder;
  onDeactivate: (
    handler: (ctx: PluginContext) => Promise<void>,
  ) => PluginBuilder;
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
export function definePlugin(): PluginBuilder {
  let manifest: PluginManifest = {
    name: "unnamed",
    version: "0.0.0",
    entryPoint: "index.js",
  };
  const hooks: PluginHook[] = [];
  const tools: NonNullable<OxygenPluginDefinition["tools"]> = [];
  let activateHandler: ((ctx: PluginContext) => Promise<void>) | undefined;
  let deactivateHandler: ((ctx: PluginContext) => Promise<void>) | undefined;

  const builder: PluginBuilder = {
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

export function createToolResult(output: unknown, durationMs = 0): ToolResult {
  return { success: true, output, durationMs };
}

export function createToolError(error: string, durationMs = 0): ToolResult {
  return { success: false, error, durationMs };
}
