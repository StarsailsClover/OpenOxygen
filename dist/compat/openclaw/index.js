/**
 * OpenOxygen — OpenClaw Compatibility Layer
 *
 * 兼容适配器：将 OpenClaw 的配置格式、插件协议、Skill 接口
 * 转译为 OpenOxygen 的内部格式，实现零修改迁移。
 */
import fs from "node:fs/promises";
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("compat/openclaw");
// ─── Config Translator ─────────────────────────────────────────────────────
export async function translateOpenClawConfig(openclawConfigPath) {
    try {
        const raw = await fs.readFile(openclawConfigPath, "utf-8");
        const clawConfig = JSON.parse(raw);
        return convertConfig(clawConfig);
    }
    catch (err) {
        log.error(`Failed to load OpenClaw config from ${openclawConfigPath}:`, err);
        return {};
    }
}
function convertConfig(claw) {
    const result = {};
    // Gateway
    if (claw.gateway) {
        result.gateway = {
            host: claw.gateway.host ?? "127.0.0.1",
            port: claw.gateway.port ?? 4800,
            auth: {
                mode: claw.gateway.auth?.token ? "token" : claw.gateway.auth?.password ? "password" : "none",
                token: claw.gateway.auth?.token,
                password: claw.gateway.auth?.password,
            },
        };
    }
    // Agents
    if (claw.agents) {
        result.agents = {
            default: claw.agents.default,
            list: (claw.agents.list ?? []).map(convertAgent),
        };
    }
    // Channels
    if (claw.channels) {
        result.channels = Object.entries(claw.channels).map(([id, cfg]) => ({
            id,
            type: id,
            enabled: cfg.enabled ?? true,
            config: cfg,
        }));
    }
    // Plugins
    if (claw.plugins) {
        result.plugins = Object.entries(claw.plugins).map(([name, cfg]) => ({
            name,
            enabled: cfg.enabled ?? true,
            path: cfg.path,
            config: cfg,
        }));
    }
    // Memory
    if (claw.memory) {
        result.memory = {
            backend: "builtin",
            embeddingProvider: mapProvider(claw.memory.provider),
            embeddingModel: claw.memory.model,
            hybridSearch: true,
        };
    }
    // Env
    if (claw.env) {
        result.env = claw.env;
    }
    log.info("OpenClaw config translated successfully");
    return result;
}
function convertAgent(claw) {
    let model;
    if (typeof claw.model === "string") {
        // Simple model string like "gpt-4o" or "anthropic/claude-sonnet-4-20250514"
        const parts = claw.model.split("/");
        if (parts.length === 2) {
            model = { provider: mapProvider(parts[0]) ?? "openai", model: parts[1] };
        }
        else {
            model = { provider: "openai", model: claw.model };
        }
    }
    else if (claw.model && typeof claw.model === "object") {
        model = {
            provider: mapProvider(claw.model.provider) ?? "openai",
            model: claw.model.name ?? "gpt-4o",
            apiKey: claw.model.apiKey,
        };
    }
    let skills;
    if (Array.isArray(claw.skills)) {
        skills = claw.skills;
    }
    return {
        id: claw.id ?? "default",
        name: claw.name,
        workspace: claw.workspace,
        model,
        skills,
        identity: claw.identity,
        sandbox: claw.sandbox ? { enabled: claw.sandbox.enabled ?? false, timeoutMs: claw.sandbox.timeoutMs } : undefined,
        tools: claw.tools,
    };
}
function mapProvider(provider) {
    if (!provider)
        return undefined;
    const lower = provider.toLowerCase();
    const mapping = {
        openai: "openai",
        anthropic: "anthropic",
        google: "gemini",
        gemini: "gemini",
        openrouter: "openrouter",
        ollama: "ollama",
        stepfun: "stepfun",
    };
    return mapping[lower] ?? "custom";
}
// ─── Skill Compatibility ────────────────────────────────────────────────────
/**
 * Check if an OpenClaw skill directory is compatible with OpenOxygen.
 */
export async function validateOpenClawSkill(skillPath) {
    const errors = [];
    try {
        const stat = await fs.stat(skillPath);
        if (!stat.isDirectory()) {
            errors.push("Skill path is not a directory");
            return { valid: false, errors };
        }
        // Check for required files
        const files = await fs.readdir(skillPath);
        const hasManifest = files.some((f) => f === "manifest.json" || f === "package.json");
        const hasEntry = files.some((f) => f.endsWith(".ts") || f.endsWith(".js"));
        if (!hasEntry) {
            errors.push("No entry point file (.ts or .js) found");
        }
        const name = skillPath.split(/[/\\]/).pop() ?? "unknown";
        return { valid: errors.length === 0, name, errors };
    }
    catch (err) {
        errors.push(`Cannot access skill path: ${err}`);
        return { valid: false, errors };
    }
}
// ─── Plugin Protocol Adapter ────────────────────────────────────────────────
/**
 * Wrap an OpenClaw plugin module to work with OpenOxygen's plugin system.
 */
export function createOpenClawPluginAdapter(clawPlugin) {
    // Map OpenClaw plugin hooks to OpenOxygen hook phases
    return {
        ...clawPlugin,
        __compat: "openclaw",
        __adapted: true,
    };
}
