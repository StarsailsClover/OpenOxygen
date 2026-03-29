# Changelog

All notable changes to OpenOxygen will be documented in this file.

## [26w13a-main-26.103.0] - 2026-03-28

### 🎉 Release Overview
Production release with complete P-0 to P-2 core functionality.

### 🔒 Security
- **Fixed** Critical eval() vulnerability in workflow-engine.ts
- **Implemented** Worker Thread sandbox isolation
- **Added** Zero-trust permission system
- **Added** Comprehensive audit logging

### �?Performance
- **Added** OLB (OxygenLLMBooster) Rust core
- **Implemented** Flash Attention V3
- **Added** TurboKV Cache with 3-bit quantization
- **Implemented** Paged Memory Management
- **Added** Performance monitoring and benchmarking

### 🛠�?Features
- **Added** 30+ automation skills (Office/Browser/System)
- **Implemented** Multimodal engine (Audio/Vision/Video)
- **Added** OxygenBrowser WebView2 integration
- **Implemented** OpenClaw compatibility layer
- **Added** HTN hierarchical task planner
- **Implemented** MCP protocol client
- **Added** Desktop client framework (Tauri)

### 🧪 Testing
- **Added** 50+ unit test cases
- **Implemented** Test coverage reporting
- **Added** Security audit tools

### 📚 Documentation
- **Added** Complete API documentation
- **Added** Skills usage guide
- **Added** Architecture documentation
- **Updated** README with bilingual support

### 🏗�?Architecture
- **Reorganized** Project file structure
- **Created** Unified archive directory
- **Added** File indexing and cleanup tools

---

## [26w12a-dev-26.102.0] - 2026-03-21

### Features
- Initial HTN planner implementation
- Basic MCP protocol support
- Skill registry system

### Improvements
- Enhanced error handling
- Improved type safety

---

## [26w11a-dev-26.101.0] - 2026-03-14

### Features
- Core runtime implementation
- Basic skill system
- Gateway API

---

## [26w10a-dev-26.100.0] - 2026-03-07

### Initial Release
- Project initialization
- Basic architecture setup
- Development environment configuration

---

## Version Format

Format: `YYwWWa-BRANCH-YY.BUILD.PATCH`

Example: `26w13a-main-26.103.0`
- `26` - Year (2026)
- `w13` - Week 13
- `a` - Iteration
- `main` - Branch name
- `26.103.0` - Build 103, patch 0

---

## Legend

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements
