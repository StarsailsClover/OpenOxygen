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

### Round 5 Scaled Training — 10 Tasks (26w13a-training-r5.mjs)

**7/10 success, 3/10 partial — best round, largest scale**

- **T1 计算器: ✅** (26.7s) — Win键→搜索→打开→123+456=579→Alt+F4 完美闭环
- **T2 Bilibili VLM: ⚠️** (47.8s) — URL搜索到达但 VLM 返回空（Ollama 偶发超时）
- **T3 Gmail: ✅** (42.8s) — 收件箱→打开邮件→读取内容→返回
- **T4 VS Code: ⚠️** (48.0s) — 代码粘贴成功但保存对话框处理仍有边界情况
- **T5 微信: ✅** (8.0s) — 24 UIA 元素，VLM 完整描述界面布局（联系人/聊天/搜索）
- **T6 Steam: ✅** (7.6s) — VLM 识别下载页面，Counter-Strike 2 可见
- **T7 百度: ⚠️** (39.0s) — 搜索结果页加载但 VLM 坐标提取失败
- **T8 豆包: ✅** (89.0s) — 3轮深度技术对话 + gpt-oss:20b 评估
- **T9 系统快捷键: ✅** (29.1s) — Alt+Tab(10窗口)、Win+Tab(任务视图)、Win+D(桌面) 全部成功
- **T10 文件管理器: ✅** (16.3s) — Win+E→导航到test文件夹→VLM确认文件列表→关闭

**New apps covered: 计算器, 微信(WeChatAppEx.exe), Steam(steamwebhelper.exe), 文件资源管理器**
**Memory: 29 experiences, 11 apps, 44 element types**

### Round 4 VLM-Driven Training (26w13a-training-r4.mjs)

**Breakthrough: qwen3-vl:4b real screenshot analysis integrated.**

- VLM `/no_think` mode: 5s per screenshot analysis, accurate element identification
- `vlmAnalyze`: screenshot → base64 → qwen3-vl → description
- `vlmLocate`: VLM returns pixel coordinates for web elements (UIA can't see)
- `vlmVerify`: screenshot → VLM confirms operation success/failure
- Win key fix: `win+d` (show desktop) → `win` (open start menu) — solves focus issue
- Strict window isolation: `cleanSlate()` closes all browsers before each task

**Results: 3/5 success, 2/5 partial (best round yet)**
- **T1 系统搜索: ✅ success** (33.6s) — Win键→搜索→记事本→写入→Ctrl+S→Alt+F4 完整闭环
- **T2 Bilibili VLM: ⚠️ partial** — VLM 正确识别首页布局但坐标提取不稳定，URL 搜索 fallback 到了错误页面
- **T3 Gmail: ✅ success** (33.4s) — VLM 判断登录状态→用户接管→收件箱→打开邮件→读取主题
- **T4 VS Code: ⚠️ partial** — 保存对话框仍然干扰（VS Code 打开了旧的保存对话框而非新文件）
- **T5 豆包3轮对话: ✅ success** (78.8s) — 3轮深度对话 + gpt-oss:20b 评估

**Memory: 19 experiences, 7 apps, 44 element types**

### Round 3 Deep Training (26w13a-training-r3.mjs)

**Architecture upgrades:**
- Multi-AI collaboration: `fastThink` (qwen3:4b) + `deepThink` (gpt-oss:20b) + `clusterThink` (3-phase)
- `verifyAndRetry`: 操作后验证结果，失败自动重试（最多3次）
- `locateWebElement`: 浏览器内元素用 LLM 集群推理坐标（UIA 只能看到浏览器框架，看不到网页内容）
- `sanitize`: 手机号/邮箱/银行卡/身份证自动脱敏
- VS Code 代码整块剪贴板粘贴（避免自动补全干扰）
- 系统快捷键：Win键打开开始菜单、Alt+F4关闭、Ctrl+S保存

**Task results:**
- **T1 系统搜索**: fail — Win键发送成功但开始菜单未在截图中显示，记事本未打开（可能是焦点问题）
- **T2 Bilibili 深度**: partial — URL 直接搜索方式可行，但 navigateTo 输入被之前的内容干扰，最终到达了错误的视频页
- **T3 Gmail**: partial — Gmail 页面未加载（前序 bilibili 视频页仍在前台），反思引擎正确识别了问题
- **T4 VS Code**: partial — 保存对话框仍有问题（VS Code 的保存对话框与 Notepad 不同）
- **T5 豆包深度对话**: **success** — 2轮深度对话成功！豆包回复"看屏幕操作软件是AI Agent最难落地的场景"

**Key discovery: UIA 无法看到网页内容**
- Chrome UIA 只暴露浏览器框架控件（标签栏、地址栏、任务栏搜索按钮）
- bilibili/百度等网页内的搜索框、按钮、链接对 UIA 完全不可见
- 必须用 VLM 视觉定位或 URL 直接导航方式操作网页
- "游戏中心" bug 原因：UIA 匹配"搜索"时命中了 Windows 任务栏的 SearchButton(y=1112)，不是 bilibili 页面内元素

**Memory: 14 experiences, 6 apps, 44 element types**

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
