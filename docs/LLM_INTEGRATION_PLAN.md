# OpenOxygen LLM 集成详细计划

## 目标
实现流程图要求的完整 LLM 驱动交互机制

## 阶段 1: 基础设施 (B - 查看现有代码)
- [ ] 检查现有 Ollama 连接代码
- [ ] 检查 Python 桥接实现
- [ ] 确定最佳集成点

## 阶段 2: 核心模块实现 (A - 开始实现)

### 2.1 LLM Service 基础设施
```
src/llm/
├── index.ts          # 主入口
├── ollama.ts         # Ollama 连接
├── judge.ts          # 复杂度判断
├── clarify.ts        # 需求澄清
├── cot.ts            # CoT 推理
└── deliberation.ts   # 多AI研讨
```

### 2.2 复杂度判断层 (llmJudgeComplexity)
**输入**: 用户指令
**输出**: {
  complexity: 'simple' | 'medium' | 'complex',
  needsAgent: boolean,
  needsReflection: boolean,
  reasoning: string
}

**Prompt 模板**:
```
分析以下用户指令的复杂度：
"{instruction}"

判断标准：
- simple: 单一步骤，明确目标，无需外部工具
- medium: 多步骤但线性，可能需要1-2个工具
- complex: 多步骤有依赖，需要多个工具协作，需要规划

输出 JSON：
{
  "complexity": "simple|medium|complex",
  "needsAgent": true|false,
  "needsReflection": true|false,
  "reasoning": "判断理由"
}
```

### 2.3 需求澄清 (clarifyRequirement)
**输入**: 用户指令
**输出**: {
  isClear: boolean,
  questions?: string[],
  clarifiedInstruction?: string
}

**Prompt 模板**:
```
检查以下指令是否清晰完整：
"{instruction}"

检查项：
1. 目标是否明确？
2. 输入/输出是否清晰？
3. 约束条件是否说明？
4. 成功标准是否定义？

如果不清晰，列出需要询问用户的问题。

输出 JSON：
{
  "isClear": true|false,
  "questions": ["问题1", "问题2"],
  "suggestedClarification": "建议的澄清后指令"
}
```

### 2.4 CoT 推理 (chainOfThought)
**输入**: 复杂指令
**输出**: {
  reasoning: string[],
  conclusion: string,
  steps: string[]
}

**Prompt 模板**:
```
使用思维链(Chain-of-Thought)解决以下问题：
"{instruction}"

要求：
1. 逐步思考，展示推理过程
2. 每一步都要有逻辑依据
3. 最后给出明确的执行步骤

输出 JSON：
{
  "reasoning": ["步骤1推理", "步骤2推理", ...],
  "conclusion": "最终结论",
  "steps": ["执行步骤1", "执行步骤2", ...]
}
```

### 2.5 多AI研讨 (multiAIDeliberation)
**输入**: 问题上下文 + Agent 列表
**输出**: {
  consensus: string,
  disagreements: string[],
  finalDecision: string,
  agentOpinions: Record<string, string>
}

**研讨流程**:
1. 每个 Agent 独立给出意见
2. 收集所有意见
3. 识别共识和分歧
4. 针对分歧点深入讨论
5. 达成最终决策

## 阶段 3: 主流程重构

### 3.1 新主流程控制器
```typescript
export async function processRequest(instruction: string, context: Context) {
  // 1. LLM 判断复杂度
  const judgment = await llmJudgeComplexity(instruction);
  
  // 2. 根据复杂度路由
  if (judgment.complexity === 'simple' && !judgment.needsAgent) {
    // 直接 LLM 回答
    return await directLLMResponse(instruction);
  }
  
  if (judgment.complexity === 'medium' && judgment.needsAgent) {
    // 中等复杂度 + 需要 Agent
    return await mediumComplexityWithAgent(instruction, context);
  }
  
  if (judgment.complexity === 'complex') {
    // 复杂任务
    return await complexTaskHandler(instruction, context);
  }
}
```

### 3.2 中等复杂度处理流程
```typescript
async function mediumComplexityWithAgent(instruction: string, context: Context) {
  // 1. 需求澄清
  const clarification = await clarifyRequirement(instruction);
  if (!clarification.isClear) {
    return { type: 'clarification', questions: clarification.questions };
  }
  
  // 2. 任务分解
  const plan = await decomposeTask(clarification.clarifiedInstruction);
  
  // 3. DAG 调度
  const dag = createDAG(plan.subtasks);
  
  // 4. 启动 OUV
  const ouv = new OxygenUltraVision();
  
  // 5. 执行循环
  for (const task of dag.inOrder()) {
    // 决策执行方式
    const strategy = await decideExecutionStrategy(task);
    
    // 执行任务
    const result = await executeTask(task, strategy);
    
    // 实时反思
    const reflection = await realTimeReflection(result);
    if (reflection.needsAdjustment) {
      await adjustPlan(dag, reflection.adjustments);
    }
  }
}
```

### 3.3 复杂任务处理流程
```typescript
async function complexTaskHandler(instruction: string, context: Context) {
  // 1. 需求澄清
  const clarification = await clarifyRequirement(instruction);
  if (!clarification.isClear) {
    return { type: 'clarification', questions: clarification.questions };
  }
  
  // 2. CoT 推理
  const cot = await chainOfThought(clarification.clarifiedInstruction);
  
  // 3. 搜索记忆
  const memories = await searchMemory(cot.conclusion);
  
  // 4. 多AI研讨
  const deliberation = await multiAIDeliberation(
    cot.conclusion,
    ['agent1', 'agent2', 'agent3']
  );
  
  // 5. DAG 调度 + 执行
  // ... (同中等复杂度)
}
```

## 技术实现细节

### Ollama 调用
```typescript
const OLLAMA_HOST = 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen2.5:7b';

async function callOllama(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: 'json'
    })
  });
  
  const data = await response.json();
  return data.response;
}
```

### 错误处理
- LLM 不可用：回退到规则匹配
- JSON 解析失败：重试或返回默认值
- 超时：设置 30 秒超时

### 性能优化
- 缓存常见判断结果
- 并行调用多个 LLM（如果有）
- 异步非阻塞

## 验收标准

- [ ] 复杂度判断准确率 > 80%
- [ ] 需求澄清能识别 90% 的不清晰指令
- [ ] CoT 推理步骤合理可解释
- [ ] 多AI研讨能达成共识或明确分歧
- [ ] 完整流程端到端测试通过
