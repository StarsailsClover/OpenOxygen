#!/usr/bin/env node
/**
 * OpenClaw Migration CLI
 *
 * Usage:
 *   npx openoxygen-migrate <source-dir> <target-dir> [options]
 *
 * Options:
 *   --backup-dir <path>   Create backup before migration
 *   --dry-run            Show what would be migrated without making changes
 *   --verbose            Show detailed output
 *   --help               Show help
 */

import { runMigration } from "./index.js";

function showHelp(): void {
  console.log(`
OpenClaw to OpenOxygen Migration Tool

Usage:
  npx openoxygen-migrate <source-dir> <target-dir> [options]

Arguments:
  source-dir    Path to OpenClaw installation directory
  target-dir    Path to OpenOxygen installation directory

Options:
  --backup-dir <path>   Create backup before migration
  --dry-run            Show what would be migrated without making changes
  --verbose            Show detailed output
  --help               Show this help message

Examples:
  # Basic migration
  npx openoxygen-migrate ~/.openclaw ~/.openoxygen

  # Migration with backup
  npx openoxygen-migrate ~/.openclaw ~/.openoxygen --backup-dir ~/backups/openclaw

  # Dry run to preview changes
  npx openoxygen-migrate ~/.openclaw ~/.openoxygen --dry-run --verbose
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes("--help") || args.length < 2) {
    showHelp();
    process.exit(args.includes("--help") ? 0 : 1);
  }

  const sourceDir = args[0];
  const targetDir = args[1];

  // Parse options
  const options: {
    backupDir?: string;
    dryRun?: boolean;
    verbose?: boolean;
  } = {};

  const backupIndex = args.indexOf("--backup-dir");
  if (backupIndex !== -1 && args[backupIndex + 1]) {
    options.backupDir = args[backupIndex + 1];
  }

  if (args.includes("--dry-run")) {
    options.dryRun = true;
  }

  if (args.includes("--verbose")) {
    options.verbose = true;
  }

  console.log("OpenClaw to OpenOxygen Migration Tool");
  console.log("=====================================\n");

  console.log(`Source: ${sourceDir}`);
  console.log(`Target: ${targetDir}`);
  if (options.backupDir) {
    console.log(`Backup: ${options.backupDir}`);
  }
  if (options.dryRun) {
    console.log("Mode: DRY RUN (no changes will be made)");
  }
  console.log("");

  try {
    const result = await runMigration(sourceDir, targetDir, options);

    console.log("\n=====================================");
    console.log(`Migration ${result.success ? "completed" : "failed"}`);
    console.log(`Duration: ${result.durationMs}ms`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
