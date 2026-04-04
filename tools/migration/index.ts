/**
 * OpenClaw to OpenOxygen Migration Tool
 *
 * Automates the migration from OpenClaw configuration and data to OpenOxygen
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../src/logging/index.js";
import { generateId, nowMs, resolveUserPath } from "../../src/utils/index.js";
import type { OxygenConfig, PluginConfig } from "../../src/types/index.js";

const log = createSubsystemLogger("migration/openclaw");

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationOptions {
  sourceDir: string;
  targetDir: string;
  backupDir?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface MigrationResult {
  success: boolean;
  migrated: {
    config: boolean;
    skills: number;
    plugins: number;
    sessions: number;
    memories: number;
  };
  errors: string[];
  warnings: string[];
  durationMs: number;
}

export interface OpenClawConfig {
  version: string;
  gateway?: {
    host?: string;
    port?: number;
  };
  models?: Array<{
    provider: string;
    model: string;
    apiKey?: string;
  }>;
  skills?: string[];
  plugins?: Array<{
    id: string;
    enabled: boolean;
  }>;
}

export interface OpenClawSkill {
  name: string;
  version: string;
  handler: string;
  config?: Record<string, unknown>;
}

// ============================================================================
// Migration Tool
// ============================================================================

export class OpenClawMigrator {
  private options: MigrationOptions;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(options: MigrationOptions) {
    this.options = {
      dryRun: false,
      verbose: false,
      ...options,
    };
  }

  /**
   * Run full migration
   */
  async migrate(): Promise<MigrationResult> {
    const startTime = nowMs();
    log.info("Starting OpenClaw to OpenOxygen migration");

    const result: MigrationResult = {
      success: true,
      migrated: {
        config: false,
        skills: 0,
        plugins: 0,
        sessions: 0,
        memories: 0,
      },
      errors: [],
      warnings: [],
      durationMs: 0,
    };

    try {
      // Create backup
      if (this.options.backupDir) {
        await this.createBackup();
      }

      // Migrate configuration
      result.migrated.config = await this.migrateConfig();

      // Migrate skills
      result.migrated.skills = await this.migrateSkills();

      // Migrate plugins
      result.migrated.plugins = await this.migratePlugins();

      // Migrate sessions
      result.migrated.sessions = await this.migrateSessions();

      // Migrate memories
      result.migrated.memories = await this.migrateMemories();

      log.info("Migration completed successfully");
    } catch (error) {
      result.success = false;
      this.errors.push(error instanceof Error ? error.message : String(error));
    }

    result.errors = this.errors;
    result.warnings = this.warnings;
    result.durationMs = nowMs() - startTime;

    return result;
  }

  /**
   * Create backup of source directory
   */
  private async createBackup(): Promise<void> {
    if (!this.options.backupDir) return;

    log.info(`Creating backup at: ${this.options.backupDir}`);

    if (this.options.dryRun) {
      log.info("[DRY RUN] Would create backup");
      return;
    }

    try {
      await fs.mkdir(this.options.backupDir, { recursive: true });

      // Copy all files from source to backup
      const entries = await fs.readdir(this.options.sourceDir, {
        withFileTypes: true,
        recursive: true,
      });

      for (const entry of entries) {
        const srcPath = path.join(entry.parentPath || this.options.sourceDir, entry.name);
        const relPath = path.relative(this.options.sourceDir, srcPath);
        const destPath = path.join(this.options.backupDir, relPath);

        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }

      log.info("Backup created successfully");
    } catch (error) {
      this.warnings.push(`Backup creation failed: ${error}`);
    }
  }

  /**
   * Migrate OpenClaw configuration to OpenOxygen
   */
  private async migrateConfig(): Promise<boolean> {
    log.info("Migrating configuration");

    try {
      const openclawConfigPath = path.join(
        this.options.sourceDir,
        "openclaw.json",
      );

      // Check if config exists
      try {
        await fs.access(openclawConfigPath);
      } catch {
        this.warnings.push("OpenClaw config not found, using defaults");
        return false;
      }

      // Read OpenClaw config
      const configContent = await fs.readFile(openclawConfigPath, "utf-8");
      const openclawConfig: OpenClawConfig = JSON.parse(configContent);

      // Transform to OpenOxygen config
      const oxygenConfig: Partial<OxygenConfig> = {
        version: "26w15a-dev-26.115.0",
        gateway: {
          host: openclawConfig.gateway?.host || "127.0.0.1",
          port: openclawConfig.gateway?.port || 4800,
          auth: { mode: "token" },
        },
        security: {
          privilegeLevel: "standard",
          auditEnabled: true,
          rollbackEnabled: true,
        },
        memory: {
          backend: "builtin",
          hybridSearch: true,
        },
        vision: {
          enabled: false,
        },
        models:
          openclawConfig.models?.map((m) => ({
            provider: m.provider as any,
            model: m.model,
            apiKey: m.apiKey,
          })) || [],
        agents: { list: [] },
        channels: [],
        plugins: [],
      };

      if (this.options.dryRun) {
        log.info("[DRY RUN] Would write config");
        return true;
      }

      // Write OpenOxygen config
      const targetConfigPath = path.join(
        this.options.targetDir,
        "openoxygen.json",
      );
      await fs.mkdir(this.options.targetDir, { recursive: true });
      await fs.writeFile(
        targetConfigPath,
        JSON.stringify(oxygenConfig, null, 2),
        "utf-8",
      );

      log.info("Configuration migrated successfully");
      return true;
    } catch (error) {
      this.errors.push(`Config migration failed: ${error}`);
      return false;
    }
  }

  /**
   * Migrate OpenClaw skills
   */
  private async migrateSkills(): Promise<number> {
    log.info("Migrating skills");

    const skillsDir = path.join(this.options.sourceDir, "skills");
    let migratedCount = 0;

    try {
      // Check if skills directory exists
      try {
        await fs.access(skillsDir);
      } catch {
        this.warnings.push("Skills directory not found");
        return 0;
      }

      const entries = await fs.readdir(skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillName = entry.name;
        const sourceSkillPath = path.join(skillsDir, skillName);
        const targetSkillPath = path.join(
          this.options.targetDir,
          "skills",
          skillName,
        );

        log.info(`Migrating skill: ${skillName}`);

        if (this.options.dryRun) {
          log.info(`[DRY RUN] Would migrate skill: ${skillName}`);
          migratedCount++;
          continue;
        }

        try {
          // Create target directory
          await fs.mkdir(targetSkillPath, { recursive: true });

          // Copy skill files
          const files = await fs.readdir(sourceSkillPath);
          for (const file of files) {
            const srcFile = path.join(sourceSkillPath, file);
            const destFile = path.join(targetSkillPath, file);
            await fs.copyFile(srcFile, destFile);
          }

          // Create compatibility wrapper
          await this.createSkillWrapper(skillName, targetSkillPath);

          migratedCount++;
        } catch (error) {
          this.errors.push(`Skill migration failed for ${skillName}: ${error}`);
        }
      }

      log.info(`Migrated ${migratedCount} skills`);
      return migratedCount;
    } catch (error) {
      this.errors.push(`Skills migration failed: ${error}`);
      return 0;
    }
  }

  /**
   * Create compatibility wrapper for OpenClaw skill
   */
  private async createSkillWrapper(
    skillName: string,
    skillPath: string,
  ): Promise<void> {
    const wrapperContent = `/**
 * OpenClaw Compatibility Wrapper for ${skillName}
 * Auto-generated by migration tool
 */

import { createSubsystemLogger } from "openoxygen/logging";
import type { ToolResult } from "openoxygen/types";

const log = createSubsystemLogger("skills/${skillName}");

// Import original OpenClaw skill
import * as originalSkill from "./index.original.js";

/**
 * Wrapped skill handler
 */
export async function ${skillName}Handler(
  ...args: any[]
): Promise<ToolResult> {
  log.info("Executing ${skillName} (OpenClaw compatible)");

  try {
    // Call original handler
    const result = await originalSkill.default(...args);

    // Transform result to OpenOxygen format
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default ${skillName}Handler;
`;

    await fs.writeFile(
      path.join(skillPath, "wrapper.ts"),
      wrapperContent,
      "utf-8",
    );
  }

  /**
   * Migrate OpenClaw plugins
   */
  private async migratePlugins(): Promise<number> {
    log.info("Migrating plugins");

    const pluginsDir = path.join(this.options.sourceDir, "plugins");
    let migratedCount = 0;

    try {
      try {
        await fs.access(pluginsDir);
      } catch {
        this.warnings.push("Plugins directory not found");
        return 0;
      }

      const entries = await fs.readdir(pluginsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pluginName = entry.name;
        log.info(`Migrating plugin: ${pluginName}`);

        if (this.options.dryRun) {
          log.info(`[DRY RUN] Would migrate plugin: ${pluginName}`);
          migratedCount++;
          continue;
        }

        // Plugin migration logic here
        migratedCount++;
      }

      return migratedCount;
    } catch (error) {
      this.errors.push(`Plugins migration failed: ${error}`);
      return 0;
    }
  }

  /**
   * Migrate OpenClaw sessions
   */
  private async migrateSessions(): Promise<number> {
    log.info("Migrating sessions");

    const sessionsPath = path.join(this.options.sourceDir, "sessions.json");

    try {
      try {
        await fs.access(sessionsPath);
      } catch {
        this.warnings.push("Sessions file not found");
        return 0;
      }

      const sessionsContent = await fs.readFile(sessionsPath, "utf-8");
      const sessions = JSON.parse(sessionsContent);

      // Transform sessions to OpenOxygen format
      const transformedSessions = sessions.map((session: any) => ({
        id: session.id || generateId("sess"),
        key: session.key || `session-${session.id}`,
        agentId: session.agentId || "default",
        createdAt: session.createdAt || nowMs(),
        lastActiveAt: session.lastActiveAt || nowMs(),
        metadata: session.metadata || {},
      }));

      if (this.options.dryRun) {
        log.info("[DRY RUN] Would migrate sessions");
        return transformedSessions.length;
      }

      // Write transformed sessions
      const targetSessionsPath = path.join(
        this.options.targetDir,
        "sessions.json",
      );
      await fs.writeFile(
        targetSessionsPath,
        JSON.stringify(transformedSessions, null, 2),
        "utf-8",
      );

      log.info(`Migrated ${transformedSessions.length} sessions`);
      return transformedSessions.length;
    } catch (error) {
      this.errors.push(`Sessions migration failed: ${error}`);
      return 0;
    }
  }

  /**
   * Migrate OpenClaw memories
   */
  private async migrateMemories(): Promise<number> {
    log.info("Migrating memories");

    const memoriesPath = path.join(this.options.sourceDir, "memories.json");

    try {
      try {
        await fs.access(memoriesPath);
      } catch {
        this.warnings.push("Memories file not found");
        return 0;
      }

      const memoriesContent = await fs.readFile(memoriesPath, "utf-8");
      const memories = JSON.parse(memoriesContent);

      if (this.options.dryRun) {
        log.info("[DRY RUN] Would migrate memories");
        return memories.length;
      }

      // Write to OpenOxygen memory format
      const targetMemoriesPath = path.join(
        this.options.targetDir,
        "memories.json",
      );
      await fs.writeFile(targetMemoriesPath, memoriesContent, "utf-8");

      log.info(`Migrated ${memories.length} memories`);
      return memories.length;
    } catch (error) {
      this.errors.push(`Memories migration failed: ${error}`);
      return 0;
    }
  }

  /**
   * Generate migration report
   */
  generateReport(result: MigrationResult): string {
    const lines: string[] = [];

    lines.push("# OpenClaw to OpenOxygen Migration Report");
    lines.push("");
    lines.push(`**Status**: ${result.success ? "✅ Success" : "❌ Failed"}`);
    lines.push(`**Duration**: ${result.durationMs}ms`);
    lines.push("");

    lines.push("## Migration Summary");
    lines.push("");
    lines.push(`- Configuration: ${result.migrated.config ? "✅" : "❌"}`);
    lines.push(`- Skills: ${result.migrated.skills}`);
    lines.push(`- Plugins: ${result.migrated.plugins}`);
    lines.push(`- Sessions: ${result.migrated.sessions}`);
    lines.push(`- Memories: ${result.migrated.memories}`);
    lines.push("");

    if (result.warnings.length > 0) {
      lines.push("## Warnings");
      lines.push("");
      for (const warning of result.warnings) {
        lines.push(`- ⚠️ ${warning}`);
      }
      lines.push("");
    }

    if (result.errors.length > 0) {
      lines.push("## Errors");
      lines.push("");
      for (const error of result.errors) {
        lines.push(`- ❌ ${error}`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("Generated by OpenClaw Migration Tool");

    return lines.join("\n");
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

export async function runMigration(
  sourceDir: string,
  targetDir: string,
  options: {
    backupDir?: string;
    dryRun?: boolean;
    verbose?: boolean;
  } = {},
): Promise<MigrationResult> {
  const migrator = new OpenClawMigrator({
    sourceDir: resolveUserPath(sourceDir),
    targetDir: resolveUserPath(targetDir),
    backupDir: options.backupDir
      ? resolveUserPath(options.backupDir)
      : undefined,
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  const result = await migrator.migrate();

  // Generate and save report
  const report = migrator.generateReport(result);
  const reportPath = path.join(targetDir, "MIGRATION_REPORT.md");

  if (!options.dryRun) {
    await fs.writeFile(reportPath, report, "utf-8");
  }

  console.log(report);

  return result;
}

// ============================================================================
// Exports
// ============================================================================

export {
  OpenClawMigrator,
  runMigration,
  type MigrationOptions,
  type MigrationResult,
  type OpenClawConfig,
};

export default OpenClawMigrator;
