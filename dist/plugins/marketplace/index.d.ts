/**
 * OpenOxygen — Plugin Marketplace (26w11aE_P7)
 *
 * 安全插件生态系统：
 * - Ed25519 签名验证
 * - OpenClaw skills 兼容导入
 * - 本地插件仓库
 * - CLI 安装/卸载/更新
 * - 权限声明审计
 */
export interface PluginManifest {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    permissions: string[];
    entry: string;
    tags: string[];
    models: string[];
    minOpenClawVersion?: string;
    requiredEnv?: string[];
    minOpenOxygenVersion?: string;
    signature?: string;
    integrity?: string;
}
export interface MarketplaceMeta {
    name: string;
    tagline: string;
    description: string;
    category: string;
    tags: string[];
    version: string;
    license: string;
    pricing: string;
    support_url?: string;
    homepage_url?: string;
    downloads?: number;
    rating?: number;
    verified?: boolean;
    publisher?: string;
}
export interface PublishMeta {
    owner: string;
    slug: string;
    displayName: string;
    latest: {
        version: string;
        publishedAt: number;
        commit?: string;
    };
    history: Array<{
        version: string;
        publishedAt: number;
    }>;
}
export interface InstalledPlugin {
    manifest: PluginManifest;
    marketplace?: MarketplaceMeta;
    meta?: PublishMeta;
    installPath: string;
    installedAt: number;
    verified: boolean;
    integrityHash: string;
    source: "openclaw" | "openoxygen" | "local";
}
export declare function computePluginHash(pluginDir: string): string;
export declare function generateSigningKeys(): {
    publicKey: string;
    privateKey: string;
};
export declare function signPlugin(hash: string, privateKeyPem: string): string;
export declare function verifyPluginSignature(hash: string, signature: string, publicKeyPem: string): boolean;
export declare class PluginRepository {
    private pluginsDir;
    private installed;
    constructor(pluginsDir?: string);
    /**
     * 从 OpenClaw skills 目录导入
     */
    importFromOpenClaw(skillDir: string): InstalledPlugin | null;
    /**
     * 安装本地插件
     */
    installLocal(pluginDir: string): InstalledPlugin | null;
    /**
     * 卸载插件
     */
    uninstall(name: string): boolean;
    /**
     * 列出已安装插件
     */
    list(): InstalledPlugin[];
    /**
     * 获取插件信息
     */
    get(name: string): InstalledPlugin | undefined;
    /**
     * 搜索插件（本地已安装）
     */
    search(query: string): InstalledPlugin[];
    /**
     * 验证插件完整性
     */
    verifyIntegrity(name: string): {
        valid: boolean;
        reason?: string;
    };
    /**
     * 批量导入 OpenClaw skills 目录
     */
    batchImportOpenClaw(skillsRootDir: string, limit?: number): {
        imported: number;
        failed: number;
        skipped: number;
    };
    /**
     * 权限审计
     */
    auditPermissions(permissions: string[]): {
        safe: string[];
        warning: string[];
        blocked: string[];
    };
    private loadInstalled;
    private saveRegistry;
}
//# sourceMappingURL=index.d.ts.map