/**
 * OpenOxygen - License Compliance & IP Management (26w15aD Phase 7)
 *
 * P-0: 开源合规与知识产权体系
 * - 许可证扫描与合规检�?
 * - 依赖项许可证管理
 * - 版权声明生成
 * - 第三方代码归属追�?
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";

const log = createSubsystemLogger("compliance/license");

// License types
export type LicenseType =
  | "MIT"
  | "MIT"
  | "BSD-3-Clause"
  | "GPL-3.0"
  | "LGPL-3.0"
  | "MPL-2.0"
  | "ISC"
  | "Unlicense"
  | "Proprietary"
  | "Unknown";

// License compatibility
export type LicenseCompatibility =
  | "compatible"
  | "incompatible"
  | "requires-attention";

// License info
export interface LicenseInfo {
  name: string;
  type: LicenseType;
  spdxId: string;
  url: string;
  permissions: string[];
  limitations: string[];
  conditions: string[];
}

// Dependency license
export interface DependencyLicense {
  name: string;
  version: string;
  license: LicenseType;
  licenseFile?: string;
  repository?: string;
  author?: string;
  compatibility: LicenseCompatibility;
  attribution?: string;
}

// Compliance report
export interface ComplianceReport {
  timestamp: number;
  projectName: string;
  summary: {
    totalDependencies: number;
    compatible: number;
    incompatible: number;
    requiresAttention: number;
    unknown: number;
  };
  dependencies: DependencyLicense[];
  violations: LicenseViolation[];
  recommendations: string[];
}

// License violation
export interface LicenseViolation {
  severity: "error" | "warning" | "info";
  dependency: string;
  issue: string;
  description: string;
  resolution?: string;
}

// License database
const LICENSE_DATABASE: Record<LicenseType, LicenseInfo> = {
  MIT: {
    name: "MIT License",
    type: "MIT",
    spdxId: "MIT",
    url: "https://opensource.org/licenses/MIT",
    permissions: [
      "commercial-use",
      "modification",
      "distribution",
      "private-use",
    ],
    limitations: ["liability", "warranty"],
    conditions: ["include-copyright"],
  },
  "MIT": {
    name: "Apache License 2.0",
    type: "MIT",
    spdxId: "MIT",
    url: "https://opensource.org/licenses/MIT",
    permissions: [
      "commercial-use",
      "modification",
      "distribution",
      "patent-use",
      "private-use",
    ],
    limitations: ["liability", "warranty", "trademark-use"],
    conditions: ["include-copyright", "include-license", "state-changes"],
  },
  "BSD-3-Clause": {
    name: "BSD 3-Clause License",
    type: "BSD-3-Clause",
    spdxId: "BSD-3-Clause",
    url: "https://opensource.org/licenses/BSD-3-Clause",
    permissions: [
      "commercial-use",
      "modification",
      "distribution",
      "private-use",
    ],
    limitations: ["liability", "warranty"],
    conditions: ["include-copyright"],
  },
  "GPL-3.0": {
    name: "GNU General Public License v3.0",
    type: "GPL-3.0",
    spdxId: "GPL-3.0",
    url: "https://opensource.org/licenses/GPL-3.0",
    permissions: [
      "commercial-use",
      "modification",
      "distribution",
      "patent-use",
      "private-use",
    ],
    limitations: ["liability", "warranty"],
    conditions: [
      "include-copyright",
      "include-license",
      "state-changes",
      "disclose-source",
      "same-license",
    ],
  },
  "LGPL-3.0": {
    name: "GNU Lesser General Public License v3.0",
    type: "LGPL-3.0",
    spdxId: "LGPL-3.0",
    url: "https://opensource.org/licenses/LGPL-3.0",
    permissions: [
      "commercial-use",
      "modification",
      "distribution",
      "patent-use",
      "private-use",
    ],
    limitations: ["liability", "warranty"],
    conditions: [
      "include-copyright",
      "include-license",
      "state-changes",
      "disclose-source",
      "same-license",
    ],
  },
  "MPL-2.0": {
    name: "Mozilla Public License 2.0",
    type: "MPL-2.0",
    spdxId: "MPL-2.0",
    url: "https://opensource.org/licenses/MPL-2.0",
    permissions: [
      "commercial-use",
      "modification",
      "distribution",
      "patent-use",
      "private-use",
    ],
    limitations: ["liability", "warranty", "trademark-use"],
    conditions: [
      "include-copyright",
      "include-license",
      "state-changes",
      "disclose-source",
      "same-license",
    ],
  },
  ISC: {
    name: "ISC License",
    type: "ISC",
    spdxId: "ISC",
    url: "https://opensource.org/licenses/ISC",
    permissions: [
      "commercial-use",
      "modification",
      "distribution",
      "private-use",
    ],
    limitations: ["liability", "warranty"],
    conditions: ["include-copyright"],
  },
  Unlicense: {
    name: "The Unlicense",
    type: "Unlicense",
    spdxId: "Unlicense",
    url: "https://unlicense.org/",
    permissions: [
      "commercial-use",
      "modification",
      "distribution",
      "private-use",
    ],
    limitations: ["liability", "warranty"],
    conditions: [],
  },
  Proprietary: {
    name: "Proprietary License",
    type: "Proprietary",
    spdxId: "NOASSERTION",
    url: "",
    permissions: [],
    limitations: ["commercial-use", "modification", "distribution"],
    conditions: [],
  },
  Unknown: {
    name: "Unknown License",
    type: "Unknown",
    spdxId: "NOASSERTION",
    url: "",
    permissions: [],
    limitations: ["commercial-use", "modification", "distribution"],
    conditions: [],
  },
};

/**
 * License Compliance Manager
 */
