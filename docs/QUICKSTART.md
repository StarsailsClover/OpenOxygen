# OpenOxygen 快速入门

**版本**: 26w13aB  
**阅读时间**: 5 分钟

---

## 1. 启动 OpenOxygen

```powershell
# 方式1: 双击 start.bat
# 方式2: 命令行
npm start
```

服务启动后，你会看到：
```
[Gateway] Listening on http://127.0.0.1:4800
[Health] Status: OK
```

---

## 2. 添加模型

### 本地模型 (Ollama)

```powershell
# 1. 安装 Ollama (如果还没安装)
# 下载: https://ollama.com

# 2. 拉取模型
ollama pull qwen3:4b
ollama pull qwen3-vl:4b

# 3. 确认模型已加载
ollama list
```

### 远程模型 (OpenAI/Claude)

编辑 `openoxygen.json`：

```json
{
  "models": [
    {
      "provider": "openai",
      "model": "gpt-4o",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-your-key-here"
    }
  ]
}
```

---

## 3. 给予指令

### 方式一: Web Dashboard

1. 打开浏览器: http://localhost:4800
2. 在输入框输入指令：
   ```
   打开 Chrome 访问百度，搜索"OpenOxygen"
   ```
3. 按 Enter 或点击发送
4. 观察右侧执行日志

### 方式二: HTTP API

```powershell
curl -X POST http://127.0.0.1:4800/api/v1/chat `
  -H "Content-Type: application/json" `
  -d '{
    "messages": [
      {"role": "user", "content": "打开计算器"}
    ]
  }'
```

### 方式三: WebSocket (实时)

```javascript
const ws = new WebSocket('ws://127.0.0.1:4800/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'task.create',
    instruction: '打开记事本'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status:', data.status);
};
```

---

## 4. 常用指令示例

### 系统操作
```
打开计算器并计算 123+456
打开记事本写入 Hello World 并保存到桌面
打开任务管理器查看内存占用最高的进程
```

### 浏览器操作
```
打开 Chrome 访问 bilibili.com
在百度搜索"人工智能"
打开 Gmail 查看未读邮件
```

### 开发工具
```
打开 VS Code 并打开项目文件夹
在终端执行 npm install
```

### 多步骤任务
```
打开画图，画一个红色圆形，保存到桌面
打开微信，找到文件传输助手，发送截图
```

---

## 5. 查看结果

### Dashboard 界面

```
┌─────────────────────────────────────────┐
│  OpenOxygen Dashboard                   │
├─────────────────────────────────────────┤
│  [输入框] [发送]                        │
├─────────────────────────────────────────┤
│  执行日志:                              │
│  ✅ 打开 Chrome                         │
│  ✅ 导航到 bilibili.com                 │
│  ✅ 页面加载完成                        │
├─────────────────────────────────────────┤
│  截图预览: [screenshot]                 │
└─────────────────────────────────────────┘
```

### 日志文件

```powershell
# 查看执行日志
type .state\latest.log

# 查看历史截图
ls .state\screenshots\
```

---

## 6. 配置调整

### 修改监听端口

编辑 `openoxygen.json`：
```json
{
  "gateway": {
    "port": 8080  // 改为 8080
  }
}
```

### 启用认证

```json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "your-secret-token"
    }
  }
}
```

### 添加更多模型

```json
{
  "models": [
    { "model": "qwen3:4b", "provider": "ollama" },
    { "model": "gpt-4o", "provider": "openai", "apiKey": "..." },
    { "model": "claude-3-opus", "provider": "anthropic", "apiKey": "..." }
  ]
}
```

---

## 7. 故障排除

### 问题: 指令无响应
```powershell
# 检查服务状态
curl http://127.0.0.1:4800/health

# 检查模型连接
ollama ps
```

### 问题: 模型回复慢
```powershell
# 切换到更快的模型
# 在 openoxygen.json 中将默认模型改为 qwen3:4b
```

### 问题: 操作失败
```powershell
# 查看详细日志
npm start 2>&1 | tee log.txt

# 运行测试验证
cd test
node 26w13a-p1-browser-compat.mjs
```

---

## 8. 下一步

- [完整 API 文档](API.md)
- [配置详解](CONFIG.md)
- [开发自定义技能](SKILL_GUIDE.md)
- [安全最佳实践](SECURITY.md)

---

## 一键测试

运行完整测试套件验证安装：

```powershell
# 基础功能测试
npm test

# 浏览器兼容测试
node test/26w13a-p1-browser-compat.mjs

# 软件兼容测试
node test/26w13a-p2-software-compat.mjs

# 多AI接力测试
node test/26w13a-p3-multi-ai.mjs
```
