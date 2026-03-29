# OpenOxygen 统一开发路线图

> 融合自：`2603141948.md`（原始愿景）、`ROADMAP_FULL.md`（周版本计划）、`26w15aB-26w15aHRoadmap.md`（近期细化）
> 基于截至 26w15a 的实际开发进度和技术债审计
> 最后更新：2026-03-17

---

## 已完成功能清单

| 版本 | 功能 | 状态 |
|------|------|------|
| 26w11aE | 安全基础、多模型运行时、OUV v2 视觉融合、输入安全、SQLite 持久化、分布式 Gateway、插件市场、安全加固、Dashboard | ✅ |
| 26w12aA | TaskManager、WebSocket 实时通道、任务取消 API | ✅ |
| 26w13aA | 9 轮 OUV 训练（R1-R9）、84 视觉经验、26 应用覆盖 | ✅ |
| 26w13aB | 部署文档、start.bat、端口自动检测、Release 包 | ✅ |
| 26w14a | Terminal Executor、OxygenBrowser CDP 框架、Unified Task Executor | ✅ |
| 26w15a | Global Memory（SQLite）、Multi-Agent 通信、Task Orchestrator、Structured LLM Output、4B 模型兼容 | ✅ |

---

## 未完成/未开发功能全量清单

### 🔴 P0 — 核心缺失（阻塞用户使用）

| # | 功能 | 来源文档 | 当前状态 | 计划版本 |
|---|------|---------|---------|---------|
| 1 | **代码重构优化** — 减少冗余、替换旧方案、统一代码风格 | 26w15aB-H | 未开始 | 26w15aB |
| 2 | **OUV 完整链路** — 精确识别→预测→精确坐标→精确操作→精确反思 | 26w15aB-H, 2603141948 | 部分（VLM+UIA+键鼠有，缺 OSR/预测/向量库） | 26w15aC-D |
| 3 | **用户请求链路革新** — 可交互 Web UI（替代空白 Dashboard） | 26w15aB-H | 仅 localhost 静态页 | 26w15aE |
| 4 | **OxygenBrowser 完整实现** — WinUI/跨平台浏览器应用 | 26w15aB-H | CDP 框架，无 UI | 26w15aF-G |
| 5 | **mouseClick 3 参数** 已修复但未回写到 native-bridge.ts 源码 | 训练发现 | 测试脚本修复，源码未同步 | 26w15aB |

### 🟡 P1 — 核心增强（显著提升能力）

| # | 功能 | 来源文档 | 当前状态 | 计划版本 |
|---|------|---------|---------|---------|
| 6 | **OSR（OxygenStepRecorder）** — 操作录制+截屏训练系统 | 26w15aB-H | 未开始 | 26w15aC |
| 7 | **OUV 向量数据库** — 独立存储训练数据 | 26w15aB-H | 有 Int8 向量量化但未集成到 OUV | 26w15aC |
| 8 | **OLB（OxygenLLMBooster）** — LLM 推理加速 | 26w15aB-H | 未开始 | 26w15aD |
| 9 | **HTN 层次化任务规划** — 分层记忆 | ROADMAP_FULL | 未开始 | 26w15aE |
| 10 | **全栈 Windows 生态** — UWP/WSL2/硬件控制 | ROADMAP_FULL | 部分（有 Windows 控制） | 26w15aF |
| 11 | **多模态工具链** — 浏览器自动化引擎 | ROADMAP_FULL | OxygenBrowser CDP 框架 | 26w15aF |
| 12 | **工具链安全沙箱** — 数据流隔离 | ROADMAP_FULL | 有 sandbox 框架 | 26w15aG |
| 13 | **预构建连接器** — 插件测试脚手架 | ROADMAP_FULL | 有插件市场框架 | 26w15aG |
| 14 | **JS 事件监听** — 网页事件读取与模拟预测 | 26w15aB-H | 未开始 | 26w15aF |
| 15 | **文件系统感知** — 实时扫盘、索引、预启动 | 26w15aB-H | 未开始 | 26w15aF |

### 🟢 P2 — 生态建设（长期竞争力）

