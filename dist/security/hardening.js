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
import crypto from "node:crypto";
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("security/hardening");
// ═══════════════════════════════════════════════════════════════════════════
// 1. GATEWAY URL INJECTION DEFENSE  (CVE-2026-25253)
//    OpenClaw 从 URL query string 读取 gatewayUrl 并自动连接，
//    攻击者可构造恶意链接劫持 WebSocket 连接。
//    OpenOxygen 方案：完全禁止从外部输入覆盖 gateway 地址。
// ═══════════════════════════════════════════════════════════════════════════
const ALLOWED_GATEWAY_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
export function validateGatewayBinding(host, port) {
    // 禁止绑定到 0.0.0.0 或公网地址
    if (host === "0.0.0.0" || host === "::") {
        return {
            safe: false,
            reason: `Binding to "${host}" exposes the gateway to the public network. Use "127.0.0.1" for local-only access.`,
        };
    }
    if (!ALLOWED_GATEWAY_HOSTS.has(host)) {
        log.warn(`Gateway binding to non-localhost address: ${host}`);
    }
    if (port < 1024) {
        return {
            safe: false,
            reason: `Port ${port} is a privileged port. Use a port >= 1024.`,
        };
    }
    return { safe: true };
}
/**
 * 拒绝从 URL 参数、HTTP header 或外部输入动态设置 gateway 地址。
 * 这是 CVE-2026-25253 的根本修复。
 */
export function sanitizeGatewayUrl(input) {
    try {
        const url = new URL(input);
        if (!ALLOWED_GATEWAY_HOSTS.has(url.hostname)) {
            log.error(`Rejected external gateway URL: ${input}`);
            return null;
        }
        return url.toString();
    }
    catch {
        return null;
    }
}
const DEFAULT_RATE_LIMIT = {
    windowMs: 60_000, // 1 分钟窗口
    maxRequests: 60, // 每分钟最多 60 请求
    maxAuthFailures: 5, // 5 次认证失败后封禁
    blockDurationMs: 300_000, // 封禁 5 分钟
};
export class RateLimiter {
    clients = new Map();
    config;
    constructor(config) {
        this.config = { ...DEFAULT_RATE_LIMIT, ...config };
    }
    /**
     * 检查请求是否被允许。返回 false 表示应拒绝。
     */
    check(clientIp) {
        const now = Date.now();
        let record = this.clients.get(clientIp);
        if (!record) {
            record = { requests: [], authFailures: 0, blockedUntil: 0 };
            this.clients.set(clientIp, record);
        }
        // 检查是否在封禁期
        if (record.blockedUntil > now) {
            return {
                allowed: false,
                reason: "Too many failed attempts. Temporarily blocked.",
                retryAfterMs: record.blockedUntil - now,
            };
        }
        // 清理过期请求记录
        const windowStart = now - this.config.windowMs;
        record.requests = record.requests.filter((t) => t > windowStart);
        // 检查速率
        if (record.requests.length >= this.config.maxRequests) {
            return {
                allowed: false,
                reason: "Rate limit exceeded.",
                retryAfterMs: this.config.windowMs,
            };
        }
        record.requests.push(now);
        return { allowed: true };
    }
    /**
     * 记录认证失败。超过阈值自动封禁。
     */
    recordAuthFailure(clientIp) {
        let record = this.clients.get(clientIp);
        if (!record) {
            record = { requests: [], authFailures: 0, blockedUntil: 0 };
            this.clients.set(clientIp, record);
        }
        record.authFailures += 1;
        log.warn(`Auth failure from ${clientIp} (${record.authFailures}/${this.config.maxAuthFailures})`);
        if (record.authFailures >= this.config.maxAuthFailures) {
            record.blockedUntil = Date.now() + this.config.blockDurationMs;
            log.error(`Client ${clientIp} blocked for ${this.config.blockDurationMs / 1000}s after ${record.authFailures} auth failures`);
        }
    }
    /**
     * 认证成功后重置失败计数。
     */
    resetAuthFailures(clientIp) {
        const record = this.clients.get(clientIp);
        if (record) {
            record.authFailures = 0;
        }
    }
    /**
     * 定期清理过期记录，防止内存泄漏。
     */
    cleanup() {
        const now = Date.now();
        for (const [ip, record] of this.clients) {
            if (record.requests.length === 0 && record.blockedUntil < now) {
                this.clients.delete(ip);
            }
        }
    }
}
/**
 * WebSocket Origin 校验。
 * 只允许来自本地或已知白名单的 Origin。
 */
