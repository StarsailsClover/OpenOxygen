# OpenOxygen 安装指南

**版本**: 26w13aB  
**适用系统**: Windows 10/11 (x64)  
**预计安装时间**: 10-15 分钟

---

## 快速开始 (推荐)

### 方式一：使用安装包 (推荐普通用户)

1. **下载 Release 包**
   - 访问 [Releases 页面](https://github.com/yourusername/openoxygen/releases)
   - 下载 `OpenOxygen-26w13aB-windows-x64.zip`

2. **解压运行**
   ```powershell
   # 解压到任意目录，例如 D:\OpenOxygen
   Expand-Archive OpenOxygen-26w13aB-windows-x64.zip -DestinationPath D:\OpenOxygen
   cd D:\OpenOxygen
   ```

3. **启动 OpenOxygen**
   ```powershell
   # 方式1: 直接运行 (推荐)
   .\start.bat
   
   # 方式2: 手动启动
   npm install
   npm run build
   npm start
   ```

4. **访问 Dashboard**
   - 浏览器打开: http://localhost:4800
   - 默认无需认证 (auth.mode: none)

---

## 方式二：从源码安装 (开发者)

### 前置要求

| 依赖 | 版本 | 下载链接 |
|------|------|----------|
| Node.js | 22.x | https://nodejs.org/ |
| Rust | 1.75+ | https://rustup.rs/ |
| Git | 任意 | https://git-scm.com/ |
| Ollama | 最新 | https://ollama.com/ |

### 安装步骤

1. **克隆仓库**
   ```powershell
   git clone https://github.com/yourusername/openoxygen.git
   cd openoxygen
   git checkout main
   ```

2. **安装依赖**
   ```powershell
   npm install
   ```

3. **构建 Native 模块**
   ```powershell
   cd packages\core-native
   cargo build --release
   cd ..\..
   ```

4. **配置模型 (可选)**
   ```powershell
   # 编辑 openoxygen.json 添加你的模型
   notepad openoxygen.json
   ```

5. **启动服务**
   ```powershell
   npm run build
   npm start
   ```

---

## 配置模型

### 步骤 1: 安装 Ollama (本地模型)

```powershell
# 下载并安装 Ollama
# 然后拉取推荐模型
ollama pull qwen3:4b
ollama pull qwen3-vl:4b
ollama pull gpt-oss:20b
```

### 步骤 2: 配置 openoxygen.json

```json
{
  "version": "26w13aB",
  "gateway": {
    "host": "127.0.0.1",
    "port": 4800,
    "auth": { "mode": "none" }
  },
  "models": [
    {
      "provider": "ollama",
      "model": "qwen3:4b",
      "baseUrl": "http://127.0.0.1:11434/v1",
      "apiKey": "local",
      "temperature": 0.7,
      "maxTokens": 4096
    },
    {
      "provider": "ollama",
      "model": "qwen3-vl:4b",
      "baseUrl": "http://127.0.0.1:11434/v1",
      "apiKey": "local",
      "temperature": 0.7,
      "maxTokens": 4096,
      "vision": true
    }
  ]
}
```

### 步骤 3: 添加远程模型 (可选)

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "your-api-key-here",
  "temperature": 0.7,
  "maxTokens": 8192
}
```

---

## 验证安装

### 1. 检查服务状态
```powershell
# 服务健康检查
curl http://127.0.0.1:4800/health

# 预期输出: {"status":"ok","timestamp":...,"version":"26w13aB"}
```

### 2. 测试模型连接
```powershell
# 测试 LLM 连接
curl -X POST http://127.0.0.1:4800/api/v1/chat `
  -H "Content-Type: application/json" `
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### 3. 运行基础测试
```powershell
# 运行浏览器兼容测试
node test/26w13a-p1-browser-compat.mjs

# 运行软件兼容测试
node test/26w13a-p2-software-compat.mjs
```

---

## 首次使用

### 通过 Dashboard

1. 打开 http://localhost:4800
2. 在输入框中输入指令，例如：
   ```
   打开 Chrome 并访问 bilibili.com
   ```
3. 点击发送，观察 OpenOxygen 执行

### 通过 API

```powershell
# 发送任务
curl -X POST http://127.0.0.1:4800/api/v1/tasks `
  -H "Content-Type: application/json" `
  -d '{
    "instruction": "打开计算器并计算 123+456",
    "mode": "interactive"
  }'
```

### 通过 CLI

```powershell
# 使用 CLI 工具 (开发中)
npx openoxygen-cli "打开记事本并写入 Hello World"
```

---

## 常见问题

### Q: 启动时报错 "Cannot find module"
```powershell
# 重新安装依赖
npm install
npm run build
```

### Q: Native 模块加载失败
```powershell
# 重新构建 Native 模块
cd packages\core-native
cargo build --release
cd ..\..
```

### Q: Ollama 连接失败
```powershell
# 检查 Ollama 是否运行
ollama ps

# 如果没有运行
ollama serve
```

### Q: 端口被占用
```powershell
# 修改 openoxygen.json 中的 port
# 或查找并关闭占用 4800 的进程
netstat -ano | findstr 4800
```

---

## 目录结构

```
OpenOxygen/
├── start.bat              # Windows 启动脚本
├── openoxygen.json        # 主配置文件
├── dist/                  # 编译输出
├── packages/
│   └── core-native/       # Rust Native 模块
├── test/                  # 测试脚本
├── docs/                  # 文档
└── .state/                # 运行时状态
```

---

## 下一步

- [快速入门指南](docs/QUICKSTART.md)
- [API 文档](docs/API.md)
- [配置详解](docs/CONFIG.md)
- [技能开发指南](docs/SKILL_GUIDE.md)

---

## 获取帮助

- GitHub Issues: https://github.com/yourusername/openoxygen/issues
- 文档: https://docs.openoxygen.dev
- 社区: https://discord.gg/openoxygen
