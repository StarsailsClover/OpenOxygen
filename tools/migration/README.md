# OpenClaw to OpenOxygen Migration Tool

## Overview

This tool automates the migration from OpenClaw to OpenOxygen, preserving configurations, skills, plugins, sessions, and memories.

## Features

- ✅ Configuration migration (`openclaw.json` → `openoxygen.json`)
- ✅ Skill migration with compatibility wrappers
- ✅ Plugin migration
- ✅ Session migration
- ✅ Memory migration
- ✅ Backup creation before migration
- ✅ Dry-run mode for preview
- ✅ Detailed migration report

## Installation

```bash
npm install -g openoxygen
```

## Usage

### Basic Migration

```bash
npx openoxygen-migrate ~/.openclaw ~/.openoxygen
```

### Migration with Backup

```bash
npx openoxygen-migrate ~/.openclaw ~/.openoxygen --backup-dir ~/backups/openclaw-$(date +%Y%m%d)
```

### Dry Run (Preview)

```bash
npx openoxygen-migrate ~/.openclaw ~/.openoxygen --dry-run --verbose
```

## API Usage

```typescript
import { OpenClawMigrator } from "openoxygen/tools/migration";

const migrator = new OpenClawMigrator({
  sourceDir: "~/.openclaw",
  targetDir: "~/.openoxygen",
  backupDir: "~/backups/openclaw",
  dryRun: false,
  verbose: true,
});

const result = await migrator.migrate();

console.log(`Migrated ${result.migrated.skills} skills`);
console.log(`Migrated ${result.migrated.plugins} plugins`);

if (!result.success) {
  console.error("Errors:", result.errors);
}
```

## Migration Process

### 1. Configuration Migration

Transforms `openclaw.json` to `openoxygen.json`:

| OpenClaw | OpenOxygen |
|----------|-----------|
| `gateway.host` | `gateway.host` |
| `gateway.port` | `gateway.port` |
| `models` | `models` |
| `skills` | Skills auto-registered |
| `plugins` | Plugins migrated |

### 2. Skill Migration

- Copies skill files from `~/.openclaw/skills/` to `~/.openoxygen/skills/`
- Generates compatibility wrappers for seamless integration
- Preserves original functionality

### 3. Plugin Migration

- Migrates plugin configurations
- Updates plugin manifests for OpenOxygen compatibility

### 4. Session Migration

- Transforms session format
- Preserves session keys for continuity

### 5. Memory Migration

- Migrates memory entries
- Preserves vector embeddings

## Compatibility

### OpenClaw Features → OpenOxygen

| OpenClaw Feature | OpenOxygen Equivalent |
|-----------------|----------------------|
| Context Bridge | Session Management |
| Skill Registry | Skill System |
| Memory Search | Vector Memory |
| Task Planning | HTN Planner |
| Multi-Agent | Multi-Agent System |

## Troubleshooting

### Migration Fails

1. Check source directory exists
2. Ensure write permissions on target directory
3. Run with `--verbose` for detailed error messages

### Skills Not Working

1. Check compatibility wrapper was generated
2. Verify skill dependencies are installed
3. Review skill-specific migration notes

### Sessions Lost

1. Check `sessions.json` was migrated
2. Verify session key format
3. Re-authenticate if needed

## Migration Report

After migration, a `MIGRATION_REPORT.md` is generated with:

- Migration status
- Items migrated count
- Warnings and errors
- Recommendations

## Support

For issues and questions:
https://github.com/StarsailsClover/OpenOxygen/issues
