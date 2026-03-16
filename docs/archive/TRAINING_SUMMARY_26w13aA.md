# OpenOxygen 26w13aA — Training Summary

**Version:** 26w13aA  
**Date:** 2026-03-15  
**Status:** ✅ Complete

---

## Overview

26w13aA is a major training-focused release of OpenOxygen, featuring 9 rounds of intensive real-world interaction testing across 26+ applications and websites.

### Key Achievements

| Metric | Value |
|--------|-------|
| Total Training Rounds | 9 (R1-R9) |
| Total Tasks Executed | 111 |
| Visual Memory Entries | 84 experiences |
| Applications Covered | 26 apps |
| Success Rate (Best Round) | 85% (R7) |

---

## Training Evolution

```
Round  Tasks  Success  Key Focus
─────  ─────  ───────  ─────────────────────────
R1     5      0%       Initial exploration, UIA discovery
R2     6      17%      Clipboard CN input, process detection
R3     5      20%      Multi-AI collaboration, system hotkeys
R4     5      60%      VLM screenshot analysis, Win key fix
R5     10     70%      Scaled testing, WeChat, Steam, explorer
R6     15     60%*     Deep interaction, Gmail, QQ, GitHub
R7     20     85%      Autonomous agent, [OpenOxygen] messages
R8     15     40%*     Per-step VLM verification, depth
R9     20     50%      Window management, simulate drag

* R6/R8 measured by deep task completion (3-5 steps per app)
```

---

## Applications Tested

### System Applications (8)
- Calculator (科学模式, 复杂计算链)
- Notepad (查找替换, 格式设置)
- Paint (矩形, 填充, 文字, 保存)
- Settings (显示分辨率)
- Task Manager (性能, 内存排序)
- Resource Monitor (CPU/内存/磁盘/网络)
- Control Panel (程序和功能)
- File Explorer (导航, 多标签, 压缩)

### Browsers & Web (6)
- Chrome (Bilibili, Gmail, 百度, 知乎, GitHub)
- Edge (收藏夹, 历史, 下载, 设置)
- Chrome DevTools (Elements, Console, Network)

### Development Tools (3)
- VS Code (新建, 代码, 运行, 调试, Git)
- GitHub Desktop (仓库状态)
- CMD (批处理, 循环, 管道)

### Communication (4)
- WeChat (界面分析, [OpenOxygen] 消息)
- QQ (群聊, 总结, [OpenOxygen] 消息)
- Doubao (4轮深度对话)
- ChatGPT (对话测试)

### Entertainment & Productivity (5)
- Steam (库, 下载, 游戏)
- WPS (文档, 表格)
- Bilibili (搜索, 播放, 弹幕, 点赞)
- 知乎 (搜索, 阅读, 点赞)
- Gmail (筛选, 撰写, 标记已读)

---

## Technical Breakthroughs

### 1. Visual Memory System
```javascript
// Experience-based spatial memory
{
  id: "r7_1234567890_abc",
  app: "wechat",
  action: { type: "autonomous-send" },
  elements: [{name: "输入框", x: 1200, y: 900}],
  result: "success",
  vlmDescription: "..."
}
```

### 2. Multi-AI Collaboration
- **qwen3:4b**: Fast perception, quick decisions
- **qwen3-vl:4b**: Screenshot analysis, element location
- **gpt-oss:20b**: Deep reasoning, evaluation

### 3. Window Management
```javascript
// Detect and fix off-screen/minimized windows
ensureWindowVisible(title, className, targetX, targetY)
```

### 4. Input Methods
- Clipboard for Chinese text (reliable)
- Direct typeText for English/numbers
- Hotkey sequences for shortcuts

### 5. Screen Recorder Detection
```javascript
detectScreenRecorder() // Finds "制作MP4", OBS, etc.
```

---

## Key Learnings

### What Works
1. **Clipboard input** for Chinese characters
2. **VLM screenshot analysis** for verification
3. **Process-based app detection** (not path guessing)
4. **Window position management** (Win+Left/Right)
5. **Per-step VLM verification** catches errors early

### What Needs Improvement
1. **Mouse drag operations** — native.drag not available
2. **Complex web interactions** — UIA can't see web content
3. **Screen recorder interference** — blocks window detection
4. **Save dialog handling** — varies by application
5. **VLM coordinate extraction** — unstable on complex pages

---

## File Structure

```
D:\Coding\OpenOxygen\
├── test\
│   ├── 26w13a-training.mjs      # R1: Initial 5 tasks
│   ├── 26w13a-training-r2.mjs   # R2: Clipboard fix
│   ├── 26w13a-training-r3.mjs   # R3: Multi-AI
│   ├── 26w13a-training-r4.mjs   # R4: VLM integration
│   ├── 26w13a-training-r5.mjs   # R5: 10 tasks scaled
│   ├── 26w13a-training-r6.mjs   # R6: Deep interaction
│   ├── 26w13a-training-r7.mjs   # R7: Autonomous agent
│   ├── 26w13a-training-r8.mjs   # R8: Per-step verify
│   ├── 26w13a-training-r9.mjs   # R9: Window management
│   ├── 26w13a-p1-browser-compat.mjs  # P1: Browser tests
│   ├── 26w13a-p2-software-compat.mjs # P2: Software tests
│   ├── 26w13a-p3-multi-ai.mjs        # P3: Multi-AI relay
│   ├── 26w13a-p4-network.mjs         # P4: Network tests
│   └── debug-vlm.cjs, debug-uia.cjs  # Debug tools
├── src\agents\skills\
│   └── visual-memory.mjs        # OUV memory system
├── .state\26w13a-r{1-9}\         # Screenshots per round
├── .state\ouv-training\
│   └── visual-memory.json       # 84 experiences
└── test\results\                 # JSON results
```

---

## Next Steps

Based on training results, recommended priorities for next version:

1. **Fix mouse drag** — Implement proper drag using mouseDown/Up when available
2. **Web automation** — Integrate Playwright/Selenium for web content
3. **Recorder handling** — Auto-detect and pause/notify about screen recorders
4. **Dialog management** — Unified save/confirm dialog handler
5. **VLM reliability** — Retry logic, fallback coordinates, confidence scoring

---

## Version History

| Version | Date | Focus |
|---------|------|-------|
| 26w11aE | 2026-03-14 | 9-phase foundation release |
| 26w12aA | 2026-03-14 | Task manager, WebSocket, cancel API |
| **26w13aA** | **2026-03-15** | **Training & compatibility testing** |

---

*Generated by OpenOxygen Agent during 26w13aA development cycle*
