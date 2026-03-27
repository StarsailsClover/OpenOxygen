/**
 * OpenOxygen — Temporary File Security Manager (26w11aE_P1)
 *
 * 针对 risks.md 临时文件泄露风险的加固实现：
 * - 强制 0600 权限（仅所有者可读写）
 * - 自动清理机制
 * - 安全临时目录隔离
 * - 敏感数据内存加密
 */
export declare class SecureTempDirectory {
    private basePath;
    private cleanupTimer;
    private activeFiles;
    constructor(customPath?: string);
    private initialize;
    /**
     * 创建安全临时文件
     */
    createFile(options?: {
        prefix?: string;
        suffix?: string;
        sensitive?: boolean;
        encrypted?: boolean;
    }): SecureTempFile;
    /**
     * 获取隔离目录路径
     */
    getPath(): string;
    /**
     * 手动清理过期文件
     */
    cleanup(): void;
    /**
     * 销毁整个临时目录
     */
    destroy(): void;
    private listFiles;
    private startCleanupTimer;
    private stopCleanupTimer;
}
export declare class SecureTempFile {
    readonly path: string;
    private options;
    private createdAt;
    private encryptionKey?;
    private encryptionSalt?;
    constructor(filepath: string, options: {
        sensitive: boolean;
        encrypted: boolean;
        maxAgeMs: number;
    });
    /**
     * 写入数据（自动加密如果启用）
     */
    write(data: string | Buffer): void;
    /**
     * 读取数据（自动解密如果启用）
     */
    read(): Buffer;
    /**
     * 安全删除（覆写后删除）
     */
    secureDelete(): void;
    /**
     * 检查是否过期
     */
    isExpired(): boolean;
    /**
     * 获取文件信息
     */
    getInfo(): {
        path: string;
        sensitive: boolean;
        encrypted: boolean;
        createdAt: number;
        ageMs: number;
        isExpired: boolean;
    };
    private createEmptyFile;
    private encrypt;
    private decrypt;
}
export declare function getSecureTempDir(): SecureTempDirectory;
/**
 * 程序退出时清理
 */
export declare function cleanupOnExit(): void;
//# sourceMappingURL=tempfs.d.ts.map