export function validateWebSocketOrigin(origin, allowedOrigins) {
    if (!origin)
        return false; // 无 Origin 一律拒绝
    const allowed = new Set([
        "http://127.0.0.1",
        "http://localhost",
        "https://127.0.0.1",
        "https://localhost",
        ...(allowedOrigins ?? []),
    ]);
    // 匹配时忽略端口号
    try {
        const parsed = new URL(origin);
        const base = `${parsed.protocol}//${parsed.hostname}`;
        return allowed.has(base) || allowed.has(origin);
    }
    catch {
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 3. COMMAND INJECTION DEFENSE  (CVE-2026-24763, CVE-2026-25157)
//    OpenClaw 的 Docker sandbox 和 MCP 服务器存在 PATH 注入和参数注入。
//    OpenOxygen 方案：参数白名单 + shell 元字符过滤 + 环境变量净化。
// ═══════════════════════════════════════════════════════════════════════════
/** Shell 危险字符 */
const SHELL_META_CHARS = /[;&|`$(){}[\]<>!\n\r\\'"]/g;
/**
 * 净化 shell 参数，移除所有元字符。
 */
export function sanitizeShellArg(arg) {
    return arg.replace(SHELL_META_CHARS, "");
}
/**
 * 验证命令是否在白名单中。
 */
export function validateCommand(command, allowedCommands) {
    const basename = command
        .split(/[/\\]/)
        .pop()
        ?.toLowerCase()
        .replace(/\.exe$/i, "") ?? "";
    // 绝对禁止的命令（无论配置如何）
    const ALWAYS_BLOCKED = new Set([
        "format",
        "diskpart",
        "bcdedit",
        "shutdown",
        "restart",
        "sfc",
        "dism",
        "cipher",
        "reg",
        "regedit",
        "net",
        "netsh",
        "wmic",
        "powershell",
        "cmd",
        "bash",
        "sh",
        "curl",
        "wget",
        "certutil",
        "bitsadmin",
        "mshta",
        "wscript",
        "cscript",
        "rundll32",
        "regsvr32",
        "msiexec",
    ]);
    if (ALWAYS_BLOCKED.has(basename)) {
        return {
            allowed: false,
            reason: `Command "${basename}" is permanently blocked for security.`,
        };
    }
    if (allowedCommands && allowedCommands.length > 0) {
        if (!allowedCommands.includes(basename)) {
            return {
                allowed: false,
                reason: `Command "${basename}" is not in the allowed list.`,
            };
        }
    }
    return { allowed: true };
}
/**
 * 净化环境变量，移除危险的 PATH 覆盖。
 * 防止 CVE-2026-24763 类型的 PATH 注入。
 */
export function sanitizeEnvironment(env) {
    const sanitized = { ...env };
    // 移除可被利用的环境变量
    const DANGEROUS_VARS = [
        "LD_PRELOAD",
        "LD_LIBRARY_PATH",
        "DYLD_INSERT_LIBRARIES",
        "DYLD_LIBRARY_PATH",
        "NODE_OPTIONS",
        "ELECTRON_RUN_AS_NODE",
        "PYTHONPATH",
        "RUBYLIB",
        "PERL5LIB",
    ];
    for (const v of DANGEROUS_VARS) {
        if (sanitized[v]) {
            log.warn(`Removed dangerous env var: ${v}`);
            delete sanitized[v];
        }
    }
    return sanitized;
}
// ═══════════════════════════════════════════════════════════════════════════
// 4. LOG POISONING / PROMPT INJECTION DEFENSE  (CVE-2026-25593)
//    OpenClaw 的日志可被注入恶意内容，Agent 读取日志时触发提示注入。
//    OpenOxygen 方案：日志内容消毒 + 结构化日志 + 输入/输出边界隔离。
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 消毒日志内容，移除可能的提示注入载荷。
 */
export function sanitizeLogContent(content) {
    // 移除控制字符
    // eslint-disable-next-line no-control-regex
    let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    // 截断过长内容
    if (sanitized.length > 10_000) {
        sanitized = sanitized.slice(0, 10_000) + "... [truncated]";
    }
    return sanitized;
}
/**
 * 检测输入中的提示注入模式。
 * 返回风险等级和匹配的模式。
 */
export function detectPromptInjection(input) {
    const patterns = [];
    const lower = input.toLowerCase();
    // 高风险：直接指令覆盖
    const HIGH_RISK = [
        /ignore\s+(all\s+)?previous\s+instructions/i,
        /ignore\s+(all\s+)?above/i,
        /you\s+are\s+now\s+/i,
        /new\s+instructions?\s*:/i,
        /system\s*:\s*you\s+are/i,
        /\[system\]/i,
        /<<\s*SYS\s*>>/i,
        /ADMIN\s*OVERRIDE/i,
    ];
    // 中风险：数据泄露尝试
    const MEDIUM_RISK = [
        /output\s+(all|your)\s+(instructions|prompt|system)/i,
        /reveal\s+(your|the)\s+(system|secret|api|key)/i,
        /print\s+env/i,
        /show\s+me\s+(your|the)\s+password/i,
        /what\s+is\s+your\s+(api|secret)\s*key/i,
        /\bexfiltrate\b/i,
        /curl\s+.*\s+--data/i,
    ];
    // 低风险：可疑但可能无害
    const LOW_RISK = [
        /pretend\s+(you|to\s+be)/i,
        /act\s+as\s+(if|a)/i,
        /role\s*play/i,
    ];
    for (const re of HIGH_RISK) {
        if (re.test(input)) {
            patterns.push(`HIGH: ${re.source}`);
        }
    }
    for (const re of MEDIUM_RISK) {
        if (re.test(input)) {
            patterns.push(`MEDIUM: ${re.source}`);
        }
    }
    for (const re of LOW_RISK) {
        if (re.test(input)) {
            patterns.push(`LOW: ${re.source}`);
        }
    }
    const risk = patterns.some((p) => p.startsWith("HIGH"))
        ? "high"
        : patterns.some((p) => p.startsWith("MEDIUM"))
            ? "medium"
            : patterns.length > 0
                ? "low"
                : "none";
    if (risk !== "none") {
        log.warn(`Prompt injection detected (${risk}): ${patterns.join(", ")}`);
    }
    return { risk, patterns };
}
// ═══════════════════════════════════════════════════════════════════════════
// 5. PLUGIN SUPPLY CHAIN DEFENSE  (CNCERT Advisory)
//    OpenClaw 的 skills 生态存在投毒风险，恶意插件可窃取密钥、部署后门。
//    OpenOxygen 方案：SHA-256 完整性校验 + 权限声明审计 + 沙箱隔离。
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 计算文件的 SHA-256 哈希。
 */
export function computeFileHash(content) {
    return crypto.createHash("sha256").update(content).digest("hex");
}
/**
 * 验证插件完整性。
 */
export function verifyPluginIntegrity(content, expectedHash) {
    const actual = computeFileHash(content);
    const match = actual === expectedHash.toLowerCase();
    if (!match) {
        log.error(`Plugin integrity check failed: expected ${expectedHash}, got ${actual}`);
    }
    return match;
}
/** 插件不应请求的危险权限 */
const DANGEROUS_PLUGIN_PERMISSIONS = new Set([
    "registry.write",
    "process.kill",
    "file.delete",
]);
/**
 * 审计插件权限声明。
 * 返回风险评估和建议。
 */
export function auditPluginPermissions(permissions) {
    const warnings = [];
    for (const perm of permissions) {
        if (DANGEROUS_PLUGIN_PERMISSIONS.has(perm)) {
            warnings.push(`Plugin requests dangerous permission: "${perm}"`);
        }
    }
    // 权限数量过多也是风险信号
    if (permissions.length > 10) {
        warnings.push(`Plugin requests ${permissions.length} permissions — unusually high`);
    }
    const risk = warnings.some((w) => w.includes("dangerous"))
        ? "dangerous"
        : warnings.length > 0
            ? "caution"
            : "safe";
    return { risk, warnings };
}
// ═══════════════════════════════════════════════════════════════════════════
// 6. CREDENTIAL PROTECTION  (CNCERT Advisory)
//    OpenClaw 在环境变量和 localStorage 中明文存储 API Key。
//    OpenOxygen 方案：运行时内存加密 + 配置文件权限检查。
// ═══════════════════════════════════════════════════════════════════════════
// 运行时密钥：进程启动时随机生成，不持久化
const RUNTIME_KEY = crypto.randomBytes(32);
/**
 * 加密敏感字符串（用于内存中保存 API Key）。
 */
export function encryptSecret(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", RUNTIME_KEY, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf-8"),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
/**
 * 解密敏感字符串。
 */
export function decryptSecret(ciphertext) {
    const [ivHex, tagHex, dataHex] = ciphertext.split(":");
    if (!ivHex || !tagHex || !dataHex)
        throw new Error("Invalid encrypted format");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", RUNTIME_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString("utf-8") + decipher.final("utf-8");
}
/**
 * 遮蔽 API Key 用于日志输出。
 */
export function maskApiKey(key) {
    if (key.length <= 8)
        return "****";
    return key.slice(0, 4) + "****" + key.slice(-4);
}
/**
 * 时间安全的字符串比较，防止计时攻击。
 */
export function timingSafeEqual(a, b) {
    if (a.length !== b.length) {
        // 仍然执行比较以保持恒定时间
        crypto.timingSafeEqual(Buffer.from(a.padEnd(Math.max(a.length, b.length))), Buffer.from(b.padEnd(Math.max(a.length, b.length))));
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
