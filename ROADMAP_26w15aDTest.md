# OpenOxygen 26w15aDTest 测试路线图

**版本**: 26w15aDTest  
**目标**: 真实 LLM 集成 + 完整流程测试  
**基于**: 26w15aB-26w15aHRoadmap.md 流程图  
**状态**: 进行中

---

## 测试目标

1. **真实 LLM 集成**: Ollama 本地模型
2. **完整流程测试**: 用户请求 → 意图识别 → 任务分解 → 执行 → 反思
3. **双浏览器测试**: OxygenBrowser + Microsoft Edge
4. **全量功能验证**: 25项核心功能

---

## 测试流程 (基于 26w15aB-26w15aHRoadmap.md)

```
用户输入
    ↓
[输入层] 全局快捷键 / 系统托盘 / 剪贴板监听
    ↓
[意图识别] LLM 分析用户意图
    ↓
[任务路由] Terminal / GUI / Browser / Multi-Agent
    ↓
[任务分解] 反思引擎分解任务
    ↓
[执行层]
    ├── Terminal: PowerShell/CMD 执行
    ├── GUI: UIA + OSR 录制回放
    ├── Browser: OxygenBrowser / Edge + CDP + OUV
    └── Multi-Agent: 任务委派 + 断点续传
    ↓
[反思层] 结果验证 + 错误处理 + 自动重试
    ↓
[输出层] 通知 / 进度推送 / 结果可视化
    ↓
[记忆层] Global Memory + OUV 向量数据库
```

---

## 测试套件结构

### 测试 1: LLM 集成测试
- [ ] Ollama 本地模型连接
- [ ] 意图识别准确率
- [ ] 任务分解质量

### 测试 2: 完整流程测试
- [ ] 用户请求处理流程
- [ ] 任务执行流程
- [ ] 反思与重试流程

### 测试 3: 双浏览器测试
- [ ] OxygenBrowser 功能测试
- [ ] Microsoft Edge 功能测试
- [ ] 浏览器切换测试

### 测试 4: 全量功能测试
- [ ] 25项核心功能逐一验证

---

## 验收标准

- [ ] LLM 集成正常
- [ ] 流程执行无错误
- [ ] 双浏览器兼容
- [ ] 功能覆盖率 100%
