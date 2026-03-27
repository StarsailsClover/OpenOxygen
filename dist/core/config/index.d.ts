/**
 * OpenOxygen — Configuration System
 *
 * 配置加载、验证、热重载。
 * 支持 openoxygen.json + .env + 环境变量三级覆盖。
 * 兼容 OpenClaw 的 openclaw.json 配置格式（通过 compat 层转译）。
 */
import type { OxygenConfig } from "../../types/index.js";
export declare function resolveStateDir(env?: NodeJS.ProcessEnv): string;
export declare function resolveConfigPath(env?: NodeJS.ProcessEnv): string;
export declare function createDefaultConfig(): OxygenConfig;
export declare function loadDotEnv(opts?: {
    quiet?: boolean;
}): Promise<void>;
export declare function loadConfig(configPath?: string, env?: NodeJS.ProcessEnv): Promise<OxygenConfig>;
export declare function getCachedConfig(): OxygenConfig | null;
export declare function clearConfigCache(): void;
export declare function writeConfig(config: OxygenConfig, configPath?: string): Promise<void>;
export declare function hasConfigChanged(configPath?: string): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map