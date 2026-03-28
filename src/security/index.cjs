/**
 * OpenOxygen Security Module
 * 
 * 全链路数据加密与对抗攻击防护
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const log = {
    info: (...args) => console.log("[Security]", ...args),
    warn: (...args) => console.warn("[Security]", ...args),
    error: (...args) => console.error("[Security]", ...args)
};

/**
 * 加密配置
 */
const SecurityConfig = {
    algorithm: "aes-256-gcm",
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    iterations: 100000,
    digest: "sha256"
};

/**
 * 安全模块
 */
class OpenOxygenSecurity {
    constructor(masterKey) {
        this.masterKey = masterKey;
        this.encryptionKey = null;
        this.initialized = false;
    }
    
    /**
     * 初始化
     */
    initialize() {
        log.info("Initializing security module");
        
        if (!this.masterKey) {
            // 生成新的主密钥
            this.masterKey = this.generateSecureKey();
            log.info("Generated new master key");
        }
        
        // 派生加密密钥
        this.encryptionKey = this.deriveKey(this.masterKey);
        this.initialized = true;
        
        log.info("Security module initialized");
    }
    
    /**
     * 生成安全密钥
     */
    generateSecureKey(length = 32) {
        return crypto.randomBytes(length).toString("hex");
    }
    
    /**
     * 派生密钥
     */
    deriveKey(password, salt = null) {
        if (!salt) {
            salt = crypto.randomBytes(SecurityConfig.saltLength);
        }
        
        const key = crypto.pbkdf2Sync(
            password,
            salt,
            SecurityConfig.iterations,
            SecurityConfig.keyLength,
            SecurityConfig.digest
        );
        
        return { key, salt };
    }
    
    /**
     * 加密数据
     */
    encrypt(data) {
        if (!this.initialized) {
            throw new Error("Security module not initialized");
        }
        
        const iv = crypto.randomBytes(SecurityConfig.ivLength);
        const cipher = crypto.createCipheriv(
            SecurityConfig.algorithm,
            this.encryptionKey.key,
            iv
        );
        
        let encrypted = cipher.update(data, "utf8", "hex");
        encrypted += cipher.final("hex");
        
        const authTag = cipher.getAuthTag();
        
        // 组合: salt + iv + authTag + encrypted
        const result = Buffer.concat([
            this.encryptionKey.salt,
            iv,
            authTag,
            Buffer.from(encrypted, "hex")
        ]).toString("base64");
        
        return result;
    }
    
    /**
     * 解密数据
     */
    decrypt(encryptedData) {
        if (!this.initialized) {
            throw new Error("Security module not initialized");
        }
        
        const data = Buffer.from(encryptedData, "base64");
        
        // 分离组件
        const salt = data.slice(0, SecurityConfig.saltLength);
        const iv = data.slice(SecurityConfig.saltLength, SecurityConfig.saltLength + SecurityConfig.ivLength);
        const authTag = data.slice(SecurityConfig.saltLength + SecurityConfig.ivLength, SecurityConfig.saltLength + SecurityConfig.ivLength + 16);
        const encrypted = data.slice(SecurityConfig.saltLength + SecurityConfig.ivLength + 16);
        
        // 重新派生密钥
        const { key } = this.deriveKey(this.masterKey, salt);
        
        const decipher = crypto.createDecipheriv(
            SecurityConfig.algorithm,
            key,
            iv
        );
        
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString("utf8");
    }
    
    /**
     * 加密对象
     */
    encryptObject(obj) {
        const json = JSON.stringify(obj);
        return this.encrypt(json);
    }
    
    /**
     * 解密对象
     */
    decryptObject(encryptedData) {
        const json = this.decrypt(encryptedData);
        return JSON.parse(json);
    }
    
    /**
     * 加密文件
     */
    encryptFile(inputPath, outputPath) {
        log.info(`Encrypting file: ${inputPath}`);
        
        const data = fs.readFileSync(inputPath, "utf8");
        const encrypted = this.encrypt(data);
        
        fs.writeFileSync(outputPath, encrypted);
        
        log.info(`File encrypted: ${outputPath}`);
    }
    
    /**
     * 解密文件
     */
    decryptFile(inputPath, outputPath) {
        log.info(`Decrypting file: ${inputPath}`);
        
        const encrypted = fs.readFileSync(inputPath, "utf8");
        const decrypted = this.decrypt(encrypted);
        
        fs.writeFileSync(outputPath, decrypted);
        
        log.info(`File decrypted: ${outputPath}`);
    }
    
    /**
     * 哈希计算
     */
    hash(data, algorithm = "sha256") {
        return crypto.createHash(algorithm).update(data).digest("hex");
    }
    
    /**
     * HMAC 签名
     */
    sign(data, key) {
        return crypto.createHmac("sha256", key).update(data).digest("hex");
    }
    
    /**
     * 验证签名
     */
    verify(data, signature, key) {
        const computed = this.sign(data, key);
        return crypto.timingSafeEqual(
            Buffer.from(computed),
            Buffer.from(signature)
        );
    }
}

/**
 * 对抗攻击防护
 */
class AttackProtection {
    constructor() {
        this.rateLimiter = new Map();
        this.suspiciousPatterns = [
            /script\s*>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /eval\s*\(/i
        ];
    }
    
    /**
     * 检查输入安全
     */
    sanitizeInput(input) {
        if (typeof input !== "string") {
            return input;
        }
        
        // 检查可疑模式
        for (const pattern of this.suspiciousPatterns) {
            if (pattern.test(input)) {
                log.warn("Suspicious input detected:", input.substring(0, 50));
                throw new Error("Potentially malicious input detected");
            }
        }
        
        // 基本转义
        return input
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;");
    }
    
    /**
     * 速率限制检查
     */
    checkRateLimit(key, maxRequests = 100, windowMs = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!this.rateLimiter.has(key)) {
            this.rateLimiter.set(key, []);
        }
        
        const requests = this.rateLimiter.get(key);
        
        // 清理旧请求
        const validRequests = requests.filter(time => time > windowStart);
        
        if (validRequests.length >= maxRequests) {
            log.warn(`Rate limit exceeded for: ${key}`);
            return false;
        }
        
        validRequests.push(now);
        this.rateLimiter.set(key, validRequests);
        
        return true;
    }
    
    /**
     * 验证 LLM 输出
     */
    validateLLMOutput(output) {
        // 检查是否包含恶意代码
        const dangerousPatterns = [
            /rm\s+-rf/i,
            /del\s+\/f/i,
            /format\s+/i,
            /dd\s+if=/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(output)) {
                log.error("Dangerous command detected in LLM output");
                return false;
            }
        }
        
        return true;
    }
}

/**
 * 安全存储
 */
class SecureStorage {
    constructor(security) {
        this.security = security;
        this.storagePath = "./data/secure";
    }
    
    /**
     * 存储敏感数据
     */
    set(key, value) {
        const encrypted = this.security.encryptObject({
            value,
            timestamp: Date.now()
        });
        
        const filePath = path.join(this.storagePath, `${key}.enc`);
        fs.writeFileSync(filePath, encrypted);
    }
    
    /**
     * 读取敏感数据
     */
    get(key) {
        const filePath = path.join(this.storagePath, `${key}.enc`);
        
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        const encrypted = fs.readFileSync(filePath, "utf8");
        const data = this.security.decryptObject(encrypted);
        
        return data.value;
    }
}

module.exports = {
    OpenOxygenSecurity,
    AttackProtection,
    SecureStorage,
    SecurityConfig
};
