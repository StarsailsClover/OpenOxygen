# OpenOxygen Project Structure (Reorganized)

**Version**: 26w13a-26.110.4-Phase 4  
**Date**: 2026-03-29

---

## Directory Structure

```
OpenOxygen/
â”œâ”€â”€ src/                          # Source code
â”?  â”œâ”€â”€ core/                     # Core system modules
â”?  â”?  â”œâ”€â”€ ai-cluster/          # AI Cluster (multi-model fusion)
â”?  â”?  â”œâ”€â”€ config/              # Configuration management
â”?  â”?  â”œâ”€â”€ errors.ts            # Error codes and handling
â”?  â”?  â”œâ”€â”€ gateway.ts           # HTTP/WebSocket gateway
â”?  â”?  â””â”€â”€ runtime.ts           # Runtime engine
â”?  â”?
â”?  â”œâ”€â”€ execution/               # Execution layer
â”?  â”?  â”œâ”€â”€ sandbox/             # Secure code sandbox
â”?  â”?  â”œâ”€â”€ browser/             # Browser automation
â”?  â”?  â”œâ”€â”€ terminal/            # Terminal execution
â”?  â”?  â””â”€â”€ unified/             # Unified execution interface
â”?  â”?
â”?  â”œâ”€â”€ inference/               # Inference layer
â”?  â”?  â”œâ”€â”€ engine/              # LLM inference engine
â”?  â”?  â”œâ”€â”€ router/              # Model routing
â”?  â”?  â””â”€â”€ reflection/          # Reflection and self-improvement
â”?  â”?
â”?  â”œâ”€â”€ agent/                   # Agent layer
â”?  â”?  â”œâ”€â”€ orchestrator/        # Agent orchestration
â”?  â”?  â””â”€â”€ communication/       # Inter-agent communication
â”?  â”?
â”?  â”œâ”€â”€ memory/                  # Memory management
â”?  â”?  â”œâ”€â”€ vector/              # Vector store
â”?  â”?  â”œâ”€â”€ lifecycle/           # Memory lifecycle
â”?  â”?  â””â”€â”€ global/              # Global memory
â”?  â”?
â”?  â”œâ”€â”€ security/                # Security modules
â”?  â”?  â”œâ”€â”€ permissions/         # Permission system
â”?  â”?  â””â”€â”€ audit/               # Audit logging
â”?  â”?
â”?  â”œâ”€â”€ skills/                  # Automation skills
â”?  â”?  â”œâ”€â”€ office/              # Office automation
â”?  â”?  â”œâ”€â”€ browser/             # Browser automation
â”?  â”?  â”œâ”€â”€ system/              # System operations
â”?  â”?  â””â”€â”€ registry.ts          # Skill registry
â”?  â”?
â”?  â”œâ”€â”€ planning/                # Planning systems
â”?  â”?  â””â”€â”€ htn/                 # HTN planner
â”?  â”?      â”œâ”€â”€ index.ts         # Core HTN implementation
â”?  â”?      â””â”€â”€ domains.ts       # Predefined domains
â”?  â”?
â”?  â”œâ”€â”€ protocols/               # Protocol implementations
â”?  â”?  â””â”€â”€ mcp/                 # MCP protocol
â”?  â”?      â”œâ”€â”€ index.ts         # MCP client
â”?  â”?      â””â”€â”€ gateway-integration.ts
â”?  â”?
â”?  â”œâ”€â”€ compat/                  # Compatibility layers
â”?  â”?  â””â”€â”€ openclaw/            # OpenClaw compatibility
â”?  â”?
â”?  â”œâ”€â”€ multimodal/              # Multimodal processing
â”?  â”?  â””â”€â”€ index.ts             # Audio/vision/video
â”?  â”?
â”?  â”œâ”€â”€ browser/                 # OxygenBrowser
â”?  â”?  â””â”€â”€ index.ts             # WebView2-based browser
â”?  â”?
â”?  â”œâ”€â”€ vision/                  # Vision systems
â”?  â”?  â”œâ”€â”€ ui-tars.ts
â”?  â”?  â””â”€â”€ qwen-vl.ts
â”?  â”?
â”?  â”œâ”€â”€ logging/                 # Logging system
â”?  â”œâ”€â”€ types/                   # TypeScript types
â”?  â”œâ”€â”€ utils/                   # Utilities
â”?  â””â”€â”€ tests/                   # Test suites
â”?      â”œâ”€â”€ sandbox.test.ts
â”?      â”œâ”€â”€ permissions.test.ts
â”?      â”œâ”€â”€ ai-cluster.test.ts
â”?      â”œâ”€â”€ reflection.test.ts
â”?      â”œâ”€â”€ htn.test.ts
â”?      â”œâ”€â”€ mcp.test.ts
â”?      â””â”€â”€ skills.test.ts
â”?
â”œâ”€â”€ OLB/                         # OxygenLLMBooster (Rust)
â”?  â”œâ”€â”€ src/
â”?  â”?  â”œâ”€â”€ lib.rs               # Main library
â”?  â”?  â”œâ”€â”€ attention.rs         # Flash Attention V3
â”?  â”?  â”œâ”€â”€ moe.rs               # Universal MoE
â”?  â”?  â”œâ”€â”€ kv_cache.rs          # TurboKV Cache
â”?  â”?  â”œâ”€â”€ memory.rs            # Paged Memory
â”?  â”?  â”œâ”€â”€ router.rs            # Model Router
â”?  â”?  â””â”€â”€ quantization.rs      # Quantization
â”?  â”œâ”€â”€ python/
â”?  â”?  â””â”€â”€ olb/
â”?  â”?      â”œâ”€â”€ __init__.py
â”?  â”?      â””â”€â”€ config.py
â”?  â”œâ”€â”€ Cargo.toml
â”?  â”œâ”€â”€ build.rs
â”?  â””â”€â”€ README.md
â”?
â”œâ”€â”€ native/                      # Native C++ modules
â”?  â””â”€â”€ (Node-API bindings)
â”?
â”œâ”€â”€ docs/                        # Documentation
â”?  â”œâ”€â”€ API.md                   # API reference
â”?  â”œâ”€â”€ SKILLS.md                # Skills guide
â”?  â”œâ”€â”€ ARCHITECTURE.md          # Architecture docs
â”?  â””â”€â”€ MIGRATION.md             # Migration guide
â”?
â”œâ”€â”€ scripts/                     # Build scripts
â”?  â”œâ”€â”€ build-installer.nsi      # NSIS installer
â”?  â”œâ”€â”€ release-pipeline.bat     # Release pipeline
â”?  â”œâ”€â”€ project-audit.cjs        # Project audit
â”?  â”œâ”€â”€ file-indexer.cjs         # File indexer
â”?  â””â”€â”€ cleanup-redundant.bat    # Cleanup script
â”?
â”œâ”€â”€ archive/                     # Archived files
â”?  â”œâ”€â”€ old_roadmaps/            # Old planning docs
â”?  â”œâ”€â”€ backups/                 # Backup files
â”?  â””â”€â”€ test_outputs/            # Test outputs
â”?
â”œâ”€â”€ resources/                   # Resources
â”?  â”œâ”€â”€ docs/                    # Additional docs
â”?  â””â”€â”€ examples/                # Example code
â”?
â”œâ”€â”€ deprecated/                  # Deprecated code
â”?
â”œâ”€â”€ tests/                       # Additional tests
â”?
â”œâ”€â”€ FILE_INDEX.json              # File index
â”œâ”€â”€ REORGANIZATION_PLAN.json     # Reorganization plan
â”œâ”€â”€ PROJECT_STRUCTURE_NEW.md     # This file
â”œâ”€â”€ README.md                    # Main readme
â”œâ”€â”€ LICENSE                      # MIT
â”œâ”€â”€ CHANGELOG.md                 # Changelog
â”œâ”€â”€ package.json                 # Node.js config
â”œâ”€â”€ tsconfig.json                # TypeScript config
â””â”€â”€ vitest.config.ts             # Test config
```

