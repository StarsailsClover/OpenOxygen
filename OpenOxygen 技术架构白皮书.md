# OpenOxygen 技术架构白皮书

## 版本号：V1.0

## 发布日期：2026年03月08日

---

## 一、项目概述

### 1.1 项目定位

OpenOxygen 是一款**融合OpenClaw开源执行底型与GPT-5.1 Agent原生推理规划底型**，专为Windows平台深度优化的内核级Agent部署框架。

项目核心突破了传统Agent“要么开源可控但推理能力弱，要么推理顶尖但闭源受限”的行业痛点，实现了「开源生态兼容+内核级系统控制+顶尖视觉理解+原生推理规划」的全能力闭环，打造真正可自主可控、可深度定制、可工业级落地的Windows原生Agent底型。

### 1.2 核心目标

1. **全生态兼容**：100%兼容OpenClaw的核心架构、接口规范、Skill插件生态与记忆体系，实现原有业务零修改平滑迁移；

2. **内核级系统控制**：深度集成Windows原生API，实现细粒度文件系统、注册表、进程服务、网络通信、硬件管理等全场景系统级操作能力；

3. **顶尖视觉理解**：自研OxygenUltraVision视觉模块，实现对标GPT-5.1 Computer Use的桌面环境理解、元素定位、动态感知与交互闭环能力；

4. **融合式推理规划**：吸收GPT-5.1 Agent原生架构优势，打造「推理-规划-执行-反馈-反思」一体化的自适应推理中枢，兼顾模型无关的灵活性与顶尖模型的推理能力；

5. **模块化可插拔架构**：全链路组件化设计，支持模型、插件、能力模块的热插拔、热更新，满足个人与企业级场景的深度定制需求。

### 1.3 核心设计理念

- **生态兼容与架构创新融合**：不做重复造轮子的接口模拟，直接基于OpenClaw核心架构做二次创新，兼顾生态兼容与能力突破；

- **本地执行与云端推理融合**：本地优先的执行架构，同时支持云端/本地多模型动态切换，实现隐私可控与能力上限的平衡；

- **系统控制与智能感知融合**：内核级系统操作能力与多模态视觉感知深度耦合，实现“看得懂、控得住、做得成”的完整闭环；

- **安全可控与开放扩展融合**：以最小权限、全链路审计为安全底线，同时提供完全开放的插件生态与定制化能力。

---

## 二、整体架构设计

OpenOxygen 采用**五层分层解耦架构**，完全对齐两大底型的核心优势，同时实现模块边界清晰、数据流可控、扩展无上限。

### 2.1 整体架构图

