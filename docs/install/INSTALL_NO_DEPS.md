# OpenOxygen 26w13aB 安装指南（精简版）

**版本**: 26w13aB  
**适用系统**: Windows 10/11 (x64)  
**预计安装时间**: 5-10 分钟

---

## 快速开始

### 1. 解压

将 `OpenOxygen-26w13aB-windows-x64.zip` 解压到任意目录，例如：
```
D:\OpenOxygen
```

### 2. 安装依赖

```powershell
cd D:\OpenOxygen
npm install
```

### 3. 启动

```powershell
.\start.bat
```

### 4. 访问 Dashboard

浏览器打开: http://localhost:4800

---

## 前置要求

| 依赖 | 版本 | 下载 |
|------|------|------|
| Node.js | 22.x | https://nodejs.org/ |
| Ollama (可选) | 最新 | https://ollama.com/ |

---

## 配置模型

### 本地模型 (Ollama)

```powershell
ollama pull qwen3:4b
ollama pull qwen3-vl:4b
```

### 远程模型

编辑 `openoxygen.json`，添加 OpenAI/Claude API 密钥。

---

## 故障排除

### 端口被占用
```powershell
# 修改 openoxygen.json 中的 port
```

### 模型连接失败
```powershell
# 检查 Ollama 是否运行
ollama ps
```

---

完整文档: [README.md](README.md)
