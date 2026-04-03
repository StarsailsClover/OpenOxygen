/**
 * OpenOxygen - Configuration System
 *
 * 配置加载、验证、热重载。
 * 支持 openoxygen.json + .env + 环境变量三级覆盖。
 * 兼容 OpenClaw 的 openclaw.json 配置格式（通过 compat 层转换）。
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createSubsystemLogger } from "../../logging/index.js";
import type { OxygenConfig } from "../../types/index.js";
import { resolveUserPath } from "../../utils/index.js";

const log = createSubsystemLogger("config");

// === Paths ===

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

// === Defaults ===

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

// === Load Config ===

/**
 * Load configuration from all sources
 */
export async function loadConfig(
  options: {
    configPath?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<OxygenConfig> {
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
  } catch (error) {
    log.warn(`Failed to load config file: ${error}`);
  }

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
async function loadConfigFromFile(configPath: string): Promise<Partial<OxygenConfig>> {
  const content = await fs.readFile(configPath, "utf-8");
  return JSON.parse(content) as Partial<OxygenConfig>;
}

/**
 * Load config from environment variables
 */
function loadConfigFromEnv(env: NodeJS.ProcessEnv): Partial<OxygenConfig> {
  const config: Partial<OxygenConfig> = {};

  // Gateway settings
  if (env.OPENOXYGEN_GATEWAY_HOST) {
    config.gateway = { ...config.gateway, host: env.OPENOXYGEN_GATEWAY_HOST };
  }
  if (env.OPENOXYGEN_GATEWAY_PORT) {
    config.gateway = { ...config.gateway, port: parseInt(env.OPENOXYGEN_GATEWAY_PORT, 10) };
  }

  // Model settings
  const models: any[] = [];
  
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
function mergeConfig(base: OxygenConfig, override: Partial<OxygenConfig>): OxygenConfig {
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

// === Validation ===

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate configuration
 */
export function validateConfig(config: OxygenConfig): ValidationResult {
  const errors: string[] = [];

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
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// === DotEnv Loading ===

/**
 * Load .env file
 */
export async function loadDotEnv(envPath?: string): Promise<void> {
  const dotenvPath = envPath ?? path.join(process.cwd(), ".env");

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
  } catch (error) {
    // .env file is optional
    log.debug(`No .env file found at: ${dotenvPath}`);
  }
}

// === Exports ===

export {
  loadConfig,
  validateConfig,
  loadDotEnv,
  createDefaultConfig,
  resolveStateDir,
  resolveConfigPath,
};

export default {
  load: loadConfig,
  validate: validateConfig,
  loadDotEnv,
  createDefault: createDefaultConfig,
  resolveStateDir,
  resolveConfigPath,
};
