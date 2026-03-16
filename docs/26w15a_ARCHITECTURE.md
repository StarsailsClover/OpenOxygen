# OpenOxygen 26w14a 新功能架构

## 26w14a_Phase_1: 终端操作模块 (Terminal Executor)

### 功能概述
让 OpenOxygen 能像人类开发者一样使用终端执行操作。

### 核心能力
- **持久会话**：环境变量、工作目录跨命令保留
- **多 Shell 支持**：PowerShell、CMD、WSL Bash
- **安全执行**：命令黑名单/白名单、危险模式检测
- **流式输出**：实时捕获 stdout/stderr
- **结构化解析**：输出提取为结构化数据

### 使用场景
```typescript
// 创建终端会话
const session = createSession("powershell");

// 执行命令序列
const result = await executeSequence(session.id, [
  "cd D:\\Projects",
  "npm install",
  "npm run build",
]);

// 快速执行（无会话）
const result = await quickExec("git status", "powershell");
```

### 与 GUI 的协作决策
- **终端优先**：代码编译、包管理、文件操作、Git 操作
- **GUI 优先**：视觉验证、人机验证、界面审美判断
- **混合模式**：不确定时先尝试终端，失败回退 GUI

---

## 26w14a_Phase_2: OxygenBrowser 引擎

### 功能概述
内嵌 Chromium 浏览器，提供 CSS 选择器访问和 Cookie 继承。

### 核心能力
- **CSS/XPath 选择器**：精准定位网页元素
- **Cookie 继承**：从系统 Edge/Chrome 继承登录态
- **CDP 协议**：完整 DevTools 协议支持
- **混合定位**：CSS → UIA → VLM 坐标多级 fallback
- **无痕模式**：可选不继承 Cookies

### 架构设计
```
┌─────────────────────────────────────────┐
│  User Instruction                        │
│     ↓                                   │
│  Task Router                             │
│     ↓                                   │
│  OxygenBrowser (Chromium) ←── Cookies   │
│     ↓                                   │
│  Primary: CSS Selector                   │
│  Fallback 1: XPath                       │
│  Fallback 2: UIA (Native)              │
│  Fallback 3: VLM 视觉定位                │
│     ↓                                   │
│  Execute (click/type/scroll)            │
└─────────────────────────────────────────┘
```

### Cookie 继承流程
1. 检测系统浏览器（Edge/Chrome）
2. 复制 Cookies 数据库
3. 启动 Chromium 指定 User Data Dir
4. 可选：同步其他状态（Local Storage、Session Storage）

### 与外部浏览器的关系
- **OxygenBrowser**：首选，CSS 选择器精准定位
- **系统 Chrome/Edge**：备选，UIA+VLM 混合定位
- **无缝切换**：用户无感知，自动选择最优方案

---

## 26w14a_Phase_3: 统一任务执行器 (Unified Executor)

### 功能概述
自动选择 Terminal/GUI/Browser/Hybrid 执行模式。

### 决策流程
```
User Instruction
    ↓
Task Analyzer (Keyword + LLM)
    ↓
├─ Terminal ──→ 代码/文件/系统命令
├─ Browser ───→ 网页操作
├─ GUI ───────→ 视觉界面操作
└─ Hybrid ────→ 不确定时混合尝试
    ↓
Environment Check
    ↓
Strategy Execution
    ↓
Success? ──Yes──→ Done
    ↓ No
Auto Fallback
```

### 决策权重
| 关键词 | 终端权重 | GUI 权重 | 浏览器权重 |
|--------|---------|---------|-----------|
| npm/git/docker | 10 | 1 | 0 |
| 编译/构建/部署 | 10 | 2 | 0 |
| 文件操作 | 8 | 3 | 0 |
| Chrome/网页/搜索 | 0 | 2 | 10 |
| 验证码/人机验证 | 0 | 10 | 5 |
| 界面美观/颜色 | 0 | 10 | 0 |

### 示例决策
```
输入: "在 Chrome 中搜索 OpenOxygen"
分析: 包含 "Chrome" → Browser (weight: 10)
      包含 "搜索" → Browser (weight: +2)
结果: Browser 模式, confidence: 0.95

输入: "npm install && npm run dev"
分析: 包含 "npm" → Terminal (weight: 10)
      包含 "run" → Terminal (weight: +3)
结果: Terminal 模式, confidence: 0.95
```

---

## 文件结构

```
src/execution/
├── terminal/
│   └── index.ts      # 终端执行器
├── browser/
│   └── index.ts      # OxygenBrowser 引擎
├── unified/
│   └── index.ts      # 统一任务执行器
├── vision/
│   ├── index.ts      # VLM 视觉分析
│   └── fusion.ts     # 多源融合
├── windows/
│   └── index.ts      # Windows 系统控制
└── sandbox/
    └── index.ts      # 安全沙箱
```

---

## TODO

### Phase 1: Terminal
- [ ] 持久会话管理
- [ ] 安全命令白名单
- [ ] 流式输出捕获
- [ ] 输出结构化解析
- [ ] 与 Task Router 集成

### Phase 2: OxygenBrowser
- [ ] Chromium 启动管理
- [ ] CDP 客户端封装
- [ ] Cookie 继承实现
- [ ] CSS 选择器定位
- [ ] 多级 fallback 策略
- [ ] 与 Native UIA 融合

### Phase 3: Unified
- [ ] Task Analyzer LLM prompt
- [ ] 决策权重调优
- [ ] 自动 fallback 机制
- [ ] 执行监控和日志
- [ ] 性能对比指标收集

---

## 技术难点

1. **Chromium 嵌入**：需要管理浏览器进程生命周期
2. **Cookie 继承**：SQLite 数据库格式兼容
3. **CDP 协议**：完整封装所有必要方法
4. **多模式协调**：避免模式间冲突和状态不一致
5. **LLM 决策延迟**：需要缓存常见决策结果
