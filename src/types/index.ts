/**
 * OpenOxygen Core Types
 *
 * Type definitions for all modules
 */

// ============================================================================
// Core Types
// ============================================================================

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

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

export type ToolResult = {
  success: boolean;
  data?: unknown;
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

export type SystemOperation =
  | "file.read"
  | "file.write"
  | "file.delete"
  | "file.list"
  | "shell.execute"
  | "browser.navigate"
  | "browser.click"
  | "browser.type";

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
