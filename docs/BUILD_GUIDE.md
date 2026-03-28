# OpenOxygen 构建指南

## 构建流程

### 阶段 1: 准备工作

1. **检查依赖**
   ```bash
   npm install
   ```

2. **检查 TypeScript 配置**
   - tsconfig.json 是否存在
   - outDir 是否指向 dist
   - include 是否包含 src

### 阶段 2: TypeScript 编译

1. **编译 LLM 模块**
   ```bash
   npx tsc src/llm/index.ts --outDir dist/llm --module commonjs --target es2020 --declaration
   ```

2. **编译 Flow Controller**
   ```bash
   npx tsc src/execution/unified/flow-controller.ts --outDir dist/execution/unified --module commonjs --target es2020 --declaration
   ```

3. **编译所有 TypeScript**
   ```bash
   npm run build
   ```

### 阶段 3: 验证构建

1. **检查输出文件**
   - dist/llm/index.js 是否存在
   - dist/execution/unified/flow-controller.js 是否存在

2. **运行测试**
   ```bash
   npm test
   ```

### 阶段 4: 集成测试

1. **测试流程图路径**
   - Simple 路径
   - Medium + Agent 路径
   - Complex 路径

2. **验证 LLM 连接**
   - Ollama 是否可连接
   - 模型是否可用

## 常见问题

### 问题 1: TS 编译失败
**解决**: 检查 tsconfig.json 配置

### 问题 2: 模块找不到
**解决**: 确保 import 路径正确

### 问题 3: 运行时错误
**解决**: 检查 dist 目录结构

## 构建脚本

```json
{
  "scripts": {
    "build": "tsc",
    "build:llm": "tsc src/llm/index.ts --outDir dist/llm",
    "build:flow": "tsc src/execution/unified/flow-controller.ts --outDir dist/execution/unified",
    "test": "vitest run",
    "test:flow": "vitest run test/flow-controller.test.mjs"
  }
}
```
