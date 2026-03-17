# OpenOxygen 26w15a 开发路线图

**版本**: 26w15a  
**目标**: 全局上下文 + Agent 协调  
**预计周期**: 3-5 天

---

## Phase 1: 全局记忆系统 (Global Context)

### 目标
让 Agent 能够记住跨会话、跨任务的用户偏好和历史操作。

### 功能
- [ ] 用户偏好存储（工作目录、常用命令、喜欢的模型）
- [ ] 任务历史索引（按应用、按时间、按类型）
- [ ] 快速检索（"上次在 VS Code 做了什么？"）
- [ ] 上下文自动注入（新任务自动带上相关历史）

### 技术方案
```typescript
// SQLite 表结构
CREATE TABLE user_preferences (
  key TEXT PRIMARY KEY,
  value JSON,
  updated_at INTEGER
);

CREATE TABLE task_history (
  id TEXT PRIMARY KEY,
  instruction TEXT,
  mode TEXT, -- terminal/gui/browser
  success BOOLEAN,
  duration_ms INTEGER,
  created_at INTEGER
);

CREATE TABLE context_index (
  task_id TEXT,
  app TEXT,
  keywords TEXT[],
  FOREIGN KEY (task_id) REFERENCES task_history(id)
);
```

---

## Phase 2: 多 Agent 通信协议

### 目标
支持多个 Agent 实例协同工作，任务委派。

### 功能
- [ ] Agent 注册与发现
- [ ] 任务委派 API（"Agent B，帮我检查这个网页"）
- [ ] 结果聚合（多个 Agent 的结果合并）
- [ ] 负载均衡（任务分配给空闲 Agent）

### 技术方案
```typescript
// Agent 消息协议
interface AgentMessage {
  type: "delegate" | "result" | "heartbeat";
  from: string; // Agent ID
  to: string;   // Target Agent ID or "broadcast"
  taskId?: string;
  payload: unknown;
  timestamp: number;
}
```

---

## Phase 3: 任务委派与结果聚合

### 目标
复杂任务自动拆分子任务，分配给不同 Agent。

### 功能
- [ ] 任务分解（"部署项目" → [构建, 测试, 部署]）
- [ ] 并行执行（子任务同时运行）
- [ ] 结果聚合（合并子任务结果）
- [ ] 失败重试（单个子任务失败可重试）

### 示例
```typescript
const task = {
  instruction: "部署 OpenOxygen 项目",
  subtasks: [
    { instruction: "npm run build", mode: "terminal" },
    { instruction: "npm test", mode: "terminal" },
    { instruction: "复制到部署目录", mode: "terminal" },
  ],
  parallel: false, // 顺序执行
  retry: 1,
};
```

---

## 验收标准

- [ ] 用户偏好跨会话持久化
- [ ] 任务历史可检索（应用/时间/关键词）
- [ ] 多 Agent 消息通信正常
- [ ] 任务委派和结果聚合工作
- [ ] 复杂任务自动分解示例运行成功

---

## 依赖

- 26w14a Terminal Executor（用于子任务执行）
- 26w14a Unified Executor（用于模式选择）
- SQLite 持久化（已有）

---

## 风险

| 风险 | 缓解措施 |
|------|---------|
| 多 Agent 并发冲突 | 使用事务锁 |
| 消息丢失 | 实现 ACK 机制 |
| 任务分解不准确 | LLM 辅助 + 人工确认 |