| # | 功能 | 来源文档 | 当前状态 | 计划版本 |
|---|------|---------|---------|---------|
| 16 | **Windows 桌面客户端** — WinUI 应用（类阶跃 AI） | 26w15aB-H | 未开始 | 26w15aH |
| 17 | **杀毒兼容 + 数字签名** | ROADMAP_FULL | 未开始 | 26w15aH |
| 18 | **OxygenServer 远程部署** | ROADMAP_FULL | 未开始 | 26w16a+ |
| 19 | **OpenTelemetry 全链路追踪** | ROADMAP_FULL | 未开始 | 26w16a+ |
| 20 | **RLHF 轻量版** | ROADMAP_FULL | 未开始 | 26w17a+ |
| 21 | **低代码编辑器** | ROADMAP_FULL | 未开始 | 26w17a+ |
| 22 | **分布式执行** | ROADMAP_FULL | 有 ClusterManager 框架 | 26w17a+ |
| 23 | **P2P 下载加速** | 26w15aB-H | 未开始 | 26w17a+ |
| 24 | **OxygenCloud 预留** | 26w15aB-H | 未开始 | 26w26a+ |
| 25 | **自动翻译到用户语言偏好** | 26w15aB-H | 未开始 | 26w16a+ |

---

## 版本规划（26w15aB → 26w15aH）

### 26w15aB — 代码重构 + 技术债清理

**目标：** 清理技术债，统一代码质量，为后续大功能开发打基础

**Phase 0:** 技术债审计与修复
- [ ] mouseClick 3 参数回写到 native-bridge.ts 和所有调用点
- [ ] communication/index.ts 编译错误修复
- [ ] dist/ 加入 .gitignore 但保留 native-bridge.js 手动维护
- [ ] package.json version 统一为 26w15aB
- [ ] 清理根目录残留文件（.py、.txt）

**Phase 1:** 代码结构重构
- [ ] src/ 目录结构标准化（按功能域分层）
- [ ] 统一 import 路径（消除 ../../../ 深层引用）
- [ ] 统一错误处理模式（Result<T, Error> 风格）
- [ ] 统一日志格式和级别

**Phase 2:** TypeScript 严格模式
- [ ] tsconfig strict: true
- [ ] 消除所有 any 类型
- [ ] 补全缺失的类型定义
- [ ] 0 编译错误

**Phase 3:** 测试基础设施
- [ ] vitest 配置完善
- [ ] 单元测试覆盖核心模块（>60%）
- [ ] CI 测试脚本（npm test 一键运行）

**Phase 4:** 文档同步
- [ ] README 更新到 26w15aB
- [ ] API 文档与实际端点同步
- [ ] CHANGELOG 补全

---

### 26w15aC — OUV 完整链路

**目标：** OUV 从"视觉模块"升级为"Agent 理解和操作屏幕的完整工具"

**Phase 0:** OSR（OxygenStepRecorder）
- [ ] 操作录制引擎（截屏+动作+时间戳）
- [ ] 录制回放功能
- [ ] 训练数据导出格式

**Phase 1:** OUV 向量数据库
- [ ] 独立向量存储（基于已有 Int8 量化）
- [ ] 元素特征向量化（名称+类型+位置+上下文）
- [ ] 相似元素检索（"搜索框"在不同应用中的位置）

**Phase 2:** OUV 预测模块
- [ ] 操作结果预测（点击按钮→预测下一个屏幕状态）
- [ ] 多步规划（3-5 步前瞻）
- [ ] 预测置信度评分

**Phase 3:** OUV 反思引擎增强
- [ ] 结构化反思输出（issue/lesson/correction）
- [ ] 反思结果写入向量库
- [ ] 跨会话反思积累

**Phase 4:** 端到端验证
- [ ] 10 轮自主训练（R21-R30）
- [ ] 真实操作成功率目标 >70%
- [ ] 多应用覆盖验证

---

### 26w15aD — LLM 推理优化（OLB）

**目标：** 提升 LLM 推理质量和速度

**Phase 0:** 论文调研与方案选型
- [ ] 搜索 LLM 推理加速论文
- [ ] 评估 speculative decoding、KV cache 优化等方案
- [ ] 选定技术路线

**Phase 1:** Structured Output 增强
- [ ] 已有模块优化（format:json 可靠性）
- [ ] 多模型 JSON 兼容性矩阵
- [ ] 输出校验与自动修复

**Phase 2:** 推理加速实现
- [ ] 多线程思考（并行生成多个候选）
- [ ] 异步算力分配
- [ ] 模型预热与缓存

**Phase 3:** 基准测试
- [ ] 推理速度对比（优化前后）
- [ ] 输出质量对比
- [ ] 资源占用对比

