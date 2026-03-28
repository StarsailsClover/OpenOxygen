# OpenOxygen 项目结构

**版本**: 26w15aE  
**最后更新**: 2026-03-24

---

## 根目录文件 (用户可见)

```
OpenOxygen/
├── README.md                   # 项目说明 (必需)
├── LICENSE                     # 许可证 (必需)
├── CHANGELOG.md               # 更新日志 (必需)
├── package.json               # 包配置 (必需)
├── openoxygen.config.json     # 用户配置 (必需)
├── tsconfig.json              # TypeScript 配置 (必需)
├── .gitignore                 # Git 忽略 (必需)
├── .npmignore                 # npm 忽略 (必需)
├── .env.example               # 环境变量示例 (必需)
└── package-lock.json          # 依赖锁定 (必需)
```

---

## 核心目录

### src/ - 源代码
```
src/
├── core/                      # 核心模块
│   ├── gateway/
│   ├── runtime/
│   └── config/
├── ouv/                       # OUV 视觉模块
│   ├── index.ts
│   └── vector-database.cjs
├── osr/                       # OSR 录制模块
│   ├── recorder.ts
│   └── player.cjs
├── execution/                 # 执行层
│   ├── browser/
│   ├── terminal/
│   ├── native/
│   ├── unified/
│   └── interruptible-executor.cjs
├── agent/                     # Agent 层
│   ├── orchestrator.cjs
│   ├── communication/
│   └── htn/
├── uia/                       # UIA 元素检测
│   └── detector.cjs
├── browser/                   # OxygenBrowser
│   └── oxygen-browser.cjs
├── security/                  # 安全模块
│   └── index.cjs
├── ui/                        # UI 模块
│   ├── winui/
│   └── hotkey.cjs
├── utils/                     # 工具
│   └── performance.cjs
├── memory/                    # 内存模块
├── inference/                 # 推理层
├── input/                     # 输入处理
├── output/                    # 输出处理
└── types/                     # 类型定义
```

### native/ - C++ 原生模块
```
native/
├── include/                   # 头文件
│   ├── oxygen_core.h
│   ├── oxygen_input.h
│   └── ...
├── cpp/                       # 实现文件
│   ├── core/
│   ├── input/
│   └── ...
├── build/Release/             # 编译输出
│   └── openoxygen_native.node
├── binding.cpp                # Node-API 绑定
└── binding.gyp                # 构建配置
```

### bin/ - CLI 入口
```
bin/
├── openoxygen.js              # CLI 主入口
├── openoxygen.bat             # Windows 启动
└── openoxygen.sh              # Unix 启动
```

### examples/ - 示例代码
```
examples/
└── basic.js                   # 基础使用示例
```

### tests/ - 测试
```
tests/
├── integration/               # 集成测试
│   ├── test_phase1.cjs
│   ├── test_phase2.cjs
│   ├── test_phase3.cjs
│   └── test_ollama_integration.cjs
└── unit/                      # 单元测试
```

### docs/ - 文档
```
docs/
├── guides/                    # 用户指南
│   └── AgentLOG.md
├── api/                       # API 文档
└── architecture/              # 架构文档
```

### tools/ - 工具脚本
```
tools/
├── migration-tool.ts          # 迁移工具
└── scripts/                   # 脚本
    └── start.bat
```

### compat/ - 兼容层
```
compat/
└── openclaw/                  # OpenClaw 兼容
    └── adapter.ts
```

---

## 归档目录 (开发历史)

```
archives/
├── roadmaps/                  # 路线图文档
│   ├── 2603141948.md
│   ├── 26w15aB-26w15aHRoadmap.md
│   └── ...
├── patches/                   # 历史补丁
│   ├── fix-*.cjs
│   └── ...
├── reports/                   # 开发报告
│   ├── BUILD_SUCCESS_REPORT.md
│   ├── PHASE*_COMPLETION_REPORT.md
│   └── ...
└── development/               # 开发文件
    └── create-release.sh
```

**注意**: archives/ 目录被 .gitignore 排除，不会发布到 npm

---

## 用户关注文件

### 运行使用
- `README.md` - 快速开始指南
- `CHANGELOG.md` - 版本更新
- `openoxygen.config.json` - 配置文件
- `bin/openoxygen.js` - CLI 工具

### 开发贡献
- `LICENSE` - 许可证
- `tsconfig.json` - TypeScript 配置
- `src/` - 源代码
- `tests/` - 测试代码
- `examples/` - 示例

### 部署安装
- `package.json` - npm 配置
- `native/build/Release/openoxygen_native.node` - 原生模块
- `.npmignore` - 发布忽略规则

---

## 快速导航

| 需求 | 位置 |
|------|------|
| 安装使用 | README.md, package.json |
| 配置 | openoxygen.config.json, .env.example |
| 开发 | src/, tsconfig.json |
| 测试 | tests/, examples/ |
| 文档 | docs/, CHANGELOG.md |
| CLI | bin/openoxygen.js |
| 原生模块 | native/ |

---

## 清理结果

**清理前**: 50+ 个根目录文件  
**清理后**: 16 个根目录文件

**改进**:
- ✅ 清晰的文件组织
- ✅ 用户文件优先
- ✅ 开发历史归档
- ✅ 更好的 npm 发布体验
