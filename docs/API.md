# OpenOxygen API Reference (26w15aC)

## 概述

OpenOxygen 提供统一的 API 接口，支持终端命令执行、GUI 自动化、浏览器自动化、任务编排等功能。

## 核心模块

### 初始化

```javascript
import { initialize } from "openoxygen";

const app = await initialize({
  // 配置选项
});

console.log(app.version); // "26w15aC"
```

### 快速执行

```javascript
import { execute } from "openoxygen";

// 自动模式
const result = await execute("npm install");

// 指定模式
const result = await execute("打开哔哩哔哩", { mode: "browser" });
```

## 终端执行

```javascript
import { quickExec, createSession, executeCommand } from "openoxygen";

// 快速执行
const result = await quickExec("ls -la", "powershell");

// 会话模式
const session = createSession("powershell");
const result = await executeCommand(session.id, "echo Hello");
```

## 浏览器自动化

### Gmail

```javascript
import { GmailAutomation } from "openoxygen";

const gmail = new GmailAutomation();

// 检查未读邮件
const { emails, count } = await gmail.checkUnread("user@gmail.com");

// 发送邮件
await gmail.sendEmail({
  to: "recipient@example.com",
  subject: "Hello",
  body: "Message content",
});
```

### 哔哩哔哩

```javascript
import { BilibiliAutomation } from "openoxygen";

const bilibili = new BilibiliAutomation();

// 搜索视频
const result = await bilibili.searchVideo("OpenOxygen");

// 打开视频
const info = await bilibili.openVideo("BV1xx411c7mD");
```

### GitHub

```javascript
import { GitHubAutomation } from "openoxygen";

const github = new GitHubAutomation();

// 检查通知
const notifications = await github.checkNotifications("username");

// 查看仓库
const repo = await github.viewRepository("microsoft", "vscode");
```

## QQ 自动化

```javascript
import { QQWindowController, isQQRunning } from "openoxygen";

// 检查 QQ 是否运行
const running = await isQQRunning();

// 发送消息
const qq = new QQWindowController();
await qq.sendMessage("联系人名称", "消息内容");

// 检查未读
const { unreadCount } = await qq.checkUnread();
```

## 任务编排

### 工作流引擎

```javascript
import { WorkflowEngine, predefinedWorkflows } from "openoxygen";

const engine = new WorkflowEngine();

// 使用预定义工作流
engine.register("daily-check", predefinedWorkflows.dailyCheck);
const result = await engine.execute("daily-check");

// 自定义工作流
engine.register("my-workflow", {
  steps: [
    { name: "step1", type: "terminal", action: "exec", params: { command: "echo 1" } },
    { name: "step2", type: "edge", action: "gmail.check", params: { email: "user@gmail.com" } },
  ],
});

await engine.execute("my-workflow");
```

### 任务分解

```javascript
import { decomposeTask, createOrchestration, executeOrchestration } from "openoxygen";

// 任务分解
const plan = decomposeTask("部署项目到生产环境");
// plan.strategy: "sequential"
// plan.subtasks: [...]

// 创建编排
const orch = createOrchestration({
  name: "部署编排",
  subtasks: plan.subtasks,
  strategy: plan.strategy,
});

// 执行
const result = await executeOrchestration(orch.id);
```

## 文档生成

```javascript
import { DocumentGenerator } from "openoxygen";

const docGen = new DocumentGenerator();

// 生成日报
await docGen.generateDailyReport({
  date: "2026-03-19",
  tasks: ["完成任务A", "完成任务B"],
  progress: "正常",
  issues: "无",
  plans: ["计划任务C"],
});

// 生成项目报告
await docGen.generateProjectReport({
  title: "项目报告",
  summary: "项目进展顺利",
  details: ["完成模块1", "完成模块2"],
  conclusion: "按计划推进",
});

// 网页提取
const extraction = await docGen.extractFromWebpage("https://example.com", {
  summarize: true,
});
```

## 全局记忆

```javascript
import { getGlobalMemory } from "openoxygen";

const memory = getGlobalMemory();

// 存储偏好
memory.setPreference("theme", "dark");

// 获取偏好
const theme = memory.getPreference("theme");

// 记录任务
memory.recordTask({
  instruction: "npm install",
  mode: "terminal",
  success: true,
  durationMs: 5000,
});

// 查询历史
const tasks = memory.queryTasks({ mode: "terminal" });
```

## 多 Agent 通信

```javascript
import { registerAgent, delegateTask, listAgents } from "openoxygen";

// 注册 Agent
registerAgent("agent-1", "Worker 1", "worker", ["terminal", "gui"]);

// 列出可用 Agent
const agents = listAgents();

// 委派任务
const result = await delegateTask("agent-1", {
  instruction: "检查系统状态",
  timeout: 30000,
});
```

## 错误处理

所有 API 返回统一的结果格式：

```javascript
{
  success: boolean,      // 是否成功
  output?: any,          // 成功时的输出
  error?: string,        // 失败时的错误信息
  durationMs: number,    // 执行耗时
}
```

示例：

```javascript
const result = await execute("some command");

if (result.success) {
  console.log(result.output);
} else {
  console.error(result.error);
}
```

## 配置

```javascript
import { createConfig } from "openoxygen";

const config = createConfig({
  // 终端配置
  terminal: {
    defaultShell: "powershell",
    timeout: 30000,
  },
  // 浏览器配置
  browser: {
    headless: false,
    debugPort: 9222,
  },
  // 日志配置
  logging: {
    level: "info",
    file: "openoxygen.log",
  },
});
```

## 版本信息

```javascript
import { VERSION } from "openoxygen";

console.log(VERSION); // "26w15aC"
```