```Plain Text

┌─────────────────────────────────────────────────────────────────┐
│  统一接入与兼容层 (Unified Access & Compatibility Layer)        │
│  ├─ OpenClaw全生态兼容适配器 ├─ 多渠道接入网关 ├─ 交互入口     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  融合式推理与规划中枢 (Fused Inference & Planning Core)         │
│  ├─ 自适应推理引擎 ├─ 任务规划引擎 ├─ 多模型路由 ├─ 反思迭代器 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  统一执行引擎 (Unified Execution Engine)                         │
│  ├─ Windows系统控制模块 ├─ OxygenUltraVision视觉引擎 ├─ 插件沙箱 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  分层记忆与持久化层 (Tiered Memory & Persistence Layer)         │
│  ├─ 6层分层记忆体系 ├─ 本地向量检索引擎 ├─ 状态持久化管理       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  安全与审计层 (Security & Audit Layer)                           │
│  ├─ 细粒度权限管理 ├─ 沙箱隔离 ├─ 事务回滚 ├─ 不可篡改审计日志 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 各层级核心设计规范

#### 2.2.1 统一接入与兼容层

- **核心定位**：整个框架的入口中枢，实现全生态兼容与多渠道交互统一；

- **核心组件**：

    1. **OpenClaw全生态兼容适配器**：原生复用OpenClaw的Gateway、SkillManager、SessionManager核心模块，100%兼容原有接口、插件规范、会话协议与记忆数据；

    2. **多渠道接入网关**：继承OpenClaw的多通道能力，支持微信、Telegram、飞书、钉钉、Web控制台、本地GUI等全渠道接入，实现跨平台会话续传；

    3. **统一交互协议**：标准化用户指令、任务状态、执行结果的交互格式，支持文本、语音、图像等多模态输入输出。

#### 2.2.2 融合式推理与规划中枢

- **核心定位**：整个框架的“大脑”，是两大底型深度融合的核心，实现GPT-5.1同级的Agent规划与推理能力；

- **核心组件**：

    1. **自适应推理引擎**：兼容OpenClaw的模型无关设计，支持所有主流大模型（GPT系列、Claude、Gemini、开源本地模型），基于任务复杂度自动切换模型、调整推理深度（快速模式/深度思考模式）；

    2. **任务规划引擎**：原生实现复杂任务拆解、子任务依赖管理、动态调度、优先级排序，支持多任务并行与串行混合执行；

    3. **执行反馈与反思迭代器**：实现「执行-反馈-分析-调整-重试」的原生闭环，自动处理执行失败场景，优化后续任务规划，对齐GPT-5.1的错误处理与长链任务一致性能力；

    4. **多模型动态路由**：支持单任务多模型混用，简单操作调用本地小模型，复杂规划/视觉推理调用GPT-5.1等高阶模型，实现成本与效果的最优平衡。

#### 2.2.3 统一执行引擎

- **核心定位**：整个框架的“双手”，实现内核级系统操作与视觉感知-执行的原生闭环；

- **核心组件**：

    1. **Windows内核级系统控制模块**：封装WinAPI/COM接口，实现文件系统、注册表、进程服务、网络通信、硬件管理、防火墙配置、任务计划等全场景系统操作；

    2. **OxygenUltraVision视觉引擎**：自研双路并行视觉管道，实现对标GPT-5.1的桌面理解、元素定位、动态感知与交互能力；

    3. **沙箱化插件执行环境**：兼容OpenClaw的Skill插件规范，支持自定义插件开发，插件运行在独立隔离沙箱中，严格控制权限，避免安全风险。

#### 2.2.4 分层记忆与持久化层

- **核心定位**：整个框架的“长期记忆”，保障长链任务的上下文一致性与经验复用；

- **核心设计**：采用6层分层记忆体系，完全兼容OpenClaw原有记忆数据，同时对齐GPT-5.1的记忆架构：

    1. 短期会话记忆：存储当前会话的对话内容、任务状态、中间结果；

    2. 任务执行记忆：存储历史任务的执行流程、成功/失败经验、操作步骤；

    3. 工具调用记忆：存储工具/插件的调用记录、参数配置、返回结果；

    4. 视觉场景记忆：存储常见桌面场景、应用界面、UI元素特征，提升视觉识别效率；

    5. 用户偏好记忆：存储用户的操作习惯、偏好设置、禁忌规则；

    6. 长期知识记忆：存储用户注入的专业知识、业务规则，支持向量检索召回；

- **核心组件**：内置轻量级本地向量检索引擎，无需依赖第三方服务，实现离线精准记忆召回；支持任务状态实时持久化，实现断点续传与崩溃恢复。

#### 2.2.5 安全与审计层

- **核心定位**：整个框架的“安全底线”，实现全链路可控、可追溯、可回滚；

- **核心组件**：细粒度权限管理系统、多进程隔离沙箱、操作事务与回滚机制、不可篡改审计日志、敏感信息过滤与隐私保护模块。

---

## 三、核心技术模块详解

### 3.1 OpenClaw全生态兼容模块

#### 设计目标

实现真正的生态兼容，而非简单的接口模拟，保障OpenClaw原有插件、配置、记忆、业务代码零修改平滑迁移。

#### 核心实现

1. **核心架构复用**：直接fork OpenClaw官方源码，保留其Gateway网关、Skill插件系统、Session会话管理、LLM模型适配层的核心架构，仅扩展Windows专属模块与视觉引擎；

2. **兼容模式开关**：提供`OpenClawCompatMode`一键切换开关，开启后完全对齐OpenClaw的接口行为、错误码、数据格式；

3. **生态无缝对接**：原生兼容ClawHub技能市场，原有社区插件可直接安装、运行；支持原有记忆数据、配置文件直接导入，无需任何迁移操作。

#### 接口规范

- 完全兼容OpenClaw的核心公开接口：`agent.execute()`、`agent.perceive()`、`agent.send_message()`、`skill.register()`等；

- 扩展Windows专属接口，同时保持与原有接口的命名空间、参数格式完全兼容，避免冲突。

### 3.2 Windows内核级系统控制模块

#### 设计目标

实现比OpenClaw更深度的Windows系统级控制能力，同时保障安全可控、操作可回滚。

#### 核心实现

|能力分类|核心功能|技术实现|安全约束|
|---|---|---|---|
|文件系统控制|细粒度ACL权限管理、影子复制、加密文件操作、批量文件处理、原子级文件读写|Win32 File API、NTFS安全接口、卷影复制服务(VSS)|高危操作自动备份，失败自动回滚；禁止系统核心目录无授权操作|
|注册表管理|注册表项的增删改查、权限配置、备份与还原、原子级批量修改|Win32 Registry API、Reg*系列原生接口|操作前自动备份对应注册表项，支持一键回滚；禁止修改系统启动相关关键项|
|进程与服务管理|进程生命周期控制、进程注入防护、Windows服务启停、启动类型配置、依赖管理|Win32 Process API、Service Control Manager API|高权限进程操作单独运行在隔离子进程；禁止结束系统关键进程|
|网络与通信管理|防火墙规则配置、端口监听与管理、代理设置、串口/并口通信、WMI网络查询|Windows Firewall API、Winsock2 API、WMI/WQL接口|网络规则变更需用户二次确认；自动记录所有网络操作日志|
|系统配置管理|任务计划程序配置、组策略管理、电源管理、设备管理、用户权限配置|Task Scheduler API、Group Policy API、Power Management API|系统级配置变更需管理员授权，同时备份原有配置|
#### 跨语言桥接方案

采用「C++核心动态库+Python上层调度」的架构：

- 用C++编写`OxygenCore.dll`，封装所有WinAPI调用、高性能计算逻辑，解决Python调用底层API的性能开销与兼容性问题；

- 基于共享内存实现零拷贝IPC通信，降低Python与C++模块的跨语言调用延迟；

- 支持C++/C#模块的热加载、热更新，无需重启主程序即可更新核心模块。

### 3.3 OxygenUltraVision 视觉理解模块

#### 设计目标

实现对标GPT-5.1 Computer Use的桌面视觉理解能力，解决Windows平台全场景UI元素覆盖、低延迟精准定位、推理与感知原生融合的核心痛点。

#### 核心架构

采用**「推理驱动的动态视觉注意力+双路并行感知管道」**架构，放弃传统串行全量处理方案，大幅降低延迟与token消耗。

##### 3.3.1 动态视觉注意力机制

1. 全局预感知：捕获低分辨率全局屏幕截图，喂给模型做场景理解，输出需要关注的目标区域；

2. 聚焦式识别：针对目标区域捕获高分辨率截图，同时提取对应区域的UI控件树、OCR文本，仅把聚焦后的结构化信息喂给模型；

3. 动态迭代：模型在推理过程中，可动态触发区域聚焦、重新捕获、细节放大，完全对齐GPT-5.1的视觉推理模式。

##### 3.3.2 双路并行感知管道

|管道|技术实现|适用场景|优势|
|---|---|---|---|
|UI Automation无障碍管道|基于Windows UI Automation API，通过uiautomation库获取完整控件树，提取元素的Name、Class、坐标、AutomationId、可交互状态|标准Win32/WPF/UWP/.NET应用、系统原生界面|定位100%精准，无坐标偏移，零延迟，不消耗GPU资源|
|计算机视觉(CV)管道|基于DXGI高性能截屏，搭配OCR、UI元素检测模型、模板匹配，实现自定义界面的元素识别与定位|Electron/CEF/Qt/Unity/游戏等自绘界面、无无障碍接口的应用|全场景覆盖，无界面类型限制，鲁棒性强|
##### 3.3.3 专属场景适配优化

- **Electron/CEF应用**：通过DevTools远程调试协议注入，直接获取页面DOM树，元素定位准确率100%，远优于CV方案；

- **Qt应用**：适配Qt Accessibility接口，直接获取Qt原生控件树；

- **最小化/后台窗口**：基于DWM缩略图API、PrintWindow API，实现后台窗口内容捕获，无需激活窗口；

- **多显示器/DPI缩放**：基于Windows DisplayConfig API，实现多显示器不同DPI的精准坐标映射，解决高DPI界面坐标偏移问题。

##### 3.3.4 感知-执行闭环

每个动作执行后，自动捕获屏幕变化，将执行结果实时回传给推理引擎，模型自动判断操作是否生效，若失败则自动重新识别、调整坐标、重试执行，实现无需用户干预的自主纠错闭环。

### 3.4 融合式推理规划引擎

#### 设计目标

吸收GPT-5.1 Agent原生架构的核心优势，同时保留OpenClaw模型无关的灵活性，打造兼顾效果与可控性的Agent推理中枢。

#### 核心能力

1. **任务智能拆解**：自动将用户的自然语言复杂需求，拆解为可执行的、有依赖关系的子任务，自动规划执行顺序；

2. **自适应推理深度**：基于任务复杂度自动切换推理模式：

    - 快速模式：简单指令、单步操作，使用轻量推理，降低延迟与token消耗；

    - 深度思考模式：复杂长链任务、多步骤规划，启用CoT/ToT思维链、反思迭代，提升任务成功率；

3. **错误处理与重试机制**：针对执行失败的任务，自动分析失败原因，调整执行方案，分级重试；超过重试阈值后，主动向用户反馈问题与可选解决方案；

4. **长链上下文一致性保障**：结合分层记忆系统，自动召回相关历史任务、操作经验、用户偏好，避免长链任务中出现上下文丢失、逻辑混乱的问题。

### 3.5 分层记忆系统

#### 设计目标

实现兼容OpenClaw生态、对齐GPT-5.1能力的记忆体系，保障Agent的经验复用、用户个性化适配与长任务稳定性。

#### 核心实现

- **存储架构**：纯本地文件驱动，所有记忆数据以加密格式存储在用户本机，完全不上云，兼容OpenClaw的原有记忆文件格式；

- **向量检索引擎**：内置轻量级本地向量检索引擎，支持INT4量化，无需GPU即可离线运行，实现毫秒级记忆召回；

- **记忆生命周期管理**：自动对短期记忆进行摘要、归档，对高频使用的经验进行长期存储，对过期无效记忆自动清理，避免记忆膨胀导致的上下文混乱。

### 3.6 安全与审计系统

#### 设计目标

以“最小权限、全程可控、可追溯、可回滚”为核心原则，解决系统级Agent的安全风险，满足个人与企业级合规需求。

#### 核心实现

1. **分离进程+最小权限架构**：

    - 主进程永远以标准用户权限运行，仅在需要高权限操作时，临时启动高完整性子进程执行，执行完成后子进程立即退出；

    - 细粒度权限申请机制，每个操作、每个插件都需要单独申请权限，用户可精准控制，支持运行时动态授权与回收。

2. **事务与回滚机制**：

    - 所有高危操作纳入事务管理，执行前自动备份原有状态（注册表、文件、服务配置等）；

    - 操作失败、用户取消时，可一键回滚到操作前的状态，避免系统损坏、数据丢失。

3. **多层沙箱隔离**：

    - 插件运行在独立的低完整性沙箱进程中，无法直接调用系统API，仅能通过框架开放的受限接口执行操作；

    - 高危操作支持Windows AppContainer沙箱，实现更严格的隔离，避免影响系统核心组件。

4. **全链路隐私保护**：

    - 内置敏感信息识别引擎，自动识别密码、身份证号、银行卡号等敏感信息，自动打码，不传给任何大模型；

    - 截屏、视觉数据处理完成后立即从内存销毁，默认不落地存储；本地记忆数据采用Windows DPAPI加密，仅当前用户可解密。

5. **不可篡改审计日志**：

    - 分级日志体系，审计日志记录所有高危操作、用户指令、执行结果，包括操作人、时间、内容、状态、返回值；

    - 审计日志采用链式存储，不可篡改、不可删除，支持日志导出，满足企业级合规审计需求。

---

## 四、开发路线规划

采用**迭代式MVP开发模式**，每周交付可运行版本，快速验证核心能力，逐步完善全功能。

|迭代阶段|周期|核心目标|可交付成果|
|---|---|---|---|
|阶段1：核心框架与兼容验证|第1周|搭建核心架构，完成OpenClaw生态兼容，跑通最小执行闭环|1. 基于OpenClaw源码搭建的核心框架；<br>2. OpenClaw核心接口100%兼容验证；<br>3. 「用户指令→打开记事本→输入文字」的最小执行闭环|
|阶段2：基础视觉闭环|第2周|完成OxygenUltraVision基础版本，实现视觉感知-执行的完整闭环|1. 基于UI Automation+OCR的双路视觉管道；<br>2. 「截屏→元素定位→点击执行」的完整视觉操作闭环；<br>3. 多显示器/DPI适配基础版本|
|阶段3：系统级核心模块|第3周|实现Windows内核级系统控制核心能力，完成安全权限架构|1. 文件系统、注册表、进程管理的基础操作模块；<br>2. 分离进程+最小权限安全架构；<br>3. 操作事务与回滚机制基础版本|
|阶段4：推理规划引擎MVP|第4周|实现基础的任务拆解、执行反馈闭环，跑通多步骤长链任务|1. 自适应推理引擎基础版本；<br>2. 任务拆解与子任务调度能力；<br>3. 「下载安装软件→打开→完成基础设置」的完整长链任务闭环|
|阶段5：视觉能力升级|第5-8周|完成视觉引擎全能力开发，对标GPT-5.1 Computer Use|1. 推理驱动的动态视觉注意力机制；<br>2. Electron/Qt/游戏等专属场景适配；<br>3. 视觉-执行-反思的自主纠错闭环|
|阶段6：记忆系统与全模块完善|第9-10周|完成分层记忆系统，补全所有系统级模块，优化全链路能力|1. 6层分层记忆体系与本地向量检索引擎；<br>2. 网络、服务、系统配置等剩余系统模块；<br>3. 插件热加载、热更新能力|
|阶段7：安全加固与合规|第11周|完成全链路安全加固，满足合规要求|1. 多层沙箱隔离机制；<br>2. 敏感信息过滤与全链路隐私保护；<br>3. 不可篡改审计日志系统|
|阶段8：测试优化与正式发布|第12周|完成全场景测试、性能优化，发布正式版本|1. 全量单元测试、集成测试、E2E端到端测试；<br>2. 全链路性能优化与延迟降低；<br>3. 官方文档、示例代码、安装包正式发布|
---

## 五、开源协议与合规说明

1. **核心框架协议**：基于OpenClaw的MIT开源协议，OpenOxygen整体采用**MIT开源协议**，完全免费开源，支持个人与商业使用，无传染性限制；

2. **依赖库合规**：所有依赖的第三方开源库，优先选择MIT、Apache 2.0等宽松协议，避免GPL等传染性协议，防止协议污染；

3. **商业使用说明**：允许个人与企业免费使用、修改、分发、二次开发，仅需保留原作者版权声明，无额外商用限制。

---

## 六、OpenOxygen 配套开源仓库推荐列表

### 分类说明

按项目开发的核心需求，分为7大类，所有仓库均经过验证，适配Windows平台与OpenOxygen架构，可直接集成使用。

#### 6.1 核心兼容与Agent框架类

|仓库名称|GitHub地址|核心用途|适配OpenOxygen的场景|开源协议|最新Star数|备注|
|---|---|---|---|---|---|---|
|OpenClaw|[https://github.com/OpenClaw/OpenClaw](https://github.com/OpenClaw/OpenClaw)|开源Agent核心框架，Gateway网关、Skill插件系统、多渠道接入能力|项目核心架构基础，实现全生态兼容|MIT|134k+|官方主仓，更新最及时，含完整中文文档|
|Microsoft UFO|[https://github.com/microsoft/UFO](https://github.com/microsoft/UFO)|微软官方开源的Windows桌面Agent框架，深度集成Windows系统|参考Windows桌面Agent架构设计、UI自动化与视觉理解方案|MIT|12.8k+|业内首个Windows原生AgentOS，可直接复用其应用控制逻辑|
|Microsoft Agent Framework|[https://github.com/microsoft/agent-framework](https://github.com/microsoft/agent-framework)|微软官方Agent开发框架，支持Python/.NET，整合Semantic Kernel与AutoGen能力|参考推理规划引擎、多Agent协作、工作流编排设计|MIT|4.2k+|官方持续维护，适配Windows平台与Azure OpenAI生态|
|AutoGPT|[https://github.com/Significant-Gravitas/AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)|经典自主Agent框架，成熟的任务规划、记忆管理、工具调用体系|参考长链任务规划、反思迭代、记忆系统设计|MIT|168k+|社区生态成熟，有大量可复用的工具插件|
#### 6.2 Windows底层交互与系统控制类

|仓库名称|GitHub地址|核心用途|适配OpenOxygen的场景|开源协议|最新Star数|备注|
|---|---|---|---|---|---|---|
|pywin32|[https://github.com/mhammond/pywin32](https://github.com/mhammond/pywin32)|Python封装的WinAPI全集，支持文件、注册表、进程、服务等所有系统操作|Windows内核级系统控制模块的核心依赖|Python Software Foundation License|9.2k+|官方维护，稳定可靠，Windows开发必备|
|comtypes|[https://github.com/enthought/comtypes](https://github.com/enthought/comtypes)|Python COM接口调用库，轻量纯Python实现|UI Automation、Shell API等COM组件的调用|MIT|680+|比pywin32更轻量，适配新的Windows COM接口|
|wmi|[https://github.com/pythoneers/wmi](https://github.com/pythoneers/wmi)|Python封装的Windows WMI接口，支持系统信息查询、硬件管理、网络配置|系统信息采集、硬件管理、WMI查询模块|MIT|520+|基于pywin32封装，接口简洁易用|
|pyuac|[https://github.com/astral-sh/pyuac](https://github.com/astral-sh/pyuac)|Python Windows UAC提权库，支持管理员权限申请与子进程提权|分离进程权限架构，高权限操作的子进程提权|MIT|340+|轻量无依赖，一键实现UAC提权，无弹窗干扰|
#### 6.3 屏幕捕获与UI自动化类

|仓库名称|GitHub地址|核心用途|适配OpenOxygen的场景|开源协议|最新Star数|备注|
|---|---|---|---|---|---|---|
|dxcam|[https://github.com/ra1nty/DXcam](https://github.com/ra1nty/DXcam)|基于DXGI的Windows高性能截屏库，低延迟、高帧率、支持多显示器|OxygenUltraVision模块的屏幕捕获核心依赖|MIT|2.9k+|比mss延迟低80%，支持增量截屏，仅捕获画面变化区域|
|uiautomation|[https://github.com/yinkaisheng/Python-UIAutomation-for-Windows](https://github.com/yinkaisheng/Python-UIAutomation-for-Windows)|Windows UI Automation客户端库，支持所有原生控件的获取、操作|OxygenUltraVision的UI Automation管道核心依赖|Apache 2.0|9.8k+|比pywinauto更现代，支持最新Windows控件，中文文档完善|
|uia-peek|[https://github.com/g4-api/uia-peek](https://github.com/g4-api/uia-peek)|Windows UI元素检查与录制工具，支持REST API输出控件信息|UI元素调试、自动化操作录制、控件树解析|MIT|120+|可直接集成到框架中，实现UI元素的实时查询|
|Windows Capture|[https://github.com/Unrud/WindowsCapture](https://github.com/Unrud/WindowsCapture)|基于Windows Graphics Capture API的高性能截屏库，支持Rust/Python|备选屏幕捕获方案，支持后台窗口捕获、硬件加速|MIT|1.7k+|静态画面自动降帧率，资源占用极低|
|uWindowCapture|[https://github.com/hecomi/uWindowCapture](https://github.com/hecomi/uWindowCapture)|C++实现的Windows窗口捕获库，支持最小化/后台窗口捕获|后台窗口、最小化窗口的内容捕获|MIT|980+|性能优异，兼容性好，可封装为动态库集成|
#### 6.4 视觉理解与GUI解析类

|仓库名称|GitHub地址|核心用途|适配OpenOxygen的场景|开源协议|最新Star数|备注|
|---|---|---|---|---|---|---|
|OmniParser|[https://github.com/microsoft/OmniParser](https://github.com/microsoft/OmniParser)|微软开源的屏幕解析工具，专门用于GUI界面的元素识别、结构化输出|OxygenUltraVision的CV管道核心，UI元素检测与结构化解析|MIT|21.7k+|专为桌面Agent优化，可直接识别按钮、输入框等UI元素，输出结构化坐标|
|PaddleOCR|[https://github.com/PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)|百度开源的高精度OCR库，支持中英文多语言，轻量模型可离线运行|OxygenUltraVision的屏幕文本提取|Apache 2.0|41k+|中文识别准确率行业顶尖，支持量化压缩，端侧部署友好|
|EasyOCR|[https://github.com/JaidedAI/EasyOCR](https://github.com/JaidedAI/EasyOCR)|轻量多语言OCR库，纯Python实现，无需额外依赖|备选OCR方案，轻量离线部署|Apache 2.0|21k+|部署简单，支持80+语言，适合轻量场景|
|ultralytics|[https://github.com/ultralytics/ultralytics](https://github.com/ultralytics/ultralytics)|YOLO系列目标检测框架，支持自定义UI元素模型训练|OxygenUltraVision的自定义UI元素检测，适配特殊界面|AGPL-3.0|29k+|接口简洁，支持模型量化、ONNX加速，端侧运行友好|
|UI-TARS-Desktop|[https://github.com/bytedance/UI-TARS-Desktop](https://github.com/bytedance/UI-TARS-Desktop)|字节跳动开源的基于VLM的GUI自动化工具，支持自然语言控制桌面|参考VLM驱动的桌面交互架构设计|Apache 2.0|3.2k+|专为Windows桌面优化，有成熟的视觉-执行闭环方案|
#### 6.5 多模态与大模型部署类

|仓库名称|GitHub地址|核心用途|适配OpenOxygen的场景|开源协议|最新Star数|备注|
|---|---|---|---|---|---|---|
|MiniCPM-V|[https://github.com/OpenBMB/MiniCPM-V](https://github.com/OpenBMB/MiniCPM-V)|面壁智能开源的端侧轻量VLM，2B/4B参数，中英文优化，支持本地部署|OxygenUltraVision的本地视觉推理核心，离线场景使用|Apache 2.0|11k+|消费级显卡可流畅运行，桌面UI理解能力对标GPT-4V|
|LLaVA|[https://github.com/haotian-liu/LLaVA](https://github.com/haotian-liu/LLaVA)|经典开源视觉语言模型，生态成熟，支持自定义微调|备选本地VLM方案，复杂视觉推理场景|Apache 2.0|14k+|社区生态完善，有大量微调模型，适配各类场景|
|Qwen3-VL|[https://github.com/QwenLM/Qwen3-VL](https://github.com/QwenLM/Qwen3-VL)|阿里开源的多模态模型，轻量版2B参数，支持视觉代理、空间感知|本地高精度视觉推理场景，复杂桌面环境理解|Apache 2.0|3.8k+|中文优化，长上下文支持，专为具身智能场景优化|
|moondream|[https://github.com/vikhyat/moondream](https://github.com/vikhyat/moondream)|超轻量VLM，0.5B/2B参数，可在CPU上流畅运行|低配置设备的离线视觉推理场景，快速模式推理|MIT|6.9k+|体积极小，响应速度快，适合简单视觉理解任务|
|transformers|[https://github.com/huggingface/transformers](https://github.com/huggingface/transformers)|HuggingFace大模型加载框架，统一接口支持所有主流开源模型|本地大模型/VLM的加载、推理、调度|Apache 2.0|132k+|业内标准，文档完善，支持量化、加速，适配所有主流模型|
|live-vlm-webui|[https://github.com/nvidia-ai-iot/live-vlm-webui](https://github.com/nvidia-ai-iot/live-vlm-webui)|NVIDIA开源的实时VLM部署框架，支持多后端切换、边缘设备部署|本地VLM的部署、推理服务化，多模型动态切换|Apache 2.0|890+|兼容Ollama、vLLM等推理框架，可直接集成|
#### 6.6 工程化与安全工具类

|仓库名称|GitHub地址|核心用途|适配OpenOxygen的场景|开源协议|最新Star数|备注|
|---|---|---|---|---|---|---|
|Nuitka|[https://github.com/Nuitka/Nuitka](https://github.com/Nuitka/Nuitka)|Python编译器，可将Python代码编译为C语言，生成独立exe可执行文件|项目打包分发，提升运行性能，保护源码|Apache 2.0|13k+|比PyInstaller性能更高，反编译难度大，适合商用分发|
|PyInstaller|[https://github.com/pyinstaller/pyinstaller](https://github.com/pyinstaller/pyinstaller)|Python打包工具，可将项目打包为单文件exe，无需Python环境|项目打包分发，简单易用，兼容性好|GPL-2.0（商业使用豁免）|11k+|社区成熟，文档完善，适合快速打包分发|
|fastapi|[https://github.com/tiangolo/fastapi](https://github.com/tiangolo/fastapi)|高性能Python Web框架，支持自动生成API文档|项目的Web控制台、远程控制API、RESTful接口开发|MIT|76k+|性能优异，开发效率高，业内标准API框架|
|pydantic|[https://github.com/pydantic/pydantic](https://github.com/pydantic/pydantic)|Python数据校验库，支持类型提示、数据模型定义|项目的接口数据格式校验、任务状态管理、结构化数据处理|MIT|19k+|与FastAPI无缝集成，保障数据格式一致性|
|loguru|[https://github.com/Delgan/loguru](https://github.com/Delgan/loguru)|Python日志库，简洁易用，支持分级日志、轮转、加密存储|项目的日志系统、审计日志实现|MIT|18k+|无依赖，配置简单，支持异步日志，性能优异|
#### 6.7 插件生态与工具集成类

|仓库名称|GitHub地址|核心用途|适配OpenOxygen的场景|开源协议|最新Star数|备注|
|---|---|---|---|---|---|---|
|Model Context Protocol|[https://github.com/modelcontextprotocol/mcp](https://github.com/modelcontextprotocol/mcp)|微软开源的模型上下文协议，统一工具调用标准|插件生态的工具调用标准，兼容第三方MCP工具|MIT|4.8k+|业内新标准，支持海量第三方工具，快速扩展插件生态|
|Playwright|[https://github.com/microsoft/playwright](https://github.com/microsoft/playwright)|微软开源的浏览器自动化框架，支持所有主流浏览器|浏览器操作模块，网页自动化、Web界面控制|Apache 2.0|64k+|性能优异，兼容性好，支持无头模式，适合后台网页操作|
|pyserial|[https://github.com/pyserial/pyserial](https://github.com/pyserial/pyserial)|Python串口通信库，支持全平台串口读写、配置|串口通信模块，硬件设备控制、串口调试场景|BSD|3.2k+|稳定可靠，无依赖，适配所有Windows串口设备|
|langchain|[https://github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain)|LLM应用编排框架，支持工具调用、RAG、工作流编排|复杂工作流、RAG知识库、多工具链式调用场景|MIT|92k+|生态成熟，有大量可复用的工具与集成方案|
> （注：文档部分内容可能由 AI 生成）