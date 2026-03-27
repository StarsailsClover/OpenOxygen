/**
 * OpenOxygen — Plugin System
 *
 * 插件加载器：发现、验证、加载和管理插件生命周期。
 * 兼容 OpenClaw 插件协议。
 */
import type { OxygenConfig, OxygenPluginDefinition, PluginConfig, PluginHook, PluginHookPhase, PluginManifest } from "../../types/index.js";
export type LoadedPlugin = {
    manifest: PluginManifest;
    definition: OxygenPluginDefinition;
    config: PluginConfig;
    status: "loaded" | "active" | "error" | "disabled";
    error?: string;
};
export declare class PluginRegistry {
    private plugins;
    register(name: string, plugin: LoadedPlugin): void;
    get(name: string): LoadedPlugin | undefined;
    getAll(): LoadedPlugin[];
    getActive(): LoadedPlugin[];
    remove(name: string): boolean;
    /**
     * Collect all hooks for a given phase, sorted by priority.
     */
    getHooksForPhase(phase: PluginHookPhase): PluginHook[];
    /**
     * Collect all tools from active plugins.
     */
    getAllTools(): OxygenPluginDefinition["tools"];
}
export declare function loadPlugins(config: OxygenConfig, registry: PluginRegistry): Promise<void>;
export declare function runHooks(registry: PluginRegistry, phase: PluginHookPhase, payload: unknown): Promise<unknown>;
//# sourceMappingURL=index.d.ts.map