---

## Key Components

### Core (src/core/)
- **AI Cluster**: Multi-model fusion and routing
- **Gateway**: HTTP/WebSocket API server
- **Runtime**: Task execution engine
- **Config**: Configuration management

### Execution (src/execution/)
- **Sandbox**: Secure Worker Thread isolation
- **Browser**: CDP-based browser automation
- **Terminal**: Shell command execution

### Inference (src/inference/)
- **Engine**: LLM inference with OLB integration
- **Router**: Dynamic model selection
- **Reflection**: Self-improvement system

### Planning (src/planning/)
- **HTN**: Hierarchical Task Network planner
- **Domains**: Predefined planning domains

### Protocols (src/protocols/)
- **MCP**: Model Context Protocol client
- **Integration**: Gateway integration

### Skills (src/skills/)
- **Office**: Word/Excel/PowerPoint/PDF
- **Browser**: Navigation/interaction
- **System**: File/clipboard/desktop

### OLB (OxygenLLMBooster/)
- **Rust Core**: High-performance inference
- **Flash Attention**: Optimized attention
- **TurboKV**: Compressed KV cache
- **Paged Memory**: Efficient memory management

---

## File Organization Rules

### Source Code (src/)
- One feature per directory
- Index file exports public API
- Tests in src/tests/

### Documentation (docs/)
- User-facing docs in docs/
- README in root
- Archive old docs in archive/

### Archives (archive/)
- Old roadmaps in archive/old_roadmaps/
- Backups in archive/backups/
- Test outputs in archive/test_outputs/

### Resources (resources/)
- Additional docs in resources/docs/
- Examples in resources/examples/

### Deprecated (deprecated/)
- Old code awaiting removal
- Clear deprecation notices

---

## Naming Conventions

### Files
- `kebab-case.ts` for modules
- `index.ts` for directory exports
- `.test.ts` for tests
- `.bak` for backups (to be archived)

### Directories
- `lowercase` for directories
- Descriptive names
- No spaces or special chars

---

## Maintenance

### Regular Tasks
- Archive old files monthly
- Review deprecated code quarterly
- Update file index after major changes

### Cleanup
- Run `cleanup-redundant.bat` before releases
- Archive backups older than 30 days
- Remove test outputs after verification
