/**
<<<<<<< HEAD
 * OpenOxygen �?Configuration System
 *
 * 配置加载、验证、热重载�?
 * 支持 openoxygen.json + .env + 环境变量三级覆盖�?
 * 兼容 OpenClaw �?openclaw.json 配置格式（通过 compat 层转译）�?
=======
 * OpenOxygen - Configuration System
 *
 * 配置加载、验证、热重载。
 * 支持 openoxygen.json + .env + 环境变量三级覆盖。
 * 兼容 OpenClaw 的 openclaw.json 配置格式（通过 compat 层转换）。
>>>>>>> dev
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createSubsystemLogger } from "../../logging/index.js";
import { resolveUserPath } from "../../utils/index.js";
const log = createSubsystemLogger("config");
// === Paths ===
const DEFAULT_STATE_DIR = "~/.openoxygen";
const DEFAULT_CONFIG_FILENAME = "openoxygen.json";
export function resolveStateDir(env = process.env) {
    return resolveUserPath(env["OPENOXYGEN_STATE_DIR"] ?? DEFAULT_STATE_DIR);
}
export function resolveConfigPath(env = process.env) {
    if (env["OPENOXYGEN_CONFIG_PATH"]) {
        return resolveUserPath(env["OPENOXYGEN_CONFIG_PATH"]);
    }
    return path.join(resolveStateDir(env), DEFAULT_CONFIG_FILENAME);
}
// === Defaults ===
export function createDefaultConfig() {
    return {
        version: "0.1.0",
        gateway: {
            host: "127.0.0.1",
            port: 4800,
            auth: { mode: "token" },
        },
        security: {
            privilegeLevel: "minimal",
            auditEnabled: true,
            rollbackEnabled: true,
        },
        memory: {
            backend: "builtin",
            hybridSearch: true,
        },
        vision: {
            enabled: false,
        },
        models: [],
        agents: { list: [] },
        channels: [],
        plugins: [],
<<<<<<< HEAD
    };
}
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
            // File doesn't exist �?skip silently
        }
    }
}
// ─── Config Loading ─────────────────────────────────────────────────────────
let cachedConfig = null;
let cachedConfigHash = null;
export async function loadConfig(configPath, env = process.env) {
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
        if (err.code === "ENOENT") {
            log.warn(`Config file not found at ${resolved}, using defaults`);
            const config = createDefaultConfig();
            applyEnvOverrides(config, env);
            cachedConfig = config;
            return config;
        }
        throw err;
    }
}
export function getCachedConfig() {
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
        gateway: { ...defaults.gateway, ...partial.gateway },
        security: { ...defaults.security, ...partial.security },
        memory: { ...defaults.memory, ...partial.memory },
        vision: { ...defaults.vision, ...partial.vision },
        agents: {
            default: partial.agents?.default ?? defaults.agents.default,
            list: partial.agents?.list ?? defaults.agents.list,
        },
        models: partial.models ?? defaults.models,
        channels: partial.channels ?? defaults.channels,
        plugins: partial.plugins ?? defaults.plugins,
    };
}
// ─── Env Overrides ──────────────────────────────────────────────────────────
function applyEnvOverrides(config, env) {
    // Gateway
    if (env["OPENOXYGEN_GATEWAY_PORT"]) {
        config.gateway.port = parseInt(env["OPENOXYGEN_GATEWAY_PORT"], 10);
=======
    };
}
// === Load Config ===
/**
 * Load configuration from all sources
 */
