/**
 * OpenOxygen — Configuration System
 *
 * 配置加载、验证、热重载。
 * 支持 openoxygen.json + .env + 环境变量三级覆盖。
 * 兼容 OpenClaw 的 openclaw.json 配置格式（通过 compat 层转译）。
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createSubsystemLogger } from "../../logging/index.js";
import type { OxygenConfig } from "../../types/index.js";
import { resolveUserPath } from "../../utils/index.js";

const log = createSubsystemLogger("config");

// ─── Paths ──────────────────────────────────────────────────────────────────

const DEFAULT_STATE_DIR = "~/.openoxygen";
const DEFAULT_CONFIG_FILENAME = "openoxygen.json";

export function resolveStateDir(env: NodeJS.ProcessEnv = process.env): string {
  return resolveUserPath(env["OPENOXYGEN_STATE_DIR"] ?? DEFAULT_STATE_DIR);
}

export function resolveConfigPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env["OPENOXYGEN_CONFIG_PATH"]) {
    return resolveUserPath(env["OPENOXYGEN_CONFIG_PATH"]);
  }
  return path.join(resolveStateDir(env), DEFAULT_CONFIG_FILENAME);
}

// ─── Defaults ───────────────────────────────────────────────────────────────

export function createDefaultConfig(): OxygenConfig {
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
  };
}

// ─── Dotenv ─────────────────────────────────────────────────────────────────

export async function loadDotEnv(opts?: { quiet?: boolean }): Promise<void> {
  const candidates = [
    path.resolve(".env"),
    path.join(resolveStateDir(), ".env"),
  ];

  for (const envPath of candidates) {
    try {
      const content = await fs.readFile(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        // Strip surrounding quotes
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
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
    } catch {
      // File doesn't exist — skip silently
    }
  }
}

// ─── Config Loading ─────────────────────────────────────────────────────────

let cachedConfig: OxygenConfig | null = null;
let cachedConfigHash: string | null = null;

export async function loadConfig(
  configPath?: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<OxygenConfig> {
  const resolved = configPath ?? resolveConfigPath(env);

  try {
    const raw = await fs.readFile(resolved, "utf-8");
    const parsed = JSON.parse(raw) as Partial<OxygenConfig>;
    const config = mergeWithDefaults(parsed);

    // Apply env overrides
    applyEnvOverrides(config, env);

    cachedConfig = config;
    cachedConfigHash = simpleHash(raw);
    log.info(`Config loaded from ${resolved}`);
    return config;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      log.warn(`Config file not found at ${resolved}, using defaults`);
      const config = createDefaultConfig();
      applyEnvOverrides(config, env);
      cachedConfig = config;
      return config;
    }
    throw err;
  }
}

export function getCachedConfig(): OxygenConfig | null {
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
  cachedConfigHash = null;
}

// ─── Config Merge ───────────────────────────────────────────────────────────

function mergeWithDefaults(partial: Partial<OxygenConfig>): OxygenConfig {
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
  } satisfies OxygenConfig;
}

// ─── Env Overrides ──────────────────────────────────────────────────────────

function applyEnvOverrides(config: OxygenConfig, env: NodeJS.ProcessEnv): void {
  // Gateway
  if (env["OPENOXYGEN_GATEWAY_PORT"]) {
    config.gateway.port = parseInt(env["OPENOXYGEN_GATEWAY_PORT"], 10);
  }
  if (env["OPENOXYGEN_GATEWAY_HOST"]) {
    config.gateway.host = env["OPENOXYGEN_GATEWAY_HOST"];
  }
  if (env["OPENOXYGEN_GATEWAY_TOKEN"]) {
    config.gateway.auth = {
      mode: "token",
      token: env["OPENOXYGEN_GATEWAY_TOKEN"],
    };
  }

  // Model API keys — auto-detect and populate
  const keyMappings: Array<{ env: string; provider: string }> = [
    { env: "OPENAI_API_KEY", provider: "openai" },
    { env: "ANTHROPIC_API_KEY", provider: "anthropic" },
    { env: "GEMINI_API_KEY", provider: "gemini" },
    { env: "OPENROUTER_API_KEY", provider: "openrouter" },
    { env: "STEPFUN_API_KEY", provider: "stepfun" },
  ];

  for (const mapping of keyMappings) {
    const key = env[mapping.env];
    if (key) {
      const existing = config.models.find(
        (m) => m.provider === mapping.provider,
      );
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

export async function writeConfig(
  config: OxygenConfig,
  configPath?: string,
): Promise<void> {
  const resolved = configPath ?? resolveConfigPath();
  const dir = path.dirname(resolved);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(resolved, JSON.stringify(config, null, 2), "utf-8");
  cachedConfig = config;
  log.info(`Config written to ${resolved}`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export async function hasConfigChanged(configPath?: string): Promise<boolean> {
  if (!cachedConfigHash) return true;
  const resolved = configPath ?? resolveConfigPath();
  try {
    const raw = await fs.readFile(resolved, "utf-8");
    return simpleHash(raw) !== cachedConfigHash;
  } catch {
    return true;
  }
}
