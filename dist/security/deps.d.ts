/**
 * OpenOxygen — Dependency Security Manager (26w11aE)
 *
 * 针对 risks.md 供应链风险的加固实现：
 * - 依赖版本锁定与审计
 * - 插件依赖白名单校验
 * - 完整性哈希验证
 */
export declare const DEPENDENCY_POLICY: {
    requiredVersions: {
        requests: string;
        pyyaml: string;
        urllib3: string;
        certifi: string;
        openssl: string;
    };
    blockedPackages: string[];
    allowedPluginDeps: Set<string>;
    vulnerablePatterns: {
        pkg: string;
        max: string;
        cve: string;
        severity: string;
    }[];
};
/**
 * 扫描并验证所有依赖的安全性
 */
export declare function auditDependencies(projectPath?: string): Promise<{
    passed: boolean;
    violations: DependencyViolation[];
    warnings: string[];
}>;
/**
 * 校验插件依赖是否在白名单内
 */
export declare function validatePluginDependencies(skillPath: string): {
    valid: boolean;
    violations: string[];
};
/**
 * 生成锁定文件（兼容 poetry/npm/pip）
 */
export declare function generateLockfile(type: "pip" | "poetry" | "npm", outputPath: string): Promise<void>;
/**
 * 验证依赖包的完整性（SHA-256）
 */
export declare function verifyPackageIntegrity(packagePath: string, expectedHash: string): boolean;
export type DependencyViolation = {
    type: "version" | "blocked" | "cve" | "integrity";
    package: string;
    installed: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    required?: string;
    cve?: string;
};
//# sourceMappingURL=deps.d.ts.map