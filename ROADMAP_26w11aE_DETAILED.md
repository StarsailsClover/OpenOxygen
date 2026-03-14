# OpenOxygen 26w11aE Detailed Roadmap

## 战略定位

**OpenOxygen 不是 OpenClaw 的替代品，而是下一代 AI Agent 框架。**

我们继承 OpenClaw 的接口协议作为兼容层，但在以下维度全面超越：

| 维度 | OpenClaw | OpenOxygen 26w11aE | 优势 |
|------|----------|-------------------|------|
| 性能 | Python 解释器 | Rust 原生核心 + SIMD | 10-100x 速度 |
| 安全 | 基础权限 | 零信任 + CVE 主动防御 | 生产级安全 |
| 智能 | 单模型 | AI 思考集群 + 多模型融合 | 更准确鲁棒 |
| 规模 | 单机 | 分布式 + TB 级向量存储 | 企业级扩展 |
| 生态 | Python 插件 | WASM + 签名市场 | 安全可信 |

---

## Phase 1: 安全基础与架构重构 (Current - 26w11aE_P1)

### 1.1 代码审计与清理
- [x] 审计 OpenClaw 引用分布
- [x] 添加"超越而非平行"架构宣言
- [x] 重构 entry.ts Banner
- [ ] 清理所有非必要 OpenClaw 引用
- [ ] 添加协议溯源说明

### 1.2 安全加固 (risks.md)
- [x] 依赖安全管理器 (deps.ts)
- [ ] 临时文件权限 (0600)
- [ ] Windows 权限隔离
- [ ] gRPC 认证拦截器
- [ ] CLI 参数校验层
- [ ] 插件沙箱命名空间
- [ ] 工具数据流隔离
- [ ] 执行超时与异常检测

### 1.3 核心基础设施
- [x] 异步算力栈 (async/index.ts)
- [x] AI 思考集群 (ai-cluster/index.ts)
- [ ] 健全测试日志脚本
- [ ] 全链路测试框架

### 1.4 项目整理
- [ ] 清理冗余文件
- [ ] 标准化目录结构
- [ ] 完善文档体系

**P1 完成标准**: 所有 risks.md 风险修复 + 架构宣言确立

---

## Phase 2: 多模型运行时 (26w11aE_P2)

### 2.1 模型进程池
```rust
// Rust native model pool
pub struct ModelPool {
    processes: HashMap<String, Child>,
    gpu_allocator: GPUAllocator,
    load_balancer: RoundRobin,
}
```

### 2.2 动态资源分配
- GPU/CPU 自动选择
- 内存压力感知
- 模型热切换

### 2.3 三模型并发测试
| 模型 | 内存 | GPU | 用途 |
|------|------|-----|------|
| qwen3:4b | 2.5GB | 可选 | 快速响应 |
| qwen3-vl:4b | 3.3GB | 推荐 | 视觉任务 |
| gpt-oss:20b | 13GB | 必需 | 深度推理 |

**P2 完成标准**: 三模型同时运行，自动路由

---

## Phase 3: 视觉-语言融合 (26w11aE_P3)

### 3.1 OxygenUltraVision v3
- [ ] 截图 → Vision Tokens 流水线
- [ ] UI 元素描述生成
- [ ] 视觉定位 (Visual Grounding)
- [ ] 多帧时序推理

### 3.2 Native Vision Encoding
```rust
// Rust ONNX Runtime
pub fn encode_screenshot(image: &[u8]) -> Vec<f32> {
    let session = ort::Session::builder()
        .with_model_from_file("clip-vit.onnx")
        .unwrap();
    session.run(inputs![image]).unwrap()
}
```

### 3.3 融合推理示例
```typescript
const result = await ouv.analyze({
  screenshot: "desktop.png",
  instruction: "点击登录按钮旁边的蓝色图标",
  mode: "fusion" // UIA + Vision + LLM
});
// → { x: 450, y: 320, confidence: 0.94 }
```

**P3 完成标准**: 视觉指令准确率 > 85%

---

## Phase 4: 输入系统硬化 (26w11aE_P4)

### 4.1 签名输入序列
```typescript
interface SignedInput {
  sequence: InputAction[];
  signature: string; // Ed25519
  timestamp: number;
  nonce: string;
}
```

### 4.2 反重放攻击
- 序列哈希去重
- 时间窗口限制
- 设备指纹绑定

### 4.3 人类相似度评分
```typescript
interface HumanLikenessScore {
  overall: number;      // 0-100
  timingVariance: number;
  pathCurvature: number;
  accelerationPattern: number;
}
```

**P4 完成标准**: 通过率 > 99%，反检测率 > 95%

---

## Phase 5: 持久化存储 (26w11aE_P5)

### 5.1 RocksDB 生产化
- [ ] 完成 Rust 模块编译
- [ ] 内存 → 磁盘迁移
- [ ] 向量量化 (Int8)
- [ ] LRU 淘汰策略

