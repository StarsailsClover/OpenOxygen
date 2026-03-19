# OpenOxygen 26w15aC 发布说明

**版本**: 26w15aC  
**发布日期**: 2026-03-19  
**状态**: 稳定版

---

## 概述

OpenOxygen 26w15aC 是一个功能完整的 Windows 原生 AI Agent 框架，支持终端命令执行、GUI 自动化、浏览器自动化、任务编排和文档生成。

---

## 主要功能

### P0: 基础架构
- ✅ 版本号统一 (26w15aC)
- ✅ Native Bridge 修复 (ESM/CJS 兼容)
- ✅ 测试框架迁移 (Vitest 标准格式)

### P1: 核心功能
- ✅ Global Memory System (SQLite 持久化)
- ✅ Terminal Executor (PowerShell/CMD)
- ✅ Task Orchestrator (任务分解/并行执行)
- ✅ Unified Executor (策略路由)
- ✅ Multi-Agent Communication (Agent 通信协议)

### P2: 高级功能
- ✅ Edge 浏览器自动化 (Gmail/哔哩哔哩/GitHub)
- ✅ QQ 自动化 (UIA 键鼠模拟)
- ✅ 工作流引擎 (多步骤任务链)
- ✅ 文档生成器 (docx/网页提取/总结)

### P3: 集成测试
- ✅ 端到端测试套件
- ✅ 集成测试覆盖
- ✅ API 文档更新

---

## 安装

```bash
# 克隆仓库
git clone https://github.com/openoxygen/core.git
cd core

# 安装依赖
npm install

# 运行测试
npm test

# 启动服务
npm start
```

---

## 快速开始

```javascript
import { initialize, execute, runWorkflow } from "openoxygen";

// 初始化
const app = await initialize();

// 快速执行命令
const result = await execute("npm install");

// 运行工作流
await runWorkflow("daily-check");
```

---

## API 文档

详见 [docs/API.md](./docs/API.md)

---

## 测试状态

```
Test Files: 13
Tests: 85+
Coverage: Core modules covered
```

---

## 已知问题

1. **Native 模块**: 部分功能依赖 native 模块，需要 `npm run build:native`
2. **QQ 协议**: QQ NT 协议仍在研究中，当前使用 UIA 模拟键鼠
3. **浏览器登录**: Gmail/GitHub 需要手动登录一次

---

## 系统要求

- Windows 10/11
- Node.js 18+
- PowerShell 5.1+
- Microsoft Edge (用于浏览器自动化)
- QQ (用于 QQ 自动化)

---

## 贡献

欢迎提交 Issue 和 PR！

---

## 许可证

MIT License

---

## 更新日志

### 26w15aC (2026-03-19)
- 完成 P0-P3 全部开发
- 添加 Edge/QQ 自动化
- 添加工作流引擎
- 添加文档生成器
- 更新 API 文档

### 26w15aB (之前版本)
- Global Memory System
- Task Orchestrator
- Multi-Agent Communication

---

**下载**: [Releases](../../releases)  
**文档**: [docs/](./docs/)  
**问题**: [Issues](../../issues)