export async function loadConfig(options = {}) {
    const env = options.env ?? process.env;
    const configPath = options.configPath ?? resolveConfigPath(env);
    log.info(`Loading config from: ${configPath}`);
    // Start with defaults
    let config = createDefaultConfig();
    // Load from file
    try {
        const fileConfig = await loadConfigFromFile(configPath);
        config = mergeConfig(config, fileConfig);
        log.debug("Loaded config from file");
>>>>>>> dev
    }
    catch (error) {
        log.warn(`Failed to load config file: ${error}`);
    }
<<<<<<< HEAD
    if (env["OPENOXYGEN_GATEWAY_TOKEN"]) {
        config.gateway.auth = {
            mode: "token",
            token: env["OPENOXYGEN_GATEWAY_TOKEN"],
        };
    }
    // Model API keys �?auto-detect and populate
    const keyMappings = [
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
=======
    // Override with environment variables
    const envConfig = loadConfigFromEnv(env);
    config = mergeConfig(config, envConfig);
    // Validate
    const validation = validateConfig(config);
    if (!validation.valid) {
        throw new Error(`Config validation failed: ${validation.errors.join(", ")}`);
    }
    log.info("Config loaded successfully");
    return config;
}
/**
 * Load config from JSON file
 */
async function loadConfigFromFile(configPath) {
    const content = await fs.readFile(configPath, "utf-8");
    return JSON.parse(content);
}
/**
 * Load config from environment variables
 */
function loadConfigFromEnv(env) {
    const config = {};
    // Gateway settings
    if (env.OPENOXYGEN_GATEWAY_HOST) {
        config.gateway = { ...config.gateway, host: env.OPENOXYGEN_GATEWAY_HOST };
    }
    if (env.OPENOXYGEN_GATEWAY_PORT) {
        config.gateway = { ...config.gateway, port: parseInt(env.OPENOXYGEN_GATEWAY_PORT, 10) };
    }
    // Model settings
    const models = [];
    if (env.OPENAI_API_KEY) {
        models.push({
            provider: "openai",
            model: env.OPENAI_MODEL || "gpt-4o-mini",
            apiKey: env.OPENAI_API_KEY,
        });
    }
    if (env.ANTHROPIC_API_KEY) {
        models.push({
            provider: "anthropic",
            model: env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
            apiKey: env.ANTHROPIC_API_KEY,
        });
    }
    if (models.length > 0) {
        config.models = models;
    }
    // Security settings
    if (env.OPENOXYGEN_AUDIT_ENABLED) {
        config.security = {
            ...config.security,
            auditEnabled: env.OPENOXYGEN_AUDIT_ENABLED === "1" || env.OPENOXYGEN_AUDIT_ENABLED === "true",
        };
    }
    return config;
}
/**
 * Merge two config objects
 */
function mergeConfig(base, override) {
    return {
        ...base,
        ...override,
        gateway: { ...base.gateway, ...override.gateway },
        security: { ...base.security, ...override.security },
        memory: { ...base.memory, ...override.memory },
        vision: { ...base.vision, ...override.vision },
        models: override.models ?? base.models,
        agents: { ...base.agents, ...override.agents },
        channels: override.channels ?? base.channels,
        plugins: override.plugins ?? base.plugins,
    };
}
/**
 * Validate configuration
 */
export function validateConfig(config) {
    const errors = [];
    // Check gateway settings
    if (!config.gateway?.host) {
        errors.push("Gateway host is required");
    }
    if (!config.gateway?.port || config.gateway.port < 1 || config.gateway.port > 65535) {
        errors.push("Gateway port must be between 1 and 65535");
    }
    // Check models
    for (const model of config.models || []) {
        if (!model.provider) {
            errors.push("Model provider is required");
        }
        if (!model.model) {
            errors.push("Model name is required");
>>>>>>> dev
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
<<<<<<< HEAD
// ─── Config Write ───────────────────────────────────────────────────────────
export async function writeConfig(config, configPath) {
    const resolved = configPath ?? resolveConfigPath();
    const dir = path.dirname(resolved);
    await fs.mkdir(dir, { recursive: true });
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
=======
// === DotEnv Loading ===
/**
 * Load .env file
 */
export async function loadDotEnv(envPath) {
    const dotenvPath = envPath ?? path.join(process.cwd(), ".env");
>>>>>>> dev
    try {
        const content = await fs.readFile(dotenvPath, "utf-8");
        const lines = content.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }
            const equalIndex = trimmed.indexOf("=");
            if (equalIndex === -1) {
                continue;
            }
            const key = trimmed.slice(0, equalIndex).trim();
            let value = trimmed.slice(equalIndex + 1).trim();
            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            // Only set if not already in environment
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
        log.debug(`Loaded .env from: ${dotenvPath}`);
    }
    catch (error) {
        // .env file is optional
        log.debug(`No .env file found at: ${dotenvPath}`);
    }
}
export default {
    load: loadConfig,
    validate: validateConfig,
    loadDotEnv,
    createDefault: createDefaultConfig,
    resolveStateDir,
    resolveConfigPath,
};
