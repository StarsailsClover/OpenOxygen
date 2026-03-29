# Skill Development Guide

## Quick Start

### 1. Create Skill Directory

```
my-skill/
├── claw.json          # Manifest (OpenClaw compatible)
├── instructions.md    # Skill instructions for LLM
├── README.md          # Human-readable description
└── src/
    └── index.ts       # Entry point (optional)
```

### 2. Write Manifest (`claw.json`)

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "What this skill does",
  "author": "your-name",
  "license": "MIT",
  "permissions": ["network"],
  "entry": "instructions.md",
  "tags": ["utility"],
  "models": ["*"]
}
```

### 3. Write Instructions (`instructions.md`)

This is the prompt that gets injected into the LLM context when your skill is active:

```markdown
# My Skill

You are an assistant that helps users with X.

## Available Tools
- `file.read` �?Read a file
- `network.request` �?Make HTTP requests

## Workflow
1. Ask the user what they need
2. Use the appropriate tool
3. Present the results
```

### 4. Install

```bash
# Copy to skills directory
cp -r my-skill/ ~/.openoxygen/plugins/my-skill/

# Or use the marketplace
openoxygen plugin install ./my-skill
```

## Permissions

| Permission | Description | Risk |
|-----------|-------------|------|
| `network` | HTTP/WebSocket requests | Safe |
| `filesystem.read` | Read files | Safe |
| `filesystem.write` | Write files | Warning |
| `clipboard.read` | Read clipboard | Safe |
| `clipboard.write` | Write clipboard | Warning |
| `process.read` | List processes | Warning |
| `process.kill` | Kill processes | **Blocked** |
| `registry.write` | Write registry | **Blocked** |

## OpenClaw Compatibility

OpenOxygen reads `claw.json` natively. Existing OpenClaw skills work without modification.

Additional OpenOxygen fields (optional):
```json
{
  "minOpenOxygenVersion": "26w11aE",
  "signature": "base64-ed25519-signature",
  "integrity": "sha256-hash"
}
```

## Testing

```bash
# Verify skill loads
node -e "
const { PluginRepository } = require('./dist/plugins/marketplace/index.js');
const repo = new PluginRepository();
const result = repo.installLocal('./my-skill');
console.log(result ? 'OK' : 'FAILED');
"
```