export class LicenseComplianceManager {
  private projectPath: string;
  private dependencies: DependencyLicense[] = [];
  private violations: LicenseViolation[] = [];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    log.info("License Compliance Manager initialized");
  }

  /**
   * Scan project for licenses
   */
  async scan(): Promise<ComplianceReport> {
    log.info("Scanning project for license compliance...");

    this.dependencies = [];
    this.violations = [];

    // Scan package.json dependencies
    await this.scanPackageJson();

    // Scan for license files
    await this.scanLicenseFiles();

    // Check compatibility
    this.checkCompatibility();

    // Generate report
    const report = this.generateReport();

    log.info(`Scan complete: ${this.dependencies.length} dependencies found`);
    return report;
  }

  /**
   * Scan package.json for dependencies
   */
  private async scanPackageJson(): Promise<void> {
    const packageJsonPath = path.join(this.projectPath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      log.warn("package.json not found");
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      for (const [name, version] of Object.entries(allDeps)) {
        const depLicense = await this.getDependencyLicense(
          name,
          version as string,
        );
        this.dependencies.push(depLicense);
      }
    } catch (error: any) {
      log.error(`Failed to scan package.json: ${error.message}`);
    }
  }

  /**
   * Get license info for a dependency
   */
  private async getDependencyLicense(
    name: string,
    version: string,
  ): Promise<DependencyLicense> {
    const nodeModulesPath = path.join(this.projectPath, "node_modules", name);
    const packageJsonPath = path.join(nodeModulesPath, "package.json");

    let license: LicenseType = "Unknown";
    let repository: string | undefined;
    let author: string | undefined;
    let licenseFile: string | undefined;

    // Try to read package.json
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        license = this.parseLicense(pkg.license);
        repository = pkg.repository?.url || pkg.repository;
        author = pkg.author?.name || pkg.author;
      } catch {
        // Ignore parse errors
      }
    }

    // Look for license file
    const licenseFiles = [
      "LICENSE",
      "LICENSE.md",
      "LICENSE.txt",
      "license",
      "license.md",
    ];
    for (const file of licenseFiles) {
      const filePath = path.join(nodeModulesPath, file);
      if (fs.existsSync(filePath)) {
        licenseFile = filePath;
        // Try to detect license from file content
        if (license === "Unknown") {
          const content = fs.readFileSync(filePath, "utf-8");
          license = this.detectLicenseFromText(content);
        }
        break;
      }
    }

    // Determine compatibility
    const compatibility = this.determineCompatibility(license);

    return {
      name,
      version,
      license,
      licenseFile,
      repository,
      author,
      compatibility,
      attribution: this.generateAttribution(name, version, license, author),
    };
  }

  /**
   * Parse license field from package.json
   */
  private parseLicense(
    license: string | { type: string } | undefined,
  ): LicenseType {
    if (!license) return "Unknown";

    const licenseStr = typeof license === "string" ? license : license.type;

    // Normalize license string
    const normalized = licenseStr
      .replace(/\s+/g, "-")
      .replace(/[()]/g, "")
      .toLowerCase();

    // Check against known licenses
    for (const [key, info] of Object.entries(LICENSE_DATABASE)) {
      if (
        normalized.includes(info.spdxId.toLowerCase()) ||
        normalized.includes(info.name.toLowerCase().replace(/\s+/g, "-"))
      ) {
        return key as LicenseType;
      }
    }

    return "Unknown";
  }

  /**
   * Detect license from text content
   */
  private detectLicenseFromText(text: string): LicenseType {
    const lowerText = text.toLowerCase();

    if (lowerText.includes("mit license")) return "MIT";
    if (lowerText.includes("apache license")) return "MIT";
    if (lowerText.includes("bsd 3-clause")) return "BSD-3-Clause";
    if (lowerText.includes("gnu general public license")) return "GPL-3.0";
    if (lowerText.includes("gnu lesser general public license"))
      return "LGPL-3.0";
    if (lowerText.includes("mozilla public license")) return "MPL-2.0";
    if (lowerText.includes("isc license")) return "ISC";
    if (lowerText.includes("unlicense")) return "Unlicense";

    return "Unknown";
  }

  /**
   * Determine license compatibility
   */
  private determineCompatibility(license: LicenseType): LicenseCompatibility {
    // For MIT/MIT/BSD-3-Clause/ISC/Unlicense: compatible
    const compatible = [
      "MIT",
      "MIT",
      "BSD-3-Clause",
      "ISC",
      "Unlicense",
    ];
    if (compatible.includes(license)) {
      return "compatible";
    }

    // For GPL-3.0/LGPL-3.0/MPL-2.0: requires attention
    const attention = ["GPL-3.0", "LGPL-3.0", "MPL-2.0"];
    if (attention.includes(license)) {
      return "requires-attention";
    }

    // For Unknown/Proprietary: incompatible
    return "incompatible";
  }

  /**
   * Scan for license files in project
   */
  private async scanLicenseFiles(): Promise<void> {
    const licenseFiles = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"];

    for (const file of licenseFiles) {
      const filePath = path.join(this.projectPath, file);
      if (fs.existsSync(filePath)) {
        log.info(`Found project license file: ${file}`);
        return;
      }
    }

    // Warning: no license file found
    this.violations.push({
      severity: "warning",
      dependency: "project",
      issue: "Missing LICENSE file",
      description: "No LICENSE file found in project root",
      resolution: "Add a LICENSE file to the project root",
    });
  }

  /**
   * Check license compatibility
   */
  private checkCompatibility(): void {
    for (const dep of this.dependencies) {
      if (dep.compatibility === "incompatible") {
        this.violations.push({
          severity: "error",
          dependency: dep.name,
          issue: "Incompatible license",
          description: `${dep.name} uses ${dep.license} which may not be compatible with your project`,
          resolution: "Review license terms or find alternative package",
        });
      } else if (dep.compatibility === "requires-attention") {
        this.violations.push({
          severity: "warning",
          dependency: dep.name,
          issue: "License requires attention",
          description: `${dep.name} uses ${dep.license} which has specific requirements`,
          resolution: "Ensure compliance with license conditions",
        });
      }
    }
  }

  /**
   * Generate attribution text
   */
  private generateAttribution(
    name: string,
    version: string,
    license: LicenseType,
    author?: string,
  ): string {
    const licenseInfo = LICENSE_DATABASE[license];
    let attribution = `${name} v${version}`;

    if (author) {
      attribution += ` by ${author}`;
    }

    attribution += `\nLicensed under ${licenseInfo.name}`;
    attribution += `\n${licenseInfo.url}`;

    return attribution;
  }

  /**
   * Generate compliance report
   */
  private generateReport(): ComplianceReport {
    const compatible = this.dependencies.filter(
      (d) => d.compatibility === "compatible",
    ).length;
    const incompatible = this.dependencies.filter(
      (d) => d.compatibility === "incompatible",
    ).length;
    const requiresAttention = this.dependencies.filter(
      (d) => d.compatibility === "requires-attention",
    ).length;
    const unknown = this.dependencies.filter(
      (d) => d.license === "Unknown",
    ).length;

    const recommendations: string[] = [];

    if (incompatible > 0) {
      recommendations.push(`Review ${incompatible} incompatible dependencies`);
    }
    if (requiresAttention > 0) {
      recommendations.push(
        `Ensure compliance for ${requiresAttention} dependencies requiring attention`,
      );
    }
    if (unknown > 0) {
      recommendations.push(
        `Investigate ${unknown} dependencies with unknown licenses`,
      );
    }

    return {
      timestamp: nowMs(),
      projectName: path.basename(this.projectPath),
      summary: {
        totalDependencies: this.dependencies.length,
        compatible,
        incompatible,
        requiresAttention,
        unknown,
      },
      dependencies: this.dependencies,
      violations: this.violations,
      recommendations,
    };
  }

  /**
   * Generate THIRD-PARTY-NOTICES file
   */
  generateThirdPartyNotices(outputPath?: string): string {
    const noticesPath =
      outputPath || path.join(this.projectPath, "THIRD-PARTY-NOTICES.md");

    let content = "# Third-Party Notices\n\n";
    content +=
      "This project incorporates components from the following projects:\n\n";

    for (const dep of this.dependencies) {
      content += `## ${dep.name} v${dep.version}\n\n`;
      content += `${dep.attribution}\n\n`;
      if (dep.repository) {
        content += `Repository: ${dep.repository}\n\n`;
      }
      content += "---\n\n";
    }

    fs.writeFileSync(noticesPath, content, "utf-8");
    log.info(`Generated THIRD-PARTY-NOTICES: ${noticesPath}`);

    return noticesPath;
  }

  /**
   * Get license info
   */
  getLicenseInfo(licenseType: LicenseType): LicenseInfo | undefined {
    return LICENSE_DATABASE[licenseType];
  }
}

// Export license compliance utilities
export const LicenseCompliance = {
  LicenseComplianceManager,
  LICENSE_DATABASE,
};

export default LicenseCompliance;
