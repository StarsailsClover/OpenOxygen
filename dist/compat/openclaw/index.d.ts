/**
 * OpenOxygen — OpenClaw Compatibility Layer
 *
 * 兼容适配器：将 OpenClaw 的配置格式、插件协议、Skill 接口
 * 转译为 OpenOxygen 的内部格式，实现零修改迁移。
 */
import type { OxygenConfig } from "../../types/index.js";
export declare function translateOpenClawConfig(openclawConfigPath: string): Promise<Partial<OxygenConfig>>;
/**
 * Check if an OpenClaw skill directory is compatible with OpenOxygen.
 */
export declare function validateOpenClawSkill(skillPath: string): Promise<{
    valid: boolean;
    name?: string;
    errors: string[];
}>;
/**
 * Wrap an OpenClaw plugin module to work with OpenOxygen's plugin system.
 */
export declare function createOpenClawPluginAdapter(clawPlugin: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=index.d.ts.map