/**
<<<<<<< HEAD
 * OpenOxygen Core Types
=======
 * OpenOxygen - Core Type Definitions
>>>>>>> dev
 *
 * Type definitions for all modules
 */

<<<<<<< HEAD
// ============================================================================
// Core Types
// ============================================================================
=======
// === Runtime ===
>>>>>>> dev

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

<<<<<<< HEAD
export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  startTime?: number;
  endTime?: number;
  error?: string;
  result?: unknown;
}

export interface ExecutionContext {
  taskId: string;
  agentId?: string;
  userId?: string;
  workspace?: string;
  variables: Record<string, unknown>;
}

export type ExecutionMode = "sync" | "async" | "parallel" | "sequential";

export interface ExecutionPlan {
  id: string;
  steps: PlanStep[];
  mode: ExecutionMode;
}

export interface PlanStep {
  id: string;
  name: string;
  action: string;
  params?: Record<string, unknown>;
  dependsOn?: string[];
}

// ============================================================================
// Config Types
// ============================================================================

export interface OxygenConfig {
  version: string;
  name: string;
  description?: string;
  settings: Record<string, unknown>;
}

export interface OxygenRuntimeEnv {
  nodeVersion: string;
  platform: string;
  arch: string;
  version: string;
}

// ============================================================================
// Gateway Types
// ============================================================================

export interface OxygenEvent {
  type: string;
  payload: unknown;
  timestamp: number;
  source: string;
}

export type OxygenEventHandler = (event: OxygenEvent) => void | Promise<void>;

export interface ResolvedRoute {
  path: string;
  handler: string;
  params: Record<string, string>;
}

export interface RouteMatch {
  route: string;
  params: Record<string, string>;
  matched: boolean;
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionEntry {
  id: string;
  userId: string;
  createdAt: number;
  lastActive: number;
  data: Record<string, unknown>;
}

// ============================================================================
// Model Types
// ============================================================================

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  config: Record<string, unknown>;
}

// ============================================================================
// Tool Types
// ============================================================================
=======
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
>>>>>>> dev

export type ToolResult = {
  success: boolean;
  data?: unknown;
<<<<<<< HEAD
  output?: unknown;
  error?: string;
  durationMs?: number;
};

export type ToolInvocation = {
  toolName: string;
  params: Record<string, unknown>;
  timeout?: number;
};

// ============================================================================
// Plugin Types
// ============================================================================

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
}

export interface PluginContext {
  logger: unknown;
  config: Record<string, unknown>;
  api: unknown;
}

export interface PluginHook {
  event: string;
  handler: (context: PluginContext) => void | Promise<void>;
}

export interface OxygenPluginDefinition {
  manifest: PluginManifest;
  hooks?: PluginHook[];
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (
      params: Record<string, unknown>,
      ctx: PluginContext,
    ) => Promise<ToolResult>;
  }>;
}

// ============================================================================
// System Types
// ============================================================================

=======
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

>>>>>>> dev
export type SystemOperation =
  | "file.read"
  | "file.write"
  | "file.delete"
<<<<<<< HEAD
  | "file.list"
  | "shell.execute"
  | "browser.navigate"
  | "browser.click"
  | "browser.type";
=======
  | "network.request"
  | "process.spawn"
  | "process.kill"
  | "plugin.load"
  | "plugin.unload"
  | "config.update"
  | "auth.login"
  | "auth.logout";
>>>>>>> dev

export interface SystemCall {
  operation: SystemOperation;
  params: Record<string, unknown>;
}

// ============================================================================
// Inference Types
// ============================================================================

export interface InferenceRequest {
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
}

export interface InferenceResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface OxygenError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

<<<<<<< HEAD
// ============================================================================
// Skill Types
// ============================================================================

export type SkillHandler = (...args: any[]) => Promise<ToolResult>;

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  handler: SkillHandler;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

// ============================================================================
// Security Types
// ============================================================================

export interface Permission {
  resource: string;
  action: "read" | "write" | "execute" | "admin";
  granted: boolean;
}

export interface AuditLog {
  timestamp: number;
  action: string;
  userId: string;
  resource: string;
  result: "success" | "failure";
  details?: Record<string, unknown>;
}

// ============================================================================
// Memory Types
// ============================================================================

export interface MemoryChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface MemorySearchResult {
  chunk: MemoryChunk;
  score: number;
}

export interface MemorySource {
  id: string;
  type: string;
  name: string;
  content: string;
}

// ============================================================================
// Subtask Types
// ============================================================================

export interface SubTask {
  id: string;
  name: string;
  instruction: string;
  mode?: "sync" | "async";
  dependsOn?: string[];
  maxRetries?: number;
  timeoutMs?: number;
}
=======
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
>>>>>>> dev
