/**
 * OpenOxygen - Core Type Definitions
 *
 * 全局基础类型，所有模块共享。
 * 设计原则：与 OpenClaw 接口协议对齐但完全独立实现。
 */

// === Runtime ===

export type OxygenRuntimeEnv = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  exit: (code: number) => void;
  platform: "win32" | "linux" | "darwin";
};

// === Config ===

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "ollama"
  | "stepfun"
  | "custom";

// === Task Execution Strategies ===

export type ExecutionMode = "terminal" | "gui" | "browser" | "hybrid" | "auto";

export type TaskStrategy = {
  mode: ExecutionMode;
  confidence: number;
  reason: string;
  fallback?: ExecutionMode;
};

export type ModelConfig = {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  /** Provider-specific extra params */
  extra?: Record<string, unknown>;
};

export type GatewayAuthConfig = {
  mode: "token" | "password" | "none";
  token?: string;
  password?: string;
};

export type GatewayConfig = {
  host: string;
  port: number;
  auth: GatewayAuthConfig;
  cors?: { origins?: string[] };
  rateLimit?: { windowMs?: number; maxRequests?: number };
};

export type SecurityConfig = {
  /** Minimum privilege level for system operations */
  privilegeLevel: "minimal" | "standard" | "elevated";
  /** Enable audit logging */
  auditEnabled: boolean;
  /** Enable rollback for operations */
  rollbackEnabled: boolean;
};

export type MemoryConfig = {
  /** Memory backend type */
  backend: "builtin" | "redis" | "sqlite";
  /** Enable hybrid search (vector + keyword) */
  hybridSearch: boolean;
  /** Max memory entries */
  maxEntries?: number;
};

export type VisionConfig = {
  /** Enable vision capabilities */
  enabled: boolean;
  /** Primary VLM model */
  primaryModel?: string;
  /** Enable UIA fallback */
  uiaFallback?: boolean;
};

export type AgentConfig = {
  list: Array<{
    id: string;
    name: string;
    type: "worker" | "coordinator" | "specialist";
    capabilities: string[];
  }>;
};

export type ChannelConfig = {
  id: string;
  type: "websocket" | "sse" | "http";
  enabled: boolean;
};

export type PluginConfig = {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  config?: Record<string, unknown>;
};

export type OxygenConfig = {
  version: string;
  gateway: GatewayConfig;
  security: SecurityConfig;
  memory: MemoryConfig;
  vision: VisionConfig;
  models: ModelConfig[];
  agents: AgentConfig;
  channels: ChannelConfig[];
  plugins: PluginConfig[];
};

// === Tool System ===

export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
};

export type ToolInvocation = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: number;
};

// === Memory System ===

export type MemoryChunk = {
  id: string;
  content: string;
  vector?: number[];
  metadata?: Record<string, unknown>;
  source?: string;
  createdAt: number;
};

export type MemoryConfig = {
  dimension?: number;
  maxChunks?: number;
  similarityThreshold?: number;
};

export type MemorySearchResult = {
  chunk: MemoryChunk;
  score: number;
  method: "vector" | "bm25" | "hybrid";
};

export type MemorySource = {
  type: "conversation" | "document" | "code" | "web";
  id: string;
  title?: string;
};

// === Session System ===

export type SessionEntry = {
  id: string;
  key: string;
  agentId: string;
  accountId?: string;
  createdAt: number;
  lastActiveAt: number;
  metadata?: Record<string, unknown>;
};

// === Audit System ===

export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export type SystemOperation =
  | "file.read"
  | "file.write"
  | "file.delete"
  | "network.request"
  | "process.spawn"
  | "process.kill"
  | "plugin.load"
  | "plugin.unload"
  | "config.update"
  | "auth.login"
  | "auth.logout";

export type AuditEntry = {
  id: string;
  timestamp: number;
  operation: SystemOperation | string;
  actor: string;
  target?: string;
  severity: AuditSeverity;
  details?: Record<string, unknown>;
  rollbackable: boolean;
};

// === Event System ===

export type OxygenEvent = {
  type: string;
  id: string;
  timestamp: number;
  source: string;
  data: unknown;
};

export type OxygenEventHandler = (event: OxygenEvent) => void | Promise<void>;

// === Permission System ===

export type Permission = {
  resource: string;
  action: string;
  allowed: boolean;
};

export type PermissionCheck = {
  granted: boolean;
  reason?: string;
};

export type PermissionContext = Record<string, unknown>;

// === Inference ===

export type InferenceMode = "fast" | "balanced" | "deep";

// === Execution ===

export type ExecutionPlan = {
  id: string;
  goal: string;
  steps: PlanStep[];
  createdAt: number;
  updatedAt: number;
  status: "planning" | "executing" | "completed" | "failed";
  reflections: ReflectionEntry[];
};

export type PlanStep = {
  id: string;
  action: string;
  params: Record<string, unknown>;
  dependencies: string[];
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: unknown;
  error?: string;
};

export type ReflectionEntry = {
  stepId: string;
  observation: string;
  adjustment?: string;
  timestamp: number;
};

// === Plugin System ===

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  entry: string;
};

export type PluginHookPhase =
  | "before_init"
  | "after_init"
  | "before_execute"
  | "after_execute"
  | "before_shutdown";

export type PluginHook = {
  phase: PluginHookPhase;
  handler: () => void | Promise<void>;
  priority: number;
};

export type PluginContext = {
  config: Record<string, unknown>;
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
};

export type OxygenPluginDefinition = {
  manifest: PluginManifest;
  init: (context: PluginContext) => void | Promise<void>;
  hooks?: PluginHook[];
};

// === Exports ===

export {};
