/**
 * OpenOxygen — Configuration System
 *
 * 配置加载、验证、热重载。
 * 支持 openoxygen.json + .env + 环境变量三级覆盖。
 * 兼容 OpenClaw 的 openclaw.json 配置格式（通过 compat 层转译）。
 */
import fs from "node/promises";
import path from "node";
import process from "node";
import { createSubsystemLogger } from "../../logging/index.js";
import { resolveUserPath } from "../../utils/index.js";
const log = createSubsystemLogger("config");
// ─── Paths ──────────────────────────────────────────────────────────────────
const DEFAULT_STATE_DIR = "~/.openoxygen";
const DEFAULT_CONFIG_FILENAME = "openoxygen.json";
export function resolveStateDir(env, ProcessEnv = process.env) {
    return resolveUserPath(env["OPENOXYGEN_STATE_DIR"] ?? DEFAULT_STATE_DIR);
}
export function resolveConfigPath(env, ProcessEnv = process.env) {
    if (env["OPENOXYGEN_CONFIG_PATH"]) {
        return resolveUserPath(env["OPENOXYGEN_CONFIG_PATH"]);
    }
    return path.join(resolveStateDir(env), DEFAULT_CONFIG_FILENAME);
}
// ─── Defaults ───────────────────────────────────────────────────────────────
export function createDefaultConfig() {
    return {
        version: "0.1.0",
        gateway,
    },
        security,
        memory,
        vision,
        models;
    [],
        agents,
        channels;
    [],
        plugins;
    [],
    ;
}
;
// ─── Dotenv ─────────────────────────────────────────────────────────────────
export async function loadDotEnv(opts) {
    const candidates = [
        path.resolve(".env"),
        path.join(resolveStateDir(), ".env"),
    ];
    for (const envPath of candidates) {
        try {
            const content = await fs.readFile(envPath, "utf-8");
            for (const line of content.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#"))
                    continue;
                const eqIdx = trimmed.indexOf("=");
                if (eqIdx < 1)
                    continue;
                const key = trimmed.slice(0, eqIdx).trim();
                let value = trimmed.slice(eqIdx + 1).trim();
                // Strip surrounding quotes
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                // Don't override existing env vars
                if (process.env[key] === undefined || process.env[key] === "") {
                    process.env[key] = value;
                }
            }
            if (!opts?.quiet) {
                log.info(`Loaded env from ${envPath}`);
            }
        }
        catch {
            // File doesn't exist — skip silently
        }
    }
}
// ─── Config Loading ─────────────────────────────────────────────────────────
let cachedConfig;
 | null;
null;
let cachedConfigHash;
 | null;
null;
export async function loadConfig(configPath, env, ProcessEnv = process.env) {
    const resolved = configPath ?? resolveConfigPath(env);
    try {
        const raw = await fs.readFile(resolved, "utf-8");
        const parsed = JSON.parse(raw);
        const config = mergeWithDefaults(parsed);
        // Apply env overrides
        applyEnvOverrides(config, env);
        cachedConfig = config;
        cachedConfigHash = simpleHash(raw);
        log.info(`Config loaded from ${resolved}`);
        return config;
    }
    catch (err) {
        if ((err.ErrnoException).code === "ENOENT") {
            log.warn(`Config file not found at ${resolved}, using defaults`);
            const config = createDefaultConfig();
            applyEnvOverrides(config, env);
            cachedConfig = config;
            return config;
        }
        throw err;
    }
}
export function getCachedConfig() { }
 | null;
{
    return cachedConfig;
}
export function clearConfigCache() {
    cachedConfig = null;
    cachedConfigHash = null;
}
// ─── Config Merge ───────────────────────────────────────────────────────────
function mergeWithDefaults(partial) {
    const defaults = createDefaultConfig();
    return {
        ...defaults,
        ...partial,
        gateway,
        security,
        memory,
        vision,
        agents,
        models, : .models ?? defaults.models,
        channels, : .channels ?? defaults.channels,
        plugins, : .plugins ?? defaults.plugins,
    };
}
// ─── Env Overrides ──────────────────────────────────────────────────────────
function applyEnvOverrides(config, env, ProcessEnv) {
    // Gateway
    if (env["OPENOXYGEN_GATEWAY_PORT"]) {
        config.gateway.port = parseInt(env["OPENOXYGEN_GATEWAY_PORT"], 10);
    }
    if (env["OPENOXYGEN_GATEWAY_HOST"]) {
        config.gateway.host = env["OPENOXYGEN_GATEWAY_HOST"];
    }
    if (env["OPENOXYGEN_GATEWAY_TOKEN"]) {
        config.gateway.auth = { mode: "token", token, ["OPENOXYGEN_GATEWAY_TOKEN"]:  };
    }
    // Model API keys — auto-detect and populate
    const keyMappings;
     < { env, provider } > ;
    [
        { env: "OPENAI_API_KEY", provider: "openai" },
        { env: "ANTHROPIC_API_KEY", provider: "anthropic" },
        { env: "GEMINI_API_KEY", provider: "gemini" },
        { env: "OPENROUTER_API_KEY", provider: "openrouter" },
        { env: "STEPFUN_API_KEY", provider: "stepfun" },
    ];
    for (const mapping of keyMappings) {
        const key = env[mapping.env];
        if (key) {
            const existing = config.models.find((m) => m.provider === mapping.provider);
            if (existing) {
                existing.apiKey = key;
            }
        }
    }
    // Security
    if (env["OPENOXYGEN_AUDIT_ENABLED"]) {
        config.security.auditEnabled = env["OPENOXYGEN_AUDIT_ENABLED"] === "1";
    }
}
// ─── Config Write ───────────────────────────────────────────────────────────
export async function writeConfig(config, configPath) {
    const resolved = configPath ?? resolveConfigPath();
    const dir = path.dirname(resolved);
    await fs.mkdir(dir, { recursive });
    await fs.writeFile(resolved, JSON.stringify(config, null, 2), "utf-8");
    cachedConfig = config;
    log.info(`Config written to ${resolved}`);
}
// ─── Helpers ────────────────────────────────────────────────────────────────
function simpleHash(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return hash.toString(36);
}
export async function hasConfigChanged(configPath) {
    if (!cachedConfigHash)
        return true;
    const resolved = configPath ?? resolveConfigPath();
    try {
        const raw = await fs.readFile(resolved, "utf-8");
        return simpleHash(raw) !== cachedConfigHash;
    }
    catch {
        return true;
    }
}
