# OpenOxygen 中文文档

<div align="center">

**下一代 Windows 原生 AI Agent 框架**

*超越 OpenClaw · 内核级控制 · 多模型融合 · 零信任安全*

[English](../README.md) · [API 参考](API.md) · [路线图](../ROADMAP_26w11aE.md) · [更新日志](../CHANGELOG.md)

</div>

---

## 为什么选择 OpenOxygen？

OpenOxygen 不是 OpenClaw 的分支或封装，而是从零构建的**下一代** AI Agent 框架，在每个维度全面超越：

| | OpenClaw | OpenOxygen |
|---|---------|------------|
| **核心** | Python 解释器 | Rust 原生 + SIMD |
| **速度** | ~500ms 推理 | **21ms** 推理 |
| **视觉** | 基础截图 | 三层融合 (UIA + CV + VLM) |
| **输入** | SendKeys | 签名序列 + 人类相似度评分 |
| **安全** | 基础认证 | 零信任 + CVE 加固 + 审计链 |
| **模型** | 单模型 | 多模型集群 + 共识推理 |

我们保留 OpenClaw 接口兼容以便迁移，但架构完全独立。

### 性能指标

| 指标 | 数值 | 方法 |
|------|------|------|
| 推理往返 | **21 ms** | Gateway → Engine → LLM |
| 屏幕截图 | **85 ms** | Win32 BitBlt (2048×1152) |
| UI 元素检测 | **253 个** | Win32 UI Automation |
| 向量检索 | **14 ms** | SIMD 余弦相似度 (1000×128维) |
| 人类相似度 | **81/100** | 时序 + 运动 + 模式分析 |
| 安全测试 | **47/47** | CVE + 注入 + 重放 |
| 总测试 | **130+** | E2E + 安全 + P1-P4 |

---

## 快速开始

### 环境要求

- **Windows 10/11** (x64)
- **Node.js 22+**
- **Rust 1.82+**（构建原生模块）
- **Ollama**（可选，本地 LLM）

### 安装

```bash
git clone https://github.com/StarsailsClover/OpenOxygen.git
cd OpenOxygen
npm install
npm run build:native    # Rust → .node
npm run build:ts        # TypeScript → dist/
cp .env.example .env
npm start
```

### 本地模型

```bash
ollama pull qwen3:4b        # 2.5GB — 快速查询
ollama pull qwen3-vl:4b     # 3.3GB — 视觉任务
ollama pull gpt-oss:20b     # 13GB  — 深度推理
npm start
```

路由器会根据任务自动选择最优模型。

---

## 核心功能

### OxygenUltraVision 三层视觉引擎

| 层级 | 技术 | 速度 | 准确率 |
|------|------|------|--------|
| 1. UI Automation | Win32 IUIAutomation COM | <50ms | 100%（标准控件）|
| 2. 图像处理 | Rust Sobel + 连通域分析 | <200ms | ~80% |
| 3. 视觉大模型 | qwen3-vl:4b | ~500ms | ~85% |

三层结果融合为统一的 `ScreenAnalysis`，去重后提供精确的交互建议。

### 签名输入序列

```typescript
const mgr = new SignedInputManager({ secretKey: "..." });
const seq = mgr.createSequence([
  { type: "move", params: { x: 400, y: 300 } },
  { type: "click", params: { x: 400, y: 300 } },
]);
// HMAC-SHA256 签名，Nonce 防重放，时间窗口过期
await mgr.execute(seq, executor);
```

### AI 思考集群

多模型共识推理：
- **ThoughtRouter**：将子任务路由到最优模型
- **ConsensusEngine**：加权投票融合多模型输出
- **ReflectionLoop**：迭代反思优化（最多 3 轮）

### 安全体系

| 威胁 | 防御 |
|------|------|
| CVE-2026-25253 (URL 注入) | Query string 剥离，绑定校验 |
| ClawJacked (WS 劫持) | Origin 白名单，速率限制，时序安全认证 |
| 命令注入 | Shell 元字符过滤，命令黑名单 |
| 提示注入 | 三级检测，高风险拦截 |
| 供应链投毒 | SHA-256 完整性，依赖审计 |
| 凭证泄露 | AES-256-GCM 加密，API Key 遮蔽 |
| 输入重放 | Nonce 注册表，HMAC 签名 |
| 鼠标锁定 | 安全守卫，自动释放，紧急停止 |

---

## 开发进度 (26w11aE)

| 阶段 | 状态 | 核心交付 |
|------|------|----------|
| P1: 安全基础 | ✅ | CVE 加固、AI 集群、异步算力栈 |
| P2: 多模型运行时 | ✅ | 三模型配置、动态路由 |
| P3: 视觉语言融合 | ✅ | OUV v2 融合、Tokenizer |
| P4: 输入系统硬化 | ✅ | 签名序列、人类评分、DPI |
| P5: 持久化存储 | 🔄 | RocksDB 向量存储 |
| P6: 分布式网关 | ⏳ | Gateway 集群 |
| P7: 插件市场 | ⏳ | 插件生态 |
| P8: GUI 仪表盘 | ⏳ | 桌面应用 |
| P9: 正式发布 | ⏳ | v26w11aE Release |

---

## API 参考

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/v1/status` | 系统状态 |
| `GET` | `/api/v1/models` | 模型列表 |
| `POST` | `/api/v1/chat` | 对话推理 |
| `POST` | `/api/v1/plan` | 任务规划 |

完整 API 文档见 [API.md](API.md)。

---

## 紧急恢复

如果鼠标/键盘被锁定，参见 [EMERGENCY_RECOVER.md](../EMERGENCY_RECOVER.md)。

---

## 许可证

[MIT](../LICENSE) © 2026 ND-SailsIsHere
