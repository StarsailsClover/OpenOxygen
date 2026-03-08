/**
 * OpenOxygen — Public API Exports
 *
 * 对外导出的公共接口，供外部集成使用。
 */

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  OxygenConfig,
  OxygenRuntimeEnv,
  OxygenEvent,
  OxygenEventHandler,
  ModelConfig,
  ModelProvider,
  AgentEntry,
  ChannelConfig,
  PluginConfig,
  SecurityConfig,
  MemoryConfig,
  VisionConfig,
  GatewayConfig,
  SessionEntry,
  ResolvedRoute,
  ExecutionPlan,
  PlanStep,
  ReflectionEntry,
  ToolInvocation,
  ToolResult,
  SystemOperation,
  MemorySearchResult,
  MemoryChunk,
  MemorySource,
  PluginManifest,
  OxygenPluginDefinition,
  PluginContext,
  PluginHookPhase,
  AuditEntry,
  AuditSeverity,
  InferenceMode,
} from "./types/index.js";

// ─── Core ───────────────────────────────────────────────────────────────────
export { defaultRuntime, createTestRuntime, assertSupportedRuntime, getSystemInfo } from "./core/runtime/index.js";
export { loadConfig, loadDotEnv, createDefaultConfig, resolveConfigPath, resolveStateDir, writeConfig, clearConfigCache } from "./core/config/index.js";
export { createGatewayServer } from "./core/gateway/index.js";
export type { GatewayServer, GatewayServerOptions } from "./core/gateway/index.js";
export { resolveRoute } from "./core/routing/index.js";
export type { ResolveRouteInput } from "./core/routing/index.js";
export {
  createSession, getSession, touchSession, deleteSession, listSessions,
  buildMainSessionKey, buildPeerSessionKey, parseSessionKey,
  loadSessionStore, saveSessionStore,
} from "./core/sessions/index.js";

// ─── Inference ──────────────────────────────────────────────────────────────
export { InferenceEngine } from "./inference/engine/index.js";
export type { ChatMessage, ChatRole, InferenceRequest, InferenceResponse, ToolDefinition } from "./inference/engine/index.js";
export { ModelRouter } from "./inference/router/index.js";
export type { RoutingStrategy, RoutingConstraints, RoutingDecision } from "./inference/router/index.js";
export { TaskPlanner, createEmptyPlan, addStep, getNextExecutableSteps, isPlanComplete } from "./inference/planner/index.js";
export { ReflectionEngine } from "./inference/reflection/index.js";
export type { ReflectionResult, ReflectionIssue } from "./inference/reflection/index.js";

// ─── Execution ──────────────────────────────────────────────────────────────
export { executeSystemOperation, fileRead, fileWrite, fileList, processList, screenCapture, clipboardRead, clipboardWrite } from "./execution/windows/index.js";
export { OxygenUltraVision } from "./execution/vision/index.js";
export type { UIElement, ScreenAnalysis, VisionQuery, VisionResult } from "./execution/vision/index.js";
export { executeSandboxed } from "./execution/sandbox/index.js";

// ─── Memory ─────────────────────────────────────────────────────────────────
export { VectorStore } from "./memory/vector/index.js";
export { MemoryManager } from "./memory/lifecycle/index.js";

// ─── Security ───────────────────────────────────────────────────────────────
export { AuditTrail } from "./security/audit/index.js";
export { checkPermission, assertPermission } from "./security/permissions/index.js";

// ─── Plugins ────────────────────────────────────────────────────────────────
export { PluginRegistry, loadPlugins, runHooks } from "./plugins/loader/index.js";
export { definePlugin, createToolResult, createToolError } from "./plugins/sdk/index.js";

// ─── Compatibility ──────────────────────────────────────────────────────────
export { translateOpenClawConfig, validateOpenClawSkill } from "./compat/openclaw/index.js";

// ─── Utilities ──────────────────────────────────────────────────────────────
export { generateId, generateShortId, sleep, withTimeout, isWindows, TypedEventBus } from "./utils/index.js";
export { createSubsystemLogger, setLogLevel, enableConsoleCapture } from "./logging/index.js";
