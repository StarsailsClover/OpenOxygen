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
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { createHash, sign, verify, generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveStateDir } from "../../core/config/index.js";
const log = createSubsystemLogger("marketplace");
// ═══════════════════════════════════════════════════════════════════════════
// Plugin Integrity & Signing
// ═══════════════════════════════════════════════════════════════════════════
export function computePluginHash(pluginDir) {
    const hash = createHash("sha256");
    const files = walkFiles(pluginDir).sort();
    for (const file of files) {
        const relPath = path.relative(pluginDir, file);
        const content = fs.readFileSync(file);
        hash.update(relPath);
        hash.update(content);
    }
    return hash.digest("hex");
}
export function generateSigningKeys() {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    return {
        publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
        privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    };
}
export function signPlugin(hash, privateKeyPem) {
    const privateKey = { key: privateKeyPem, format: "pem", type: "pkcs8" };
    return sign(null, Buffer.from(hash), privateKey).toString("base64");
}
export function verifyPluginSignature(hash, signature, publicKeyPem) {
    try {
        const publicKey = { key: publicKeyPem, format: "pem", type: "spki" };
        return verify(null, Buffer.from(hash), publicKey, Buffer.from(signature, "base64"));
    }
    catch {
        return false;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// Plugin Repository
// ═══════════════════════════════════════════════════════════════════════════
export class PluginRepository {
    pluginsDir;
    installed = new Map();
    constructor(pluginsDir) {
        this.pluginsDir = pluginsDir || path.join(resolveStateDir(), "plugins");
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }
        this.loadInstalled();
    }
    /**
     * 从 OpenClaw skills 目录导入
     */
    importFromOpenClaw(skillDir) {
        try {
            // 查找 claw.json
            const clawJsonPath = findFile(skillDir, "claw.json");
            if (!clawJsonPath) {
                log.warn(`No claw.json found in ${skillDir}`);
                return null;
            }
            const manifest = JSON.parse(fs.readFileSync(clawJsonPath, "utf-8"));
            // 可选：clawhub.json
            let marketplace;
            const clawHubPath = findFile(skillDir, "clawhub.json");
            if (clawHubPath) {
                marketplace = JSON.parse(fs.readFileSync(clawHubPath, "utf-8"));
            }
            // 可选：_meta.json
            let meta;
            const metaPath = findFile(skillDir, "_meta.json");
            if (metaPath) {
                meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
            }
            // 计算完整性哈希
            const hash = computePluginHash(path.dirname(clawJsonPath));
            // 安全审计
            const audit = this.auditPermissions(manifest.permissions);
            if (audit.blocked.length > 0) {
                log.error(`Plugin ${manifest.name} blocked: dangerous permissions [${audit.blocked.join(", ")}]`);
                return null;
            }
            // 复制到本地仓库
            const destDir = path.join(this.pluginsDir, manifest.name);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            copyDir(path.dirname(clawJsonPath), destDir);
            const installed = {
                manifest,
                marketplace,
                meta,
                installPath: destDir,
                installedAt: nowMs(),
                verified: false,
                integrityHash: hash,
                source: "openclaw",
            };
            this.installed.set(manifest.name, installed);
            this.saveRegistry();
            log.info(`Imported OpenClaw skill: ${manifest.name} v${manifest.version}`);
            return installed;
        }
        catch (err) {
            log.error(`Failed to import from ${skillDir}:`, err);
            return null;
        }
    }
    /**
     * 安装本地插件
     */
    installLocal(pluginDir) {
        // 查找 manifest（支持 claw.json 或 manifest.json）
        const manifestPath = findFile(pluginDir, "claw.json") || findFile(pluginDir, "manifest.json");
        if (!manifestPath) {
            log.error(`No manifest found in ${pluginDir}`);
            return null;
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        const hash = computePluginHash(path.dirname(manifestPath));
        const destDir = path.join(this.pluginsDir, manifest.name);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        copyDir(path.dirname(manifestPath), destDir);
        const installed = {
            manifest,
            installPath: destDir,
            installedAt: nowMs(),
            verified: false,
            integrityHash: hash,
            source: "local",
        };
        this.installed.set(manifest.name, installed);
        this.saveRegistry();
        log.info(`Installed local plugin: ${manifest.name} v${manifest.version}`);
        return installed;
    }
    /**
     * 卸载插件
     */
    uninstall(name) {
        const plugin = this.installed.get(name);
        if (!plugin)
            return false;
        // 删除文件
        if (fs.existsSync(plugin.installPath)) {
            fs.rmSync(plugin.installPath, { recursive: true, force: true });
        }
        this.installed.delete(name);
        this.saveRegistry();
        log.info(`Uninstalled plugin: ${name}`);
        return true;
    }
    /**
     * 列出已安装插件
     */
    list() {
        return [...this.installed.values()];
    }
    /**
     * 获取插件信息
     */
    get(name) {
        return this.installed.get(name);
    }
    /**
     * 搜索插件（本地已安装）
     */
    search(query) {
        const lower = query.toLowerCase();
        return this.list().filter(p => p.manifest.name.toLowerCase().includes(lower) ||
            p.manifest.description.toLowerCase().includes(lower) ||
            p.manifest.tags.some(t => t.toLowerCase().includes(lower)));
    }
    /**
     * 验证插件完整性
     */
    verifyIntegrity(name) {
        const plugin = this.installed.get(name);
        if (!plugin)
            return { valid: false, reason: "Plugin not found" };
        const currentHash = computePluginHash(plugin.installPath);
        if (currentHash !== plugin.integrityHash) {
            return { valid: false, reason: "Integrity hash mismatch (files modified)" };
        }
        return { valid: true };
    }
    /**
     * 批量导入 OpenClaw skills 目录
     */
    batchImportOpenClaw(skillsRootDir, limit) {
        let imported = 0;
        let failed = 0;
        let skipped = 0;
        const entries = fs.readdirSync(skillsRootDir, { withFileTypes: true });
        for (const entry of entries) {
            if (limit && imported >= limit)
                break;
            if (!entry.isDirectory())
                continue;
            const skillDir = path.join(skillsRootDir, entry.name);
            // 递归查找包含 claw.json 的子目录
            const clawJson = findFile(skillDir, "claw.json");
            if (!clawJson) {
                skipped++;
                continue;
            }
            const result = this.importFromOpenClaw(path.dirname(clawJson));
            if (result) {
                imported++;
            }
            else {
                failed++;
            }
        }
        log.info(`Batch import: ${imported} imported, ${failed} failed, ${skipped} skipped`);
        return { imported, failed, skipped };
    }
    /**
     * 权限审计
     */
    auditPermissions(permissions) {
        const SAFE = new Set(["network", "filesystem.read", "clipboard.read"]);
        const WARNING = new Set(["filesystem.write", "clipboard.write", "process.read"]);
        const BLOCKED = new Set(["process.kill", "registry.write", "system.admin", "kernel"]);
        const safe = [];
        const warning = [];
        const blocked = [];
        for (const perm of permissions) {
            if (BLOCKED.has(perm))
                blocked.push(perm);
            else if (WARNING.has(perm))
                warning.push(perm);
            else
                safe.push(perm);
        }
        return { safe, warning, blocked };
    }
    // ─── Internal ─────────────────────────────────────────────────────────
    loadInstalled() {
        const registryPath = path.join(this.pluginsDir, "registry.json");
        if (fs.existsSync(registryPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
                for (const [name, plugin] of Object.entries(data)) {
                    this.installed.set(name, plugin);
                }
                log.info(`Loaded ${this.installed.size} installed plugins`);
            }
            catch {
                log.warn("Failed to load plugin registry");
            }
        }
    }
    saveRegistry() {
        const registryPath = path.join(this.pluginsDir, "registry.json");
        const data = {};
        for (const [name, plugin] of this.installed) {
            data[name] = plugin;
        }
        fs.writeFileSync(registryPath, JSON.stringify(data, null, 2), "utf-8");
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════
function walkFiles(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkFiles(full));
        }
        else {
            results.push(full);
        }
    }
    return results;
}
function findFile(dir, filename) {
    // 当前目录
    const direct = path.join(dir, filename);
    if (fs.existsSync(direct))
        return direct;
    // 一级子目录
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const sub = path.join(dir, entry.name, filename);
                if (fs.existsSync(sub))
                    return sub;
            }
        }
    }
    catch { }
    return null;
}
function copyDir(src, dest) {
    if (!fs.existsSync(dest))
        fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
//# sourceMappingURL=index.js.map