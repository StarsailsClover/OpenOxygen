# OpenOxygen Project Structure (Reorganized)

**Version**: 26w13a-26.110.4-Phase 4  
**Date**: 2026-03-29

---

## Directory Structure

```
OpenOxygen/
├── src/                          # Source code
│   ├── core/                     # Core system modules
│   │   ├── ai-cluster/          # AI Cluster (multi-model fusion)
│   │   ├── config/              # Configuration management
│   │   ├── errors.ts            # Error codes and handling
│   │   ├── gateway.ts           # HTTP/WebSocket gateway
│   │   └── runtime.ts           # Runtime engine
│   │
│   ├── execution/               # Execution layer
│   │   ├── sandbox/             # Secure code sandbox
│   │   ├── browser/             # Browser automation
│   │   ├── terminal/            # Terminal execution
│   │   └── unified/             # Unified execution interface
│   │
│   ├── inference/               # Inference layer
│   │   ├── engine/              # LLM inference engine
│   │   ├── router/              # Model routing
│   │   └── reflection/          # Reflection and self-improvement
│   │
│   ├── agent/                   # Agent layer
│   │   ├── orchestrator/        # Agent orchestration
│   │   └── communication/       # Inter-agent communication
│   │
│   ├── memory/                  # Memory management
│   │   ├── vector/              # Vector store
│   │   ├── lifecycle/           # Memory lifecycle
│   │   └── global/              # Global memory
│   │
│   ├── security/                # Security modules
│   │   ├── permissions/         # Permission system
│   │   └── audit/               # Audit logging
│   │
│   ├── skills/                  # Automation skills
│   │   ├── office/              # Office automation
│   │   ├── browser/             # Browser automation
│   │   ├── system/              # System operations
│   │   └── registry.ts          # Skill registry
│   │
│   ├── planning/                # Planning systems
│   │   └── htn/                 # HTN planner
│   │       ├── index.ts         # Core HTN implementation
│   │       └── domains.ts       # Predefined domains
│   │
│   ├── protocols/               # Protocol implementations
│   │   └── mcp/                 # MCP protocol
│   │       ├── index.ts         # MCP client
│   │       └── gateway-integration.ts
│   │
│   ├── compat/                  # Compatibility layers
│   │   └── openclaw/            # OpenClaw compatibility
│   │
│   ├── multimodal/              # Multimodal processing
│   │   └── index.ts             # Audio/vision/video
│   │
│   ├── browser/                 # OxygenBrowser
│   │   └── index.ts             # WebView2-based browser
│   │
│   ├── vision/                  # Vision systems
│   │   ├── ui-tars.ts
│   │   └── qwen-vl.ts
│   │
│   ├── logging/                 # Logging system
│   ├── types/                   # TypeScript types
│   ├── utils/                   # Utilities
│   └── tests/                   # Test suites
│       ├── sandbox.test.ts
│       ├── permissions.test.ts
│       ├── ai-cluster.test.ts
│       ├── reflection.test.ts
│       ├── htn.test.ts
│       ├── mcp.test.ts
│       └── skills.test.ts
│
├── OLB/                         # OxygenLLMBooster (Rust)
│   ├── src/
│   │   ├── lib.rs               # Main library
│   │   ├── attention.rs         # Flash Attention V3
│   │   ├── moe.rs               # Universal MoE
│   │   ├── kv_cache.rs          # TurboKV Cache
│   │   ├── memory.rs            # Paged Memory
│   │   ├── router.rs            # Model Router
│   │   └── quantization.rs      # Quantization
│   ├── python/
│   │   └── olb/
│   │       ├── __init__.py
│   │       └── config.py
│   ├── Cargo.toml
│   ├── build.rs
│   └── README.md
│
├── native/                      # Native C++ modules
│   └── (Node-API bindings)
│
├── docs/                        # Documentation
│   ├── API.md                   # API reference
│   ├── SKILLS.md                # Skills guide
│   ├── ARCHITECTURE.md          # Architecture docs
│   └── MIGRATION.md             # Migration guide
│
├── scripts/                     # Build scripts
│   ├── build-installer.nsi      # NSIS installer
│   ├── release-pipeline.bat     # Release pipeline
│   ├── project-audit.cjs        # Project audit
│   ├── file-indexer.cjs         # File indexer
│   └── cleanup-redundant.bat    # Cleanup script
│
├── archive/                     # Archived files
│   ├── old_roadmaps/            # Old planning docs
│   ├── backups/                 # Backup files
│   └── test_outputs/            # Test outputs
│
├── resources/                   # Resources
│   ├── docs/                    # Additional docs
│   └── examples/                # Example code
│
├── deprecated/                  # Deprecated code
│
├── tests/                       # Additional tests
│
├── FILE_INDEX.json              # File index
├── REORGANIZATION_PLAN.json     # Reorganization plan
├── PROJECT_STRUCTURE_NEW.md     # This file
├── README.md                    # Main readme
├── LICENSE                      # Apache 2.0
├── CHANGELOG.md                 # Changelog
├── package.json                 # Node.js config
├── tsconfig.json                # TypeScript config
└── vitest.config.ts             # Test config
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
