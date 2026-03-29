# OpenOxygen

[![Version](https://img.shields.io/badge/Version-26w14a--main--26.113.0-blue)]()
[![License](https://img.shields.io/badge/License-Apache%202.0-green)]()
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)]()

**OpenOxygen** - 下一代 AI Agent 平台，专为 Windows 原生环境优化，提供极致性能与全栈自动化能力。

[English](#english) | [中文](#中文)

---

## 中文

### 🚀 核心特性

#### 🔒 安全架构
- **零信任权限系统** - 细粒度访问控制
- **Worker Thread 沙箱** - 安全代码隔离
- **全链路审计** - 完整操作日志

#### ⚡ 极致性能
- **OLB (OxygenLLMBooster)** - Rust 核心加速引擎
- **Flash Attention V3** - 优化注意力机制
- **TurboKV Cache** - 3-bit 量化 (6x 内存降低)
- **Paged Memory** - 页级显存管理

#### 🛠️ 全栈自动化
- **30+ 高频技能** - Office/浏览器/系统运维
- **多模态引擎** - 音频/视觉/视频统一处理
- **OxygenBrowser** - Agent 专用浏览器
- **OpenClaw 兼容** - 无缝迁移工具

#### 🧠 智能规划
- **HTN 规划器** - 层次化任务分解
- **AI Cluster** - 多模型融合推理
- **反思引擎** - 自我优化与学习

### 📦 安装

```bash
# 克隆仓库
git clone https://github.com/StarsailsClover/OpenOxygen.git
cd OpenOxygen

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test
```

### 🎯 快速开始

```typescript
import { skillRegistry } from "./skills/registry";

// 执行自动化技能
const result = await skillRegistry.execute("browser.launch");

// 使用 HTN 规划器
const plan = await htnPlanner.plan(domain, goalTask);

// 调用 MCP 工具
const result = await mcpClient.callTool(serverId, toolName, args);
```

### 📚 文档

- [API 文档](docs/API.md) - 完整 API 参考
- [技能指南](docs/SKILLS.md) - 技能使用与开发
- [架构文档](docs/ARCHITECTURE.md) - 系统设计
- [迁移指南](docs/MIGRATION.md) - OpenClaw 迁移

### 🏗️ 项目结构

```
OpenOxygen/
├── src/                    # 源代码
│   ├── core/              # 核心模块
│   ├── execution/         # 执行层
│   ├── inference/         # 推理层
│   ├── agent/             # Agent 层
│   ├── skills/            # 技能库
│   ├── planning/          # 规划系统 (HTN)
│   ├── protocols/         # 协议 (MCP)
│   ├── browser/           # OxygenBrowser
│   └── tests/             # 测试套件
├── OLB/                   # OxygenLLMBooster (Rust)
├── desktop/               # 桌面客户端 (Tauri)
├── docs/                  # 文档
└── scripts/               # 构建脚本
```

### 🛣️ 路线图

- [x] P-0: 核心功能 (85%)
- [x] P-1: 高优先级 (70%)
- [x] P-2: 中优先级 (40%)
- [ ] 桌面客户端完善
- [ ] CUDA 优化
- [ ] 知识图谱

### 🤝 贡献

欢迎贡献！请阅读 [贡献指南](CONTRIBUTING.md)。

### 📄 许可证

Apache 2.0 License - 详见 [LICENSE](LICENSE)

---

## English

### 🚀 Core Features

#### 🔒 Security Architecture
- **Zero-trust permission system** - Fine-grained access control
- **Worker Thread sandbox** - Secure code isolation
- **Full audit trail** - Complete operation logging

#### ⚡ Extreme Performance
- **OLB (OxygenLLMBooster)** - Rust core acceleration engine
- **Flash Attention V3** - Optimized attention mechanism
- **TurboKV Cache** - 3-bit quantization (6x memory reduction)
- **Paged Memory** - Page-level GPU memory management

#### 🛠️ Full-Stack Automation
- **30+ high-frequency skills** - Office/Browser/System operations
- **Multimodal engine** - Audio/Vision/Video unified processing
- **OxygenBrowser** - Agent-optimized browser
- **OpenClaw compatible** - Seamless migration tools

#### 🧠 Intelligent Planning
- **HTN Planner** - Hierarchical task decomposition
- **AI Cluster** - Multi-model fusion inference
- **Reflection Engine** - Self-improvement and learning

### 📦 Installation

```bash
# Clone repository
git clone https://github.com/StarsailsClover/OpenOxygen.git
cd OpenOxygen

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test
```

### 🎯 Quick Start

```typescript
import { skillRegistry } from "./skills/registry";

// Execute automation skill
const result = await skillRegistry.execute("browser.launch");

// Use HTN planner
const plan = await htnPlanner.plan(domain, goalTask);

// Call MCP tool
const result = await mcpClient.callTool(serverId, toolName, args);
```

### 📚 Documentation

- [API Reference](docs/API.md) - Complete API documentation
- [Skills Guide](docs/SKILLS.md) - Skill usage and development
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Migration Guide](docs/MIGRATION.md) - OpenClaw migration

### 🏗️ Project Structure

```
OpenOxygen/
├── src/                    # Source code
│   ├── core/              # Core modules
│   ├── execution/         # Execution layer
│   ├── inference/         # Inference layer
│   ├── agent/             # Agent layer
│   ├── skills/            # Skill library
│   ├── planning/          # Planning system (HTN)
│   ├── protocols/         # Protocols (MCP)
│   ├── browser/           # OxygenBrowser
│   └── tests/             # Test suites
├── OLB/                   # OxygenLLMBooster (Rust)
├── desktop/               # Desktop client (Tauri)
├── docs/                  # Documentation
└── scripts/               # Build scripts
```

### 🛣️ Roadmap

- [x] P-0: Core features (85%)
- [x] P-1: High priority (70%)
- [x] P-2: Medium priority (40%)
- [ ] Desktop client completion
- [ ] CUDA optimization
- [ ] Knowledge graph

### 🤝 Contributing

Contributions welcome! Please read [Contributing Guide](CONTRIBUTING.md).

### 📄 License

Apache 2.0 License - See [LICENSE](LICENSE)

---

**Made with ❤️ by the OpenOxygen Team**
