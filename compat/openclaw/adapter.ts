/**
 * OpenClaw Compatibility Layer
 * 
 * 提供与 OpenClaw 的兼容支持
 */

export interface OpenClawConfig {
    version: string;
    settings: Record<string, any>;
}

export interface OpenOxygenConfig {
    version: string;
    nativeModule: string;
    llm: {
        provider: string;
        model: string;
    };
}

export class OpenClawAdapter {
    /**
     * 将 OpenClaw 配置转换为 OpenOxygen 配置
     */
    static migrateConfig(openclawConfig: OpenClawConfig): OpenOxygenConfig {
        return {
            version: '26w15aE',
            nativeModule: './native/build/Release/openoxygen_native.node',
            llm: {
                provider: 'ollama',
                model: openclawConfig.settings?.model || 'qwen3:4b'
            }
        };
    }
    
    /**
     * 检查配置兼容性
     */
    static checkCompatibility(config: OpenClawConfig): {
        compatible: boolean;
        issues: string[];
    } {
        const issues: string[] = [];
        
        if (!config.version) {
            issues.push('Missing version field');
        }
        
        return {
            compatible: issues.length === 0,
            issues
        };
    }
}

export default OpenClawAdapter;