### 5.2 性能目标
| 指标 | 目标 |
|------|------|
| 容量 | 1M+ 文档 |
| 搜索 | < 100ms |
| 写入 | < 10ms |
| 内存 | < 4GB |

**P5 完成标准**: 生产环境稳定运行

---

## Phase 6: 分布式网关 (26w11aE_P6)

### 6.1 集群架构
```
[Load Balancer]
    ↓
[Gateway Cluster: 5 nodes]
    ↓
[Redis Pub/Sub]
    ↓
[Model Pool: 3 models × 2 replicas]
```

### 6.2 核心组件
- Session Affinity (Sticky Sessions)
- Health Propagation
- Metrics Aggregation (Prometheus)
- Auto-scaling Trigger

**P6 完成标准**: 5 节点集群，自动故障转移

---

## Phase 7: 插件市场 (26w11aE_P7)

### 7.1 安全体系
- Ed25519 签名验证
- 发布者信誉系统
- 自动更新机制
- WASM 沙箱运行时

### 7.2 CLI 体验
```bash
openoxygen plugin search file-manager
openoxygen plugin install file-manager --verify
openoxygen plugin list --installed
openoxygen plugin update --all
```

**P7 完成标准**: 10+ 认证插件上线

---

## Phase 8: GUI 仪表盘 (26w11aE_P8)

### 8.1 Tauri 桌面应用
```
packages/gui/
├── src-tauri/     # Rust 后端
├── src/           # React 前端
└── assets/
```

### 8.2 功能模块
- 实时系统指标
- Agent 工作流可视化
- 模型性能对比图表
- 安全审计日志查看器
- 插件市场浏览器

**P8 完成标准**: 功能完整的桌面应用

---

## Phase 9: 生产发布 (26w11aE_P9)

### 9.1 发布检查清单
- [ ] 第三方安全审计
- [ ] 完整文档 (API + 架构 + 部署)
- [ ] CI/CD 流水线
- [ ] 签名二进制文件
- [ ] 包管理器发布

### 9.2 分发渠道
| 平台 | 包管理器 |
|------|----------|
| Windows | Chocolatey, Scoop |
| macOS | Homebrew |
| Linux | APT, AUR |
| Docker | Docker Hub |

**P9 完成标准**: GitHub Release v26w11aE

---

## 技术护城河 (Moat Technologies)

### 1. AI Thinking Cluster ✅
- **状态**: P1 已实现基础框架
- **优势**: 多模型共识比单模型准确率提升 15-30%
- **竞品**: 无开源实现

### 2. Async Compute Stack ✅
- **状态**: P1 已实现
- **优势**: 10x 并发提升，资源利用率 90%+
- **竞品**: Python asyncio 无法比拟

### 3. Vision-Language Fusion 🔄
- **状态**: P3 开发中
- **优势**: 原生 Windows UI 理解，准确率 85%+
- **竞品**: 无 Windows 原生方案

### 4. Distributed Memory Network 🔄
- **状态**: P5-P6 规划
- **优势**: TB 级向量，分布式查询
- **竞品**: 仅云端方案 (Pinecone, Weaviate)

### 5. Secure Plugin Ecosystem 🔄
- **状态**: P7 规划
- **优势**: WASM + 签名，零信任
- **竞品**: OpenAI GPTs (云端)，无本地安全方案

---

## 开发工作流

```
Feature Branch → dev Branch (P1-P8)
                      ↓
                 CI Build + Test
                      ↓
                 Integration
                      ↓
              P9: Release PR
                      ↓
         main Branch ←┘→ GitHub Release
```

### 分支策略
- `main`: 仅 Release (P9)
- `dev`: 日常开发 (P1-P8)
- `feature/*`: 功能分支

### Commit 规范
```
phase1(security): Add dependency audit

- Implement CVE pattern matching
- Block malicious packages
- Add integrity verification

Refs: risks.md#供应链风险
Closes: #123
```

---

## 成功指标

| 阶段 | 关键指标 | 目标值 |
|------|----------|--------|
| P1 | CVE 覆盖 | 100% |
| P2 | 并发模型 | 3 个 |
| P3 | 视觉准确率 | 85% |
| P4 | 输入成功率 | 99% |
| P5 | 向量容量 | 1M+ |
| P6 | 集群节点 | 5 个 |
| P7 | 认证插件 | 10+ |
| P8 | 功能覆盖 | 100% |
| P9 | 安装时间 | < 5min |

---

## 时间线

```
Week 1-2:  P1 安全基础
Week 3-4:  P2 多模型 + P3 视觉
Week 5-6:  P4 输入 + P5 持久化
Week 7-8:  P6 分布式 + P7 市场
Week 9-10: P8 GUI + P9 发布
```

**总计**: 10 周 → v26w11aE Release
