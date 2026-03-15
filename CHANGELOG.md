# Changelog

All notable changes to OpenOxygen are documented here.

---

## 26w13aA (2026-03-15) — OUV Training & Compatibility

**Goal-driven training tests with visual memory accumulation.**

### OUV Visual Memory System (NEW)
- `visual-memory.mjs`: Experience-based spatial memory for UI elements
- Records: screenshot path, UIA elements, landmarks, action, result, VLM description, reflection
- 4-level element locator: UIA → Memory → LLM → Ratio fallback
- Per-app indexing with weighted-average position recall
- First training run: 5 experiences, 3 apps (bilibili, vscode, baidu), 25 element types

### Training Test Results (26w13a-training.mjs)
- **T1 Bilibili 搜索并播放视频**: partial — 搜索框定位成功(ratio fallback)，但 typeText 中文输入编码问题导致搜索词未正确输入
- **T2 微信界面探索**: fail — 微信路径检测逻辑 bug（通配符路径 + 注册表查找均失败），需改用 `where.exe` 或 WMI 查询
- **T3 VS Code 新建文件并写代码**: partial — Python 代码成功输入，但保存对话框未正确关闭，影响后续任务
- **T4 百度搜索并点击结果**: partial — 前序任务窗口未关闭导致操作在错误窗口执行
- **T5 Edge 知乎搜索**: partial — 知乎显示登录页，搜索功能不可用

### Key Findings & Lessons
- UIA "搜索" 按钮可能匹配到底部导航栏而非顶部搜索框 → smartLocate 加入位置合理性校验
- `typeText` 中文输入在某些 IME 状态下不可靠 → 需要先切换到英文输入法或使用剪贴板方式
- 任务间窗口状态未隔离 → 每个任务开始前需确认前台窗口正确
- 知乎等需登录网站应标记为 "requires-auth" 并跳过搜索测试
- 视觉记忆系统工作正常，可在后续训练中积累空间经验

### Round 2 Training Results (26w13a-training-r2.mjs)
- **FIX: 中文输入** — clipboardSetText + Ctrl+V 替代 typeText，剪贴板方式可靠
- **FIX: 应用检测** — native.listProcesses() 替代路径猜测，成功检测 QQ/豆包/ChatGPT/VS Code
- **FIX: 用户接管** — PowerShell MessageBox 弹窗，阻塞等待用户操作完成
- **T1 Bilibili**: partial — 搜索成功到达结果页，但 UIA 匹配了 Chrome "搜索标签页" 而非 bilibili 搜索框
- **T2 QQ**: success — 用户接管弹窗成功，54 个 UIA 元素，界面布局完整分析
- **T3 VS Code**: partial — 代码输入被自动补全干扰，保存对话框未关闭影响后续任务
- **T4 百度**: partial — 前序窗口未关闭导致操作在错误窗口
- **T5 知乎**: partial — Edge 空白标签页，知乎未加载
- **T6 豆包**: success (实际) — 消息成功发送，AI 回复了"收到"，但反思引擎返回空
- Visual memory: 10 experiences, 5 apps (bilibili, vscode, baidu, qq, doubao), 44 element types

### Round 2 New Issues Found
- Chrome UIA "搜索标签页" 按钮与网页内搜索框混淆 → 需排除 Chrome 自身控件
- VS Code 自动补全干扰多行代码输入 → 需先禁用或用剪贴板整块粘贴
- 任务间窗口隔离仍不够 → 需在每个任务开始时强制关闭无关窗口/对话框
- LLM 反思引擎偶尔返回空 → 可能是 qwen3:4b thinking 模式消耗了所有 token

### Infrastructure Tests (P1-P4)
- P1 Browser: 12/12 sites pass (Chrome + Edge, 中英文网站)
- P2 Software: 2/2 available pass (Notepad 96 UIA, VS Code 55 UIA), 6 skip
- P3 Multi-AI: 7/7 pass (model relay, checkpoint, interrupt resume)
- P4 Network: 6/7 pass, 1 partial (WebSocket pong timeout)

---

## 26w11aE (2026-03-14) — Release

**9-phase development cycle complete.**

### Phase 1: Security Foundation
- Dependency security manager with CVE pattern matching
- Temporary file security (0600 permissions, AES-256-GCM encryption, 3-pass secure delete)
- Windows privilege isolation (low-priv user, process isolation)
- Async compute stack (ThreadPool, GPU dispatcher, batch execution)
- AI thinking cluster (ThoughtRouter, ConsensusEngine, ReflectionLoop)
- "Beyond OpenClaw" architecture declaration

### Phase 2: Multi-Model Runtime
- 3-model Ollama configuration (qwen3:4b, qwen3-vl:4b, gpt-oss:20b)
- Dynamic model router with complexity-based selection
- Pool-integrated router with direct Ollama API

### Phase 3: Vision-Language Fusion
- OxygenUltraVision v2: 3-layer fusion (UIA + CV + VLM)
- Native VisionTokenizer (Rust JPEG compression + base64)
- Vision-Language fusion pipeline
- Input safety guard (anti-lock, auto-release, emergency stop)
- E2E verified: "打开Chrome并访问bilibili"

### Phase 4: Input System Hardening
- HMAC-SHA256 signed input sequences with nonce anti-replay
- Human-likeness scoring (timing + movement + pattern analysis)
- Multi-monitor DPI awareness with coordinate conversion
- 12/12 tests passing

### Phase 5: Persistent Storage
- SQLite persistence (WAL mode, sessions, audit, vector metadata, model stats, KV store)
- Int8 vector quantization (7.1x compression, <0.02 max error)
- LRU cache with configurable eviction
- 1000 chunks inserted in 83ms, 7829 writes/sec

### Phase 6: Distributed Gateway
- ClusterManager with multi-node process management
- LoadBalancer (round-robin, least-connections, sticky sessions)
- Prometheus-compatible metrics endpoint
- 130 RPS concurrent handling, SQLite shared state

### Phase 7: Plugin Marketplace
- Ed25519 plugin signing and verification
- OpenClaw skills import (9/10 imported from 2420 available)
- Plugin repository with metadata, versioning, and dependency resolution

### Phase 8: Security Hardening
- Gateway: rate limiting, origin validation, timing-safe auth, prompt injection detection
- Security audit report: 12 checks, 10 pass, 2 advisory
- ClawJacked attack mitigation (CVE-2025-XXXX pattern)

### Phase 9: Dashboard & Benchmarks
- Real-time HTML dashboard (system stats, model status, recent events)
- E2E benchmark: 2048x1152 screenshot in 102ms, UIA 77 elements in 45ms
- Full system integration test passing

---

## 26w12aA (2026-03-14) — Development

### P1-P2: Task Manager + Execution Pipeline
- TaskManager with lifecycle (pending → running → completed/failed/cancelled)
- ExecutionPipeline: plan → validate → execute → reflect
- Concurrent task limit with queue management

### P3-P4: Task Cancel API + WebSocket Status
- POST /api/v1/tasks/:id/cancel endpoint
- WebSocket real-time task status updates
- Connection health monitoring with heartbeat
