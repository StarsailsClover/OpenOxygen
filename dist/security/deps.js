/**
 * OpenOxygen �� Dependency Security Manager (26w11aE)
 *
 * ��� risks.md ��Ӧ�����յļӹ�ʵ�֣�
 * - �����汾���������
 * - �������������У��
 * - �����Թ�ϣ��֤
 */
import { createSubsystemLogger } from "../logging/index.js";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
<<<<<<< HEAD
// @ts-ignore �� semver has no types
=======
// @ts-ignore — semver has no types
>>>>>>> dev
import semver from "semver";
const log = createSubsystemLogger("security/deps");
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
// ������ȫ��������
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
export const DEPENDENCY_POLICY = {
<<<<<<< HEAD
    // �߷��������������������Ͱ汾
=======
    // 高风险依赖：必须满足的最低版本
>>>>>>> dev
    requiredVersions: {
        requests: ">=2.32.3", // CVE-2024-35195
        pyyaml: ">=6.0.1", // CVE-2024-27198
        urllib3: ">=2.2.2", // CVE-2024-3787
<<<<<<< HEAD
        certifi: ">=2024.07.04", // ֤������б�����
        openssl: ">=3.0.14", // ��CVE�޸�
    },
    // ��ֹʹ�õ���������֪��������Ȩ�ޣ�
=======
        certifi: ">=2024.07.04", // 证书吊销列表更新
        openssl: ">=3.0.14", // 多CVE修复
    },
    // 禁止使用的依赖（已知恶意或过度权限）
>>>>>>> dev
    blockedPackages: [
        "claw-utils-malicious", // ʾ�������
        "eval-hook", // ��̬����ִ�з���
        "requests-extended", // �ǹٷ�fork
        "pyyaml-full", // ����ȫ����ģʽ
    ],
<<<<<<< HEAD
    // �������������������
=======
    // 插件允许的依赖白名单
>>>>>>> dev
    allowedPluginDeps: new Set([
        "requests",
        "pyyaml",
        "numpy",
        "pillow",
        "chardet",
        "idna",
        "certifi",
        "urllib3",
        "charset-normalizer",
    ]),
<<<<<<< HEAD
    // �߷��հ汾ģʽ���Զ���⣩
=======
    // 高风险版本模式（自动检测）
>>>>>>> dev
    vulnerablePatterns: [
        { pkg: "requests", max: "2.32.0", cve: "CVE-2024-35195", severity: "high" },
        {
            pkg: "pyyaml",
            max: "6.0.0",
            cve: "CVE-2024-27198",
            severity: "critical",
        },
    ],
};
<<<<<<< HEAD
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
// ���İ�ȫ��麯��
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
=======
// ═══════════════════════════════════════════════════════════════════════════
// 核心安全检查函数
// ═══════════════════════════════════════════════════════════════════════════
/**
 * 扫描并验证所有依赖的安全性
 */
export async function auditDependencies(projectPath) {
    const violations = [];
    const warnings = [];
    // 1. 读取当前安装的依赖
    const installed = await getInstalledDependencies(projectPath);
    // 2. 检查必须版本
    for (const [pkg, required] of Object.entries(DEPENDENCY_POLICY.requiredVersions)) {
        const installedVersion = installed[pkg];
        if (installedVersion && !semver.satisfies(installedVersion, required)) {
            violations.push({
                type: "version",
                package: pkg,
                installed: installedVersion,
                required,
                severity: "high",
                message: `${pkg}@${installedVersion} 不满足安全版本要求 ${required}`,
            });
        }
    }
    // 3. 检查禁止包
    for (const blocked of DEPENDENCY_POLICY.blockedPackages) {
        if (installed[blocked]) {
            violations.push({
                type: "blocked",
                package: blocked,
                installed: installed[blocked],
                severity: "critical",
                message: `检测到禁止使用的依赖: ${blocked}`,
            });
        }
    }
    // 4. CVE 模式匹配
    for (const { pkg, max, cve, severity, } of DEPENDENCY_POLICY.vulnerablePatterns) {
        const ver = installed[pkg];
        if (ver && semver.lte(ver, max)) {
            violations.push({
                type: "cve",
                package: pkg,
                installed: ver,
                cve,
                severity: severity,
                message: `${pkg}@${ver} 受 ${cve} 影响`,
            });
        }
    }
    // 5. 未锁定依赖警告
    const unpinned = Object.entries(installed).filter(([, ver]) => ver && !/^\d+\.\d+\.\d+$/.test(ver));
    for (const [pkg] of unpinned) {
        warnings.push(`${pkg} 未使用精确版本锁定，建议添加 == 版本约束`);
    }
    log.info(`Dependency audit: ${violations.length} violations, ${warnings.length} warnings`);
    return {
        passed: violations.length === 0,
        violations,
        warnings,
    };
}
>>>>>>> dev
/**
 * ɨ�貢��֤���������İ�ȫ��
 */
