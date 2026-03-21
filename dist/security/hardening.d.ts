/**
 * OpenOxygen — Security Hardening Module
 *
 * 针对 OpenClaw 已知漏洞的全面防护：
 *
 * [CVE-2026-25253] Gateway URL 注入 → 硬编码绑定 + 禁止外部覆盖
 * [ClawJacked]     WebSocket 跨域劫持 → Origin 校验 + 速率限制 + 设备审批
 * [CVE-2026-24763] PATH 命令注入 → 环境变量净化 + 参数白名单
 * [CVE-2026-25593] 日志投毒/提示注入 → 日志消毒 + 输入边界隔离
 * [Supply Chain]   插件投毒 → 签名校验 + 权限声明 + 沙箱执行
 * [CNCERT Advisory] 凭证明文存储 → 内存加密 + 文件权限锁定
 */
export declare function validateGatewayBinding(host: string, port: number): {
    safe: boolean;
    reason?: string;
};
/**
 * 拒绝从 URL 参数、HTTP header 或外部输入动态设置 gateway 地址。
 * 这是 CVE-2026-25253 的根本修复。
 */
export declare function sanitizeGatewayUrl(input: string): string | null;
export type RateLimiterConfig = {
    windowMs: number;
    maxRequests: number;
    maxAuthFailures: number;
    blockDurationMs: number;
};
export declare class RateLimiter {
    private clients;
    private config;
    constructor(config?: Partial<RateLimiterConfig>);
    /**
     * 检查请求是否被允许。返回 false 表示应拒绝。
     */
    check(clientIp: string): {
        allowed: boolean;
        reason?: string;
        retryAfterMs?: number;
    };
    /**
     * 记录认证失败。超过阈值自动封禁。
     */
    recordAuthFailure(clientIp: string): void;
    /**
     * 认证成功后重置失败计数。
     */
    resetAuthFailures(clientIp: string): void;
    /**
     * 定期清理过期记录，防止内存泄漏。
     */
    cleanup(): void;
}
/**
 * WebSocket Origin 校验。
 * 只允许来自本地或已知白名单的 Origin。
 */
export declare function validateWebSocketOrigin(origin: string | undefined, allowedOrigins?: string[]): boolean;
/**
 * 净化 shell 参数，移除所有元字符。
 */
export declare function sanitizeShellArg(arg: string): string;
/**
 * 验证命令是否在白名单中。
 */
export declare function validateCommand(command: string, allowedCommands?: string[]): {
    allowed: boolean;
    reason?: string;
};
/**
 * 净化环境变量，移除危险的 PATH 覆盖。
 * 防止 CVE-2026-24763 类型的 PATH 注入。
 */
export declare function sanitizeEnvironment(env: Record<string, string>): Record<string, string>;
/**
 * 消毒日志内容，移除可能的提示注入载荷。
 */
export declare function sanitizeLogContent(content: string): string;
/**
 * 检测输入中的提示注入模式。
 * 返回风险等级和匹配的模式。
 */
export declare function detectPromptInjection(input: string): {
    risk: "none" | "low" | "medium" | "high";
    patterns: string[];
};
/**
 * 计算文件的 SHA-256 哈希。
 */
export declare function computeFileHash(content: string | Buffer): string;
/**
 * 验证插件完整性。
 */
export declare function verifyPluginIntegrity(content: string | Buffer, expectedHash: string): boolean;
/**
 * 审计插件权限声明。
 * 返回风险评估和建议。
 */
export declare function auditPluginPermissions(permissions: string[]): {
    risk: "safe" | "caution" | "dangerous";
    warnings: string[];
};
/**
 * 加密敏感字符串（用于内存中保存 API Key）。
 */
export declare function encryptSecret(plaintext: string): string;
/**
 * 解密敏感字符串。
 */
export declare function decryptSecret(ciphertext: string): string;
/**
 * 遮蔽 API Key 用于日志输出。
 */
export declare function maskApiKey(key: string): string;
/**
 * 时间安全的字符串比较，防止计时攻击。
 */
export declare function timingSafeEqual(a: string, b: string): boolean;
//# sourceMappingURL=hardening.d.ts.map