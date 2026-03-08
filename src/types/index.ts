/**
 * OpenOxygen — Core Type Definitions
 *
 * 全局基础类型，所有模块共享。
 * 设计原则：与 OpenClaw 接口协议对齐但完全独立实现。
 */

// ─── Runtime ────────────────────────────────────────────────────────────────

export type OxygenRuntimeEnv = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  exit: (code: number) => void;
  platform: "win32" | "linux" | "darwin";
};

// ─── Config ─────────────────────────────────────────────────────────────────

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "ollama"
  | "stepfun"
  | "custom";

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
  /** Enable full audit trail */
  auditEnabled: boolean;
  /** Allowed filesystem paths (glob patterns) */
  allowedPaths?: string[];
  /** Blocked executable patterns */
  blockedExecutables?: string[];
  /** Enable transaction rollback for destructive ops */
  rollbackEnabled: boolean;
};

export type MemoryConfig = {
  backend: "builtin" | "external";
  embeddingProvider?: ModelProvider;
  embeddingModel?: string;
  /** Max chunks in vector store */
  maxChunks?: number;
  /** Lifecycle: auto-expire after N days */
  ttlDays?: number;
  /** Hybrid search: vector + keyword */
  hybridSearch: boolean;
  /** Extra memory paths to index */
  extraPaths?: string[];
};

export type VisionConfig = {
  enabled: boolean;
  /** Dual-pipeline: fast (lightweight) + precise (heavy model) */
  fastModel?: string;
  preciseModel?: string;
  /** Screenshot capture interval in ms */
  captureIntervalMs?: number;
  /** UI element detection confidence threshold */
  confidenceThreshold?: number;
};

export type AgentEntry = {
  id: string;
  name?: string;
  workspace?: string;
  model?: ModelConfig;
  skills?: string[];
  memorySearch?: Partial<MemoryConfig>;
  identity?: { systemPrompt?: string; persona?: string };
  sandbox?: { enabled: boolean; timeoutMs?: number };
  tools?: string[];
};

export type ChannelConfig = {
  id: string;
  type: string;
  enabled: boolean;
  config?: Record<string, unknown>;
};

export type PluginConfig = {
  name: string;
  enabled: boolean;
  path?: string;
  config?: Record<string, unknown>;
};

export type OxygenConfig = {
  version: string;
  gateway: GatewayConfig;
  security: SecurityConfig;
  memory: MemoryConfig;
  vision: VisionConfig;
  models: ModelConfig[];
  agents: { default?: string; list: AgentEntry[] };
  channels: ChannelConfig[];
  plugins: PluginConfig[];
  /** OpenClaw compatibility mode */
  compat?: { openclaw?: { enabled: boolean; configPath?: string } };
  /** Raw env overrides */
  env?: Record<string, string>;
};

// ─── Session & Routing ──────────────────────────────────────────────────────

export type SessionScope = "per-sender" | "global" | "per-channel";

export type SessionEntry = {
  id: string;
  key: string;
  agentId: string;
  channelId?: string;
  createdAt: number;
  lastActiveAt: number;
  metadata?: Record<string, unknown>;
};

export type RouteMatch =
  | "binding.peer"
  | "binding.channel"
  | "binding.account"
  | "default";

export type ResolvedRoute = {
  agentId: string;
  channelId: string;
  accountId: string;
  sessionKey: string;
  mainSessionKey: string;
  matchedBy: RouteMatch;
};

// ─── Inference & Planning ───────────────────────────────────────────────────

export type InferenceMode = "fast" | "balanced" | "deep";

export type PlanStep = {
  id: string;
  action: string;
  params: Record<string, unknown>;
  dependencies: string[];
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: unknown;
  error?: string;
};

export type ExecutionPlan = {
  id: string;
  goal: string;
  steps: PlanStep[];
  createdAt: number;
  updatedAt: number;
  status: "planning" | "executing" | "reflecting" | "completed" | "failed";
  reflections: ReflectionEntry[];
};

export type ReflectionEntry = {
  stepId: string;
  observation: string;
  adjustment?: string;
  timestamp: number;
};

// ─── Execution ──────────────────────────────────────────────────────────────

export type ToolInvocation = {
  toolName: string;
  params: Record<string, unknown>;
  timeout?: number;
};

export type ToolResult = {
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
};

export type SystemOperation =
  | "file.read"
  | "file.write"
  | "file.delete"
  | "file.list"
  | "process.start"
  | "process.kill"
  | "process.list"
  | "registry.read"
  | "registry.write"
  | "network.request"
  | "clipboard.read"
  | "clipboard.write"
  | "screen.capture"
  | "input.keyboard"
  | "input.mouse";

// ─── Memory ─────────────────────────────────────────────────────────────────

export type MemorySource = "memory" | "sessions" | "workspace";

export type MemorySearchResult = {
  path: string;
  startLine: number;
  endLine: number;
  score: number;
  snippet: string;
  source: MemorySource;
  citation?: string;
};

export type MemoryChunk = {
  id: string;
  content: string;
  embedding?: number[];
  source: MemorySource;
  path: string;
  startLine: number;
  endLine: number;
  createdAt: number;
  expiresAt?: number;
};

// ─── Plugin SDK ─────────────────────────────────────────────────────────────

export type PluginManifest = {
  name: string;
  version: string;
  description?: string;
  author?: string;
  entryPoint: string;
  permissions?: SystemOperation[];
  configSchema?: Record<string, unknown>;
};

export type PluginContext = {
  config: Record<string, unknown>;
  logger: Pick<OxygenRuntimeEnv, "log" | "error" | "warn">;
  runtime: OxygenRuntimeEnv;
};

export type PluginHookPhase =
  | "before-inference"
  | "after-inference"
  | "before-execution"
  | "after-execution"
  | "on-message"
  | "on-error";

export type PluginHook = {
  phase: PluginHookPhase;
  priority?: number;
  handler: (ctx: PluginContext, payload: unknown) => Promise<unknown>;
};

export type OxygenPluginDefinition = {
  manifest: PluginManifest;
  hooks?: PluginHook[];
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (params: Record<string, unknown>, ctx: PluginContext) => Promise<ToolResult>;
  }>;
  activate?: (ctx: PluginContext) => Promise<void>;
  deactivate?: (ctx: PluginContext) => Promise<void>;
};

// ─── Audit ──────────────────────────────────────────────────────────────────

export type AuditSeverity = "info" | "warn" | "critical";

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

// ─── Events ─────────────────────────────────────────────────────────────────

export type OxygenEvent =
  | { type: "gateway.started"; port: number }
  | { type: "gateway.stopped" }
  | { type: "agent.message"; agentId: string; sessionKey: string; content: string }
  | { type: "agent.tool-call"; agentId: string; tool: string }
  | { type: "plan.created"; planId: string }
  | { type: "plan.step-completed"; planId: string; stepId: string }
  | { type: "plan.completed"; planId: string }
  | { type: "plan.failed"; planId: string; error: string }
  | { type: "memory.synced"; chunks: number }
  | { type: "plugin.loaded"; name: string }
  | { type: "plugin.error"; name: string; error: string }
  | { type: "security.violation"; entry: AuditEntry }
  | { type: "vision.capture"; timestamp: number };

export type OxygenEventHandler = (event: OxygenEvent) => void | Promise<void>;