export async function auditDependencies(projectPath) {
    const violations = [];
    const warnings = [];
    // 1. ��ȡ��ǰ��װ������
    const installed = await getInstalledDependencies(projectPath);
    // 2. ������汾
    for (const [pkg, required] of Object.entries(DEPENDENCY_POLICY.requiredVersions)) {
        const installedVersion = installed[pkg];
        if (installedVersion && !semver.satisfies(installedVersion, required)) {
            violations.push({
                type: "version",
                package: pkg,
                installed: installedVersion,
                required,
                severity: "high",
                message: `${pkg}@${installedVersion} �����㰲ȫ�汾Ҫ�� ${required}`,
            });
        }
    }
    // 3. ����ֹ��
    for (const blocked of DEPENDENCY_POLICY.blockedPackages) {
        if (installed[blocked]) {
            violations.push({
                type: "blocked",
                package: blocked,
                installed: installed[blocked],
                severity: "critical",
                message: `��⵽��ֹʹ�õ�����: ${blocked}`,
            });
        }
    }
    // 4. CVE ģʽƥ��
    for (const { pkg, max, cve, severity, } of DEPENDENCY_POLICY.vulnerablePatterns) {
        const ver = installed[pkg];
        if (ver && semver.lte(ver, max)) {
            violations.push({
                type: "cve",
                package: pkg,
                installed: ver,
                cve,
                severity: severity,
                message: `${pkg}@${ver} �� ${cve} Ӱ��`,
            });
        }
    }
    // 5. δ������������
    const unpinned = Object.entries(installed).filter(([, ver]) => ver && !/^\d+\.\d+\.\d+$/.test(ver));
    for (const [pkg] of unpinned) {
        warnings.push(`${pkg} δʹ�þ�ȷ�汾�������������� == �汾Լ��`);
    }
    log.info(`Dependency audit: ${violations.length} violations, ${warnings.length} warnings`);
    return {
        passed: violations.length === 0,
        violations,
        warnings,
    };
}
/**
 * У���������Ƿ��ڰ�������
 */
export function validatePluginDependencies(skillPath) {
    const requirementsPath = `${skillPath}/requirements.txt`;
    if (!existsSync(requirementsPath)) {
        return { valid: true, violations: [] };
    }
    const content = readFileSync(requirementsPath, "utf-8");
    const deps = content
        .split("\n")
        .map((l) => (l.split("==")[0] ?? "").split(">=")[0]?.split("<=")[0]?.trim() ?? "")
        .filter((l) => l && !l.startsWith("#"));
    const violations = [];
    for (const dep of deps) {
        if (!DEPENDENCY_POLICY.allowedPluginDeps.has(dep)) {
            violations.push(dep);
        }
    }
    return {
        valid: violations.length === 0,
        violations,
    };
}
/**
 * ���������ļ������� poetry/npm/pip��
 */
export async function generateLockfile(type, outputPath) {
    switch (type) {
        case "pip": {
            const output = execSync("pip freeze --all", { encoding: "utf-8" });
<<<<<<< HEAD
            // ���˵���ȫ�汾
=======
            // 过滤到安全版本
>>>>>>> dev
            const safeDeps = output
                .split("\n")
                .filter((line) => {
                const [pkg] = line.split("==");
                return pkg && !DEPENDENCY_POLICY.blockedPackages.includes(pkg.trim());
            })
                .join("\n");
            // ���Ӱ�ȫע��
            const header = `# OpenOxygen Locked Dependencies
# Generated: ${new Date().toISOString()}
# Security Policy: ${DEPENDENCY_POLICY.requiredVersions["requests"]} enforced\n\n`;
            const fs = await import("node:fs");
            fs.writeFileSync(outputPath, header + safeDeps, "utf-8");
            break;
        }
        case "npm": {
<<<<<<< HEAD
            // ʹ�� npm-shrinkwrap.json �� package-lock.json
=======
            // 使用 npm-shrinkwrap.json 或 package-lock.json
>>>>>>> dev
            const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
            const locked = {
                name: pkg.name,
                version: pkg.version,
                lockfileVersion: 3,
                packages: {},
                dependencies: {},
            };
            const fs = await import("node:fs");
            fs.writeFileSync(outputPath, JSON.stringify(locked, null, 2), "utf-8");
            break;
        }
    }
    log.info(`Generated ${type} lockfile: ${outputPath}`);
}
/**
 * ��֤�������������ԣ�SHA-256��
 */
export function verifyPackageIntegrity(packagePath, expectedHash) {
    if (!existsSync(packagePath))
        return false;
    const content = readFileSync(packagePath);
    const actualHash = createHash("sha256").update(content).digest("hex");
    return actualHash === expectedHash;
}
<<<<<<< HEAD
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
// ��������
// �T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T�T
=======
// ═══════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════
>>>>>>> dev
async function getInstalledDependencies(projectPath) {
    try {
        const output = execSync(projectPath ? `cd ${projectPath} && pip freeze` : "pip freeze", {
            encoding: "utf-8",
        });
        const deps = {};
        for (const line of output.split("\n")) {
            const [pkg, ver] = line.split("==");
            if (pkg && ver) {
                deps[pkg.trim().toLowerCase()] = ver.trim();
            }
        }
        return deps;
    }
    catch {
        return {};
    }
}
