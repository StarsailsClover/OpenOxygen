/**
 * OpenOxygen — Structured LLM Output Module (26w15a)
 *
 * 解决 qwen3:4b thinking 模式下 response 为空的问题。
 * 兼容：
 *   1. 标准模型（response 字段直接输出 JSON）
 *   2. Thinking 模型（JSON 在 thinking 字段中）
 *   3. Ollama format:"json" 模式
 *   4. 任意模型的 fallback 提取
 *
 * 策略优先级：
 *   1. response 字段直接解析
 *   2. format:"json" 强制 JSON 模式
 *   3. thinking 字段提取（平衡括号法）
 *   4. 正则 fallback 提取关键字段
 */
export type StructuredOutputConfig = {
    ollamaUrl: string;
    model: string;
    timeoutMs: number;
    forceJsonFormat: boolean;
    useGenerateApi: boolean;
    maxRetries: number;
    temperature: number;
    numPredict: number;
};
export type StructuredResult<T> = {
    success: boolean;
    data: T | null;
    raw: string;
    source: "response" | "thinking" | "format_json" | "regex_fallback" | "none";
    model: string;
    durationMs: number;
    retries: number;
};
export declare function createDefaultConfig(overrides?: Partial<StructuredOutputConfig>): StructuredOutputConfig;
/**
 * 从文本中提取 JSON 对象（平衡括号法，支持嵌套）
 */
export declare function extractJSON(text: string): unknown | null;
/**
 * 正则 fallback：从文本中提取关键字段
 * 用于 JSON 完全无法解析时的最后手段
 */
export declare function regexFallback(text: string, fields: string[]): Record<string, string> | null;
/**
 * 调用 LLM 并获取结构化 JSON 输出
 * 自动处理 thinking 模式、format:json、fallback 提取
 */
export declare function structuredLLMCall<T = unknown>(prompt: string, config?: Partial<StructuredOutputConfig>): Promise<StructuredResult<T>>;
/**
 * 快速获取 Agent 决策 JSON
 */
export declare function getAgentDecision(prompt: string, model?: string): Promise<StructuredResult<{
    action: string;
    target?: string;
    params?: Record<string, unknown>;
    prediction?: string;
    reasoning?: string;
}>>;
/**
 * 快速获取 Agent 反思 JSON
 */
export declare function getAgentReflection(prompt: string, model?: string): Promise<StructuredResult<{
    predictionAccuracy: string;
    issue?: string;
    lesson?: string;
    nextAction?: string;
    confidence?: number;
}>>;
//# sourceMappingURL=index.d.ts.map