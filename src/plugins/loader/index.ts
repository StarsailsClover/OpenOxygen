/**
 * OpenOxygen — Plugin System
 *
 * 插件加载器：发现、验证、加载和管理插件生命周期。
 * 兼容 OpenClaw 插件协议。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import type {
  OxygenConfig,
  OxygenPluginDefinition,
  PluginConfig,
  PluginContext,
  PluginHook,
  PluginHookPhase,
  PluginManifest,
} from "../../types/index.js";
import { defaultRuntime } from "../../core/runtime/index.js";

const log = createSubsystemLogger("plugins/loader");

// ─── Plugin Registry ────────────────────────────────────────────────────────

export type LoadedPlugin = {
  manifest: PluginManifest;
  definition: OxygenPluginDefinition;
  config: PluginConfig;
  status: "loaded" | "active" | "error" | "disabled";
  error?: string;
};

export class PluginRegistry {
  private plugins = new Map<string, LoadedPlugin>();

  register(name: string, plugin: LoadedPlugin): void {
    this.plugins.set(name, plugin);
    log.info(`Plugin registered: ${name} (${plugin.status})`);
  }

  get(name: string): LoadedPlugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): LoadedPlugin[] {
    return [...this.plugins.values()];
  }

  getActive(): LoadedPlugin[] {
    return this.getAll().filter((p) => p.status === "active");
  }

  remove(name: string): boolean {
    return this.plugins.delete(name);
  }

  /**
   * Collect all hooks for a given phase, sorted by priority.
   */
  getHooksForPhase(phase: PluginHookPhase): PluginHook[] {
    const hooks: PluginHook[] = [];
    for (const plugin of this.getActive()) {
      if (plugin.definition.hooks) {
        for (const hook of plugin.definition.hooks) {
          if (hook.phase === phase) {
            hooks.push(hook);
          }
        }
      }
    }
    hooks.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    return hooks;
  }

  /**
   * Collect all tools from active plugins.
   */
  getAllTools(): OxygenPluginDefinition["tools"] {
    const tools: NonNullable<OxygenPluginDefinition["tools"]> = [];
    for (const plugin of this.getActive()) {
      if (plugin.definition.tools) {
        tools.push(...plugin.definition.tools);
      }
    }
    return tools;
  }
}

// ─── Plugin Loader ──────────────────────────────────────────────────────────

export async function loadPlugins(
  config: OxygenConfig,
  registry: PluginRegistry,
): Promise<void> {
  for (const pluginConfig of config.plugins) {
    if (!pluginConfig.enabled) {
      registry.register(pluginConfig.name, {
        manifest: { name: pluginConfig.name, version: "0.0.0", entryPoint: "" },
        definition: { manifest: { name: pluginConfig.name, version: "0.0.0", entryPoint: "" } },
        config: pluginConfig,
        status: "disabled",
      });
      continue;
    }

    try {
      const loaded = await loadSinglePlugin(pluginConfig);
      registry.register(pluginConfig.name, loaded);

      // Activate plugin
      if (loaded.definition.activate) {
        const ctx = createPluginContext(pluginConfig);
        await loaded.definition.activate(ctx);
        loaded.status = "active";
        log.info(`Plugin activated: ${pluginConfig.name}`);
      } else {
        loaded.status = "active";
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error(`Failed to load plugin ${pluginConfig.name}: ${errorMsg}`);
      registry.register(pluginConfig.name, {
        manifest: { name: pluginConfig.name, version: "0.0.0", entryPoint: "" },
        definition: { manifest: { name: pluginConfig.name, version: "0.0.0", entryPoint: "" } },
        config: pluginConfig,
        status: "error",
        error: errorMsg,
      });
    }
  }
}

async function loadSinglePlugin(config: PluginConfig): Promise<LoadedPlugin> {
  if (!config.path) {
    throw new Error(`Plugin ${config.name} has no path configured`);
  }

  const pluginPath = path.resolve(config.path);

  // Try to load manifest
  let manifest: PluginManifest;
  try {
    const manifestPath = path.join(pluginPath, "manifest.json");
    const raw = await fs.readFile(manifestPath, "utf-8");
    manifest = JSON.parse(raw) as PluginManifest;
  } catch {
    manifest = {
      name: config.name,
      version: "0.0.0",
      entryPoint: "index.js",
    };
  }

  // Load plugin module
  const entryPath = path.join(pluginPath, manifest.entryPoint);
  const module = (await import(entryPath)) as { default?: OxygenPluginDefinition } & OxygenPluginDefinition;
  const definition = module.default ?? module;

  return {
    manifest,
    definition,
    config,
    status: "loaded",
  };
}

function createPluginContext(config: PluginConfig): PluginContext {
  return {
    config: config.config ?? {},
    logger: {
      log: (...args: unknown[]) => log.info(`[${config.name}]`, ...args),
      error: (...args: unknown[]) => log.error(`[${config.name}]`, ...args),
      warn: (...args: unknown[]) => log.warn(`[${config.name}]`, ...args),
    },
    runtime: defaultRuntime,
  };
}

// ─── Hook Runner ────────────────────────────────────────────────────────────

export async function runHooks(
  registry: PluginRegistry,
  phase: PluginHookPhase,
  payload: unknown,
): Promise<unknown> {
  const hooks = registry.getHooksForPhase(phase);
  let result = payload;

  for (const hook of hooks) {
    try {
      const ctx: PluginContext = {
        config: {},
        logger: { log: log.info, error: log.error, warn: log.warn },
        runtime: defaultRuntime,
      };
      result = await hook.handler(ctx, result);
    } catch (err) {
      log.error(`Hook error in phase ${phase}:`, err);
    }
  }

  return result;
}
