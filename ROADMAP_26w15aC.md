# OpenOxygen 26w15aC 开发路线图 (重构版)

**基于 2603141948.md (人类规划) + 26w15aB-26w15aHRoadmap.md (Agent规划) + 代码审查**

**当前版本**: 26w15aB (dev 分支)  
**目标版本**: 26w15aC  
**状态**: 规划中

---

## 一、项目文件整理 (已完成)

### 1.1 文档分类

| 文件 | 原位置 | 新位置 | 状态 |
|------|--------|--------|------|
| ROADMAP_26w11aE.md | 根目录 | docs/archive/ | 归档 |
| ROADMAP_26w15a.md | 根目录 | docs/archive/ | 归档 |
| ROADMAP_FULL.md | 根目录 | docs/ROADMAP.md | 更新 |
| 26w15aB-26w15aHRoadmap.md | 根目录 | 保留根目录 | 开发参考 |
| 2603141948.md | 根目录 | 保留根目录 | 核心规划 |
| AgentLOG.md | 根目录 | 保留根目录 | 加入 .gitignore |
| CHANGELOG.md | 根目录 | 保留根目录 | 持续更新 |

### 1.2 Git 状态
- 当前分支: `dev`
- 待提交: `.gitignore` 修改 (AgentLOG.md 加入忽略)
- 建议: 提交整理后的文件结构

---

## 二、26w15aB 实际完成状态 (基于代码审查)

### ✅ 已完成 (可信)
| 功能 | 测试状态 | 备注 |
|------|----------|------|
| Global Memory System | 15/15 ✅ | SQLite 持久化, 上下文注入 |
| Terminal Executor | 10/10 ✅ | PowerShell/CMD 双支持 |
| Unified Executor (基础) | 7/8 ✅ | 策略路由, GUI测试需native模块 |
| Task Orchestrator | 21/23 ✅ | 任务分解, 91.3%通过率 |

### ⚠️ 部分完成/存在问题
| 功能 | 状态 | 问题 |
|------|------|------|
| Native Bridge | ⚠️ | ESM/CJS 兼容性问题 |
| GUI 测试 | ⚠️ | 依赖 native 模块, 使用 fallback |
| OxygenBrowser | ⚠️ | 1/3 missions pass (基于 git log) |
| Agent 通信协议 | ⚠️ | 空壳实现, 需完善 |
| Vitest 测试框架 | 🔴 | 不识别自定义 test() 格式 |

### 🔴 版本号混乱
| 文件 | 声明版本 | 实际状态 |
|------|----------|----------|
| package.json | 26w13aB | 过时 |
| openoxygen.json | 26w14a | 过时 |
| git log | 26w15aB | 最新 |

---

## 三、26w15aC 开发范围 (修正版)

### P0: 修复阻塞问题 (必须完成)

#### 3.1 版本号统一
- [ ] 更新 package.json → 26w15aC
- [ ] 更新 openoxygen.json → 26w15aC
- [ ] 创建 git tag: 26w15aC_Phase0

#### 3.2 Native Bridge 修复
- [ ] 修复 ESM/CJS 兼容性问题
- [ ] 简化加载逻辑 (移除冗余 fallback)
- [ ] 添加加载失败详细日志

#### 3.3 测试框架迁移
- [ ] 迁移 global-memory.test.mjs → Vitest 标准格式
- [ ] 迁移 orchestrator.test.mjs → Vitest 标准格式
- [ ] 迁移 terminal-executor.test.mjs → Vitest 标准格式
- [ ] 迁移 unified-executor.test.mjs → Vitest 标准格式
- [ ] 确保 `npm test` 全部通过

### P1: 完善 26w15a 功能 (基于 2603141948.md)

#### 3.4 多 Agent 通信协议 (Phase 2)
- [ ] Agent 注册与发现机制
- [ ] 任务委派 API 实现
- [ ] 结果聚合逻辑
- [ ] 基础负载均衡

#### 3.5 任务委派与结果聚合 (Phase 3)
- [ ] 完善任务分解算法
- [ ] 并行执行支持
- [ ] 失败重试机制 (当前 2/23 测试失败)
- [ ] DAG 依赖执行

#### 3.6 OUV 改进 (基于 26w15aB-26w15aHRoadmap.md)
- [ ] OUV 向量数据库集成
- [ ] OxygenStepRecorder (OSR) 基础实现
- [ ] 视觉记忆优化

### P2: 代码质量 (基于 26w15aB-26w15aHRoadmap.md)

#### 3.7 重构优化
- [ ] 代码结构优化
- [ ] 减少重复代码
- [ ] 错误处理标准化

---

## 四、开发优先级 (基于 2603141948.md 精神)

### 第零优先级: 筑牢基础
1. 版本号统一
2. Native Bridge 修复
3. 测试框架迁移

### 第一优先级: 快速补核心
4. 多 Agent 通信协议
5. 任务委派完善
6. OUV 基础改进

### 第二优先级: 构建技术壁垒
7. OxygenBrowser 稳定化
8. OxygenStepRecorder
9. 代码重构

---

## 五、文件变更计划

### 5.1 移动/归档
```bash
# 归档旧路线图
git mv ROADMAP_26w11aE.md docs/archive/
git mv ROADMAP_26w15a.md docs/archive/

# 更新主路线图
git mv ROADMAP_FULL.md docs/ROADMAP.md
```

### 5.2 更新 .gitignore
```
# Agent Logs
AgentLOG.md
```

### 5.3 提交计划
```bash
# Commit 1: 文件整理
git add .
git commit -m "26w15aC_Phase0: 整理项目文件, 归档旧路线图, 更新.gitignore"

# Commit 2: 版本号统一
git commit -m "26w15aC_Phase1: 统一版本号至 26w15aC"

# Commit 3: Native Bridge 修复
git commit -m "26w15aC_Phase2: 修复 native-bridge ESM/CJS 兼容性"

# Commit 4: 测试框架迁移
git commit -m "26w15aC_Phase3: 迁移测试至 Vitest 标准格式"
```

---

## 六、验收标准

- [ ] 所有版本号一致为 26w15aC
- [ ] `npm test` 全部通过 (无 failed suites)
- [ ] Native 模块可正常加载 (无 fallback warning)
- [ ] Agent 通信协议基础功能可用
- [ ] 文档与代码一致

---

## 七、注意事项

1. **零信任原则**: 所有 Agent 生成的规划需经人类审查
2. **测试驱动**: 每个功能必须有对应测试
3. **文档同步**: 代码变更必须同步更新文档
4. **版本规范**: 严格遵循 26wxxaX_PhaseX 命名规则

---

**创建时间**: 2026-03-19  
**创建者**: StepFun AI Assistant  
**审查状态**: 待人类审查