---

### 26w15aE — 用户请求链路革新

**目标：** 从 localhost 空白页升级为可交互的 Web UI

**Phase 0:** Web UI 框架选型
- [ ] 评估 React/Vue/Svelte
- [ ] 确定 UI 设计规范（参考豆包/阶跃 AI）

**Phase 1:** 核心 UI 实现
- [ ] 对话式交互界面（输入框+消息流）
- [ ] 任务执行实时日志
- [ ] 截图预览面板

**Phase 2:** 高级功能
- [ ] 任务历史浏览
- [ ] 模型切换/配置
- [ ] Agent 状态监控

**Phase 3:** HTN 任务规划可视化
- [ ] 任务分解树形图
- [ ] 子任务状态实时更新
- [ ] 执行路径回放

---

### 26w15aF — OxygenBrowser + 多模态工具链

**目标：** 完整的浏览器应用 + 文件系统感知

**Phase 0:** 浏览器 UI 框架
- [ ] 选型：Electron/Tauri/WinUI
- [ ] 基础窗口+标签页管理

**Phase 1:** 浏览器核心功能
- [ ] 地址栏+导航+前进后退
- [ ] Cookie/扩展同步（Edge/Chrome）
- [ ] 多标签页+标签组
- [ ] 多 UA 切换

**Phase 2:** Agent 集成
- [ ] CSS 选择器 + UIA 混合定位
- [ ] JS 事件监听与模拟
- [ ] OSR 内置（浏览时自动训练 OUV）
- [ ] AI 实时建议浮层

**Phase 3:** 文件系统感知
- [ ] 本地文件浏览器
- [ ] 实时扫盘+索引
- [ ] 文件变更通知

**Phase 4:** 全栈 Windows 生态
- [ ] UWP 应用控制
- [ ] WSL2 集成
- [ ] 硬件信息读取

---

### 26w15aG — 安全沙箱 + 插件生态

**目标：** 安全隔离 + 插件开发体验

**Phase 0-1:** 安全沙箱强化
- [ ] 插件隔离沙箱（V8 Isolate）
- [ ] 数据流隔离（插件间不可直接访问）
- [ ] 安全审计日志增强

**Phase 2-3:** 插件生态
- [ ] 预构建连接器（GitHub/Slack/Notion/飞书）
- [ ] 插件测试脚手架
- [ ] 插件包管理器（npm 风格）

---

### 26w15aH — 桌面客户端 + 发布准备

**目标：** Windows 桌面应用 + 生产就绪

**Phase 0-1:** 桌面客户端
- [ ] WinUI/Tauri 桌面应用
- [ ] 系统托盘+快捷键唤起
- [ ] GitHub 登录集成
- [ ] QuickStart 引导流程

**Phase 2:** 发布准备
- [ ] 杀毒兼容测试
- [ ] 数字签名
- [ ] 自动更新机制

**Phase 3:** 全版本回归测试
- [ ] 26w11a-26w15a 全功能验证
- [ ] Release 包构建+安装测试
- [ ] 性能基准发布

---

## 26w16a+ 远期规划

| 版本 | 主题 | 关键功能 |
|------|------|---------|
| 26w16a | 远程部署 | OxygenServer、OpenTelemetry 追踪 |
| 26w17a | 高级 AI | RLHF 轻量版、分布式执行 |
| 26w18a-25a | 生态扩展 | 低代码编辑器、P2P 加速、自动翻译 |
| 26w26a | 最终发布 | 全版本兼容、OxygenCloud 预留 |

---

## 技术栈总览

| 层级 | 技术 | 状态 |
|------|------|------|
| Native | Rust (NAPI-RS) | ✅ 已有 |
| Runtime | Node.js 22+ (ESM) | ✅ 已有 |
| 持久化 | SQLite (WAL) + 向量量化 | ✅ 已有 |
| LLM | Ollama (qwen3:4b, gpt-oss:20b, qwen3-vl:4b) | ✅ 已有 |
| 浏览器 | Chromium CDP → OxygenBrowser (Tauri/Electron) | 🚧 框架 |
| UI | Web (React/Svelte) → Desktop (WinUI/Tauri) | 📋 计划 |
| 测试 | vitest + 自定义 E2E | 🚧 部分 |

---

*本文档为 OpenOxygen 项目的唯一权威路线图，后续开发以此为准。*
