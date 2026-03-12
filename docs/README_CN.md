# OpenOxygen 中文文档

<div align="center">

**Windows 原生 AI Agent 框架**

*内核级系统控制 · 融合推理规划 · OpenClaw 兼容*

</div>

---

## 简介

OpenOxygen 是一个从零构建的 Windows 原生 AI Agent 部署框架。它将 **Rust 原生核心**（Win32 API、SIMD 向量检索、图像处理）与 **TypeScript 应用层**（推理引擎、任务规划、插件系统）结合，让大语言模型能够安全地控制操作系统。

与 [OpenClaw](https://github.com/openclaw/openclaw) 接口兼容——现有的 skills、插件和 LLM 配置可以零代码迁移。

### 核心指标

| 指标 | 数值 |
|------|------|
| 屏幕截图 (2048×1152) | **103 ms** (Win32 BitBlt) |
| 向量检索 (1000 文档) | **< 1 ms** (SIMD) |
| 推理往返 | **~120 ms** (Gateway → LLM → 响应) |
| UI 元素检测 | **181 个元素 < 50ms** (UI Automation) |
| 集成测试 | **42/42 通过** |
| 安全测试 | **47/47 通过** |
| 原生二进制大小 | **6.22 MB** (release + LTO) |

---

## 架构

```
Gateway (:4800)
    │
    ├── 推理引擎 ─── 多模型路由器
    │       │         (OpenAI / Anthropic / Gemini / Ollama / StepFun)
    │       ├── 任务规划器
    │       └── 反思引擎
    │
    ├── 执行层
    │       ├── Windows 控制  ← Rust (Win32 API)
    │       ├── OxygenUltraVision 视觉引擎
    │       │     ├── UI Automation (精确层，标准控件 100% 准确)
    │       │     ├── 图像处理 (快速层，Sobel/连通域/模板匹配)
    │       │     └── 视觉大模型 (理解层，语义级屏幕理解)
    │       └── 沙箱
    │
    ├── 记忆系统
    │       ├── 向量存储  ← Rust (SIMD 余弦相似度)
    │       └── BM25 + 生命周期管理
    │
    └── 安全系统
            ├── 审计日志
            ├── 权限系统 (最小 / 标准 / 提升)
            └── 安全加固 (防 CVE-2026-25253 / ClawJacked 等)
```

---

## 快速开始

### 环境要求

| 工具 | 版本 | 必需 |
|------|------|------|
| Windows | 10/11 x64 | ✅ |
| Node.js | ≥ 22 | ✅ |
| Rust | ≥ 1.82 | 构建原生模块时需要 |
| Ollama | 任意版本 | 本地 LLM 时需要 |

### 安装与运行

```bash
git clone https://github.com/ND-SailsIsHere/OpenOxygen.git
cd OpenOxygen

npm install                    # 安装 JS 依赖
npm run build:native           # 编译 Rust → .node
npm run build:ts               # 编译 TypeScript → dist/

# 配置（编辑模型、网关端口等）
cp .env.example .env

# 启动
npm start
```

网关将在 **http://127.0.0.1:4800** 上监听。

### 验证

```bash
curl http://127.0.0.1:4800/health
# → {"status":"ok","version":"0.1.0"}
```

---

## 使用本地 LLM

```bash
# 1. 安装 Ollama → https://ollama.com
# 2. 拉取模型
ollama pull qwen3:4b

# 3. openoxygen.json 已配置指向 localhost:11434，直接启动即可
npm start
```

无需修改代码，推理引擎会自动检测 Ollama 的 OpenAI 兼容端点。

---

## OxygenUltraVision 视觉引擎

OpenOxygen 的视觉系统采用三层架构：

### 第一层：UI Automation（精确层）

通过 Windows UI Automation COM 接口直接获取所有标准 UI 控件的精确信息：

```javascript
const native = require("@openoxygen/core-native");

// 获取所有 UI 元素（类型、名称、坐标、尺寸、状态）
const elements = native.getUiElements(null);
// → 181 个元素，< 50ms

// 获取鼠标位置处的元素
const elem = native.getElementAtPoint(500, 300);
// → [Button] "确定" @ (480, 290, 80x30)

// 获取当前焦点元素
const focused = native.getFocusedElement();
```

**优势**：100% 准确、零视觉模型开销、支持所有标准 Win32/WPF/UWP 控件。

### 第二层：图像处理（快速层）

Rust 原生实现的高性能图像算法：

- **Sobel 边缘检测** + Otsu 自适应阈值
- **连通域分析** — 自动分类 UI 区域（按钮/输入框/图标/面板）
- **模板匹配** — NCC 归一化互相关 + 非极大值抑制
- **差异检测** — 像素级屏幕变化监控

### 第三层：视觉大模型（理解层）

当 LLM 调用 OUV API 时，系统会：
1. 截取屏幕 → Rust BitBlt (103ms)
2. UI Automation 获取控件树 → 结构化 JSON
3. 图像预处理 → 缩放到适合模型的分辨率
4. 发送给视觉模型 → 语义级理解
5. 融合三层结果 → 精确的交互建议

---

## 安全加固

OpenOxygen 针对 OpenClaw 所有已知漏洞进行了全面防护：

| 漏洞 | CVSS | OpenOxygen 防护 |
|------|------|----------------|
| **CVE-2026-25253** | 9.8 | 禁止外部覆盖 gateway 地址、绑定校验 |
| **ClawJacked** | 高 | Origin 白名单、速率限制、认证失败自动封禁 |
| **CVE-2026-24763** | 高 | 环境变量净化、命令黑名单、shell 元字符过滤 |
| **CVE-2026-25593** | 高 | 三级提示注入检测、高风险请求拦截 |
| **供应链投毒** | 高 | SHA-256 完整性校验、权限声明审计 |
| **凭证明文** | 中 | AES-256-GCM 内存加密、日志遮蔽 |

---

## API 参考

完整 API 文档请参见 [API.md](API.md)。

### 主要端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/v1/status` | 系统状态 |
| `GET` | `/api/v1/agents` | Agent 列表 |
| `GET` | `/api/v1/models` | 模型列表 |
| `POST` | `/api/v1/chat` | 对话推理 |
| `POST` | `/api/v1/plan` | 任务规划 |

### 对话示例

```bash
curl -X POST http://127.0.0.1:4800/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我整理桌面文件","mode":"deep"}'
```

---

## 插件开发

```typescript
import { definePlugin } from "openoxygen/plugin-sdk";

export default definePlugin()
  .setManifest({ name: "my-plugin", version: "1.0.0", entryPoint: "index.js" })
  .addTool({
    name: "greet",
    description: "打招呼",
    parameters: { type: "object", properties: { name: { type: "string" } } },
    execute: async (params) => ({
      success: true,
      output: `你好，${params.name}！`,
      durationMs: 1,
    }),
  })
  .build();
```

---

## OpenClaw 兼容

在 `openoxygen.json` 中添加：

```json
{
  "compat": {
    "openclaw": {
      "enabled": true,
      "configPath": "~/.openclaw/openclaw.json"
    }
  }
}
```

OpenOxygen 会自动转译 OpenClaw 配置、加载其 skills 并适配插件协议。

---

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **原生层** | Rust 1.94 + NAPI-RS | Win32 API、SIMD 向量、图像处理、UI Automation |
| **应用层** | TypeScript 5.7 + Node.js 22 | 推理引擎、Gateway、插件系统 |
| **推理** | OpenAI-compatible API | 多 Provider 统一接口 |
| **安全** | AES-256-GCM + SHA-256 | 凭证加密、完整性校验 |

---

## 路线图

- [x] Rust 原生核心 (Win32, SIMD, 图像, 沙箱)
- [x] 多 Provider 推理引擎
- [x] 任务规划 + 反思循环
- [x] OpenClaw 兼容层
- [x] 安全加固 (47/47 测试通过)
- [x] UI Automation 精确控件检测
- [x] 连通域分析 + 模板匹配
- [ ] WebSocket 流式传输
- [ ] 插件市场
- [ ] GUI 仪表盘
- [ ] macOS / Linux 支持

---

## 许可证

[MIT](../LICENSE) © 2026 ND-SailsIsHere
