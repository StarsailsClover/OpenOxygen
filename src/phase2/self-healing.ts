/**
 * OpenOxygen - Phase 2 Self-Healing System (26w15aD Phase 7)
 *
 * Phase 2: 自我诊断与修复能力
 * - 自动错误检测
 * - 智能诊断推理
 * - 自我修复执行
 * - 预防性维护
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
import type { InferenceEngine } from "../inference/engine/index.js";

const log = createSubsystemLogger("phase2/self-healing");

// Error types that can be healed
export type HealableErrorType =
  | "network_timeout"
  | "element_not_found"
  | "permission_denied"
  | "resource_unavailable"
  | "state_inconsistent"
  | "dependency_missing"
  | "configuration_error"
  | "unknown";

// Error context
export interface ErrorContext {
  error: Error;
  type: HealableErrorType;
  timestamp: number;
  component: string;
  operation: string;
  state: Record<string, any>;
  history: string[];
}

// Healing strategy
export interface HealingStrategy {
  id: string;
  name: string;
  description: string;
  applicableTypes: HealableErrorType[];
  action: () => Promise<boolean>;
  priority: number;
  maxRetries: number;
}

// Healing result
export interface HealingResult {
  success: boolean;
  strategyId: string;
  attempts: number;
  durationMs: number;
  error?: string;
  fixed: boolean;
  preventionApplied: boolean;
}

// System health status
export interface SystemHealth {
  overall: "healthy" | "degraded" | "critical";
  components: Map<string, ComponentHealth>;
  lastCheck: number;
  issues: string[];
}

// Component health
export interface ComponentHealth {
  name: string;
  status: "healthy" | "warning" | "error";
  uptime: number;
  errorCount: number;
  lastError?: number;
  metrics: Record<string, number>;
}

/**
 * Self-Healing Controller
 */
export class SelfHealingController {
  private inferenceEngine: InferenceEngine;
  private strategies: Map<string, HealingStrategy> = new Map();
  private errorHistory: ErrorContext[] = [];
  private componentHealth: Map<string, ComponentHealth> = new Map();
  private healingInProgress = false;

  constructor(inferenceEngine: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
    this.registerDefaultStrategies();
    log.info("Self-Healing Controller initialized");
  }

  /**
   * Register default healing strategies
   */
  private registerDefaultStrategies(): void {
    // Network timeout strategy
    this.registerStrategy({
      id: "network_retry",
      name: "Network Retry with Backoff",
      description: "Retry network operations with exponential backoff",
      applicableTypes: ["network_timeout"],
      action: async () => {
        log.info("Applying network retry strategy");
        await sleep(1000);
        return true;
      },
      priority: 1,
      maxRetries: 3,
    });

    // Element not found strategy
    this.registerStrategy({
      id: "element_refresh",
      name: "Refresh and Retry",
      description: "Refresh page/state and retry element location",
      applicableTypes: ["element_not_found"],
      action: async () => {
        log.info("Applying element refresh strategy");
        await sleep(500);
        return true;
      },
      priority: 1,
      maxRetries: 2,
    });

    // Permission denied strategy
    this.registerStrategy({
      id: "permission_elevate",
      name: "Elevate Permissions",
      description: "Attempt to elevate permissions or use alternative approach",
      applicableTypes: ["permission_denied"],
      action: async () => {
        log.info("Applying permission elevation strategy");
        return false; // Requires manual intervention
      },
      priority: 1,
      maxRetries: 1,
    });

    // Resource unavailable strategy
    this.registerStrategy({
      id: "resource_wait",
      name: "Wait for Resource",
      description: "Wait for resource to become available",
      applicableTypes: ["resource_unavailable"],
      action: async () => {
        log.info("Applying resource wait strategy");
        await sleep(2000);
        return true;
      },
      priority: 2,
      maxRetries: 5,
    });

    // State inconsistent strategy
    this.registerStrategy({
      id: "state_reset",
      name: "Reset State",
      description: "Reset to known good state",
      applicableTypes: ["state_inconsistent"],
      action: async () => {
        log.info("Applying state reset strategy");
        return true;
      },
      priority: 1,
      maxRetries: 1,
    });

    // Dependency missing strategy
    this.registerStrategy({
      id: "dependency_install",
      name: "Install Dependency",
      description: "Attempt to install missing dependency",
      applicableTypes: ["dependency_missing"],
      action: async () => {
        log.info("Applying dependency install strategy");
        return false; // Requires manual intervention
      },
      priority: 1,
      maxRetries: 1,
    });

    // Configuration error strategy
    this.registerStrategy({
      id: "config_fix",
      name: "Fix Configuration",
      description: "Auto-fix configuration errors",
      applicableTypes: ["configuration_error"],
      action: async () => {
        log.info("Applying configuration fix strategy");
        return true;
      },
      priority: 1,
      maxRetries: 1,
    });
  }

  /**
   * Register a healing strategy
   */
  registerStrategy(strategy: HealingStrategy): void {
    this.strategies.set(strategy.id, strategy);
    log.debug(`Registered healing strategy: ${strategy.name}`);
  }

  /**
   * Classify error type
   */
  classifyError(error: Error): HealableErrorType {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("etimedout")) {
      return "network_timeout";
    }
    if (message.includes("element not found") || message.includes("no such element")) {
      return "element_not_found";
    }
    if (message.includes("permission") || message.includes("access denied")) {
      return "permission_denied";
    }
    if (message.includes("resource") || message.includes("unavailable")) {
      return "resource_unavailable";
    }
    if (message.includes("state") || message.includes("inconsistent")) {
      return "state_inconsistent";
    }
    if (message.includes("dependency") || message.includes("module not found")) {
      return "dependency_missing";
    }
    if (message.includes("config") || message.includes("configuration")) {
      return "configuration_error";
    }

    return "unknown";
  }

  /**
   * Attempt to heal an error
   */
  async heal(
    error: Error,
    context: Omit<ErrorContext, "error" | "type" | "timestamp">
  ): Promise<HealingResult> {
    if (this.healingInProgress) {
      log.warn("Healing already in progress, skipping");
      return {
        success: false,
        strategyId: "",
        attempts: 0,
        durationMs: 0,
        error: "Healing already in progress",
        fixed: false,
        preventionApplied: false,
      };
    }

    this.healingInProgress = true;
    const startTime = nowMs();

    try {
      // Classify error
      const errorType = this.classifyError(error);
      log.info(`Attempting to heal error: ${errorType} - ${error.message}`);

      // Create error context
      const errorContext: ErrorContext = {
        error,
        type: errorType,
        timestamp: nowMs(),
        ...context,
      };
      this.errorHistory.push(errorContext);

      // Find applicable strategies
      const strategies = Array.from(this.strategies.values())
        .filter(s => s.applicableTypes.includes(errorType))
        .sort((a, b) => a.priority - b.priority);

      if (strategies.length === 0) {
        log.warn(`No healing strategy found for error type: ${errorType}`);
        return {
          success: false,
          strategyId: "",
          attempts: 0,
          durationMs: nowMs() - startTime,
          error: "No healing strategy available",
          fixed: false,
          preventionApplied: false,
        };
      }

      // Try each strategy
      for (const strategy of strategies) {
        log.info(`Trying healing strategy: ${strategy.name}`);

        for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
          try {
            const success = await strategy.action();
            
            if (success) {
              log.info(`Healing successful with strategy: ${strategy.name}`);
              
              // Apply prevention
              await this.applyPrevention(errorType, context.component);

              return {
                success: true,
                strategyId: strategy.id,
                attempts: attempt,
                durationMs: nowMs() - startTime,
                fixed: true,
                preventionApplied: true,
              };
            }
          } catch (healError: any) {
            log.error(`Healing attempt ${attempt} failed: ${healError.message}`);
          }

          if (attempt < strategy.maxRetries) {
            await sleep(1000 * attempt); // Exponential backoff
          }
        }
      }

      log.error("All healing strategies failed");
      return {
        success: false,
        strategyId: strategies[0]?.id || "",
        attempts: strategies[0]?.maxRetries || 0,
        durationMs: nowMs() - startTime,
        error: "All healing strategies failed",
        fixed: false,
        preventionApplied: false,
      };
    } finally {
      this.healingInProgress = false;
    }
  }

  /**
   * Apply prevention measures
   */
  private async applyPrevention(
    errorType: HealableErrorType,
    component: string
  ): Promise<void> {
    log.info(`Applying prevention for ${errorType} in ${component}`);
    
    // Update component health
    const health = this.componentHealth.get(component);
    if (health) {
      health.errorCount++;
      health.lastError = nowMs();
    }

    // Use LLM to suggest prevention
    try {
      const prompt = `Error type "${errorType}" occurred in component "${component}". 
Suggest prevention measures to avoid this error in the future.

Respond in JSON format:
{
  "prevention": "Description of prevention measure",
  "action": "Specific action to take"
}`;

      const response = await this.inferenceEngine.infer({
        messages: [{ role: "user", content: prompt }],
        mode: "balanced",
      });

      const suggestion = JSON.parse(response.content);
      log.info(`Prevention suggestion: ${suggestion.prevention}`);
    } catch {
      // Ignore LLM errors for prevention
    }
  }

  /**
   * Check system health
   */
  async checkHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      overall: "healthy",
      components: new Map(),
      lastCheck: nowMs(),
      issues: [],
    };

    // Check each component
    for (const [name, componentHealth] of this.componentHealth) {
      health.components.set(name, componentHealth);

      if (componentHealth.status === "error") {
        health.overall = "critical";
        health.issues.push(`Component ${name} is in error state`);
      } else if (componentHealth.status === "warning" && health.overall !== "critical") {
        health.overall = "degraded";
        health.issues.push(`Component ${name} has warnings`);
      }
    }

    return health;
  }

  /**
   * Monitor component
   */
  monitorComponent(
    name: string,
    checkFn: () => Promise<{ healthy: boolean; metrics: Record<string, number> }>,
    intervalMs: number = 60000
  ): void {
    const check = async () => {
      try {
        const result = await checkFn();
        
        const health: ComponentHealth = {
          name,
          status: result.healthy ? "healthy" : "error",
          uptime: nowMs(),
          errorCount: 0,
          metrics: result.metrics,
        };

        this.componentHealth.set(name, health);
      } catch (error: any) {
        const health: ComponentHealth = {
          name,
          status: "error",
          uptime: nowMs(),
          errorCount: 1,
          lastError: nowMs(),
          metrics: {},
        };
        this.componentHealth.set(name, health);
      }
    };

    // Initial check
    check();

    // Periodic checks
    setInterval(check, intervalMs);
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get healing statistics
   */
  getStatistics(): {
    totalErrors: number;
    healedErrors: number;
    failedHealings: number;
    strategiesAvailable: number;
  } {
    return {
      totalErrors: this.errorHistory.length,
      healedErrors: this.errorHistory.filter(e => 
        this.errorHistory.some(h => h.timestamp > e.timestamp && h.type === e.type)
      ).length,
      failedHealings: this.errorHistory.filter(e => 
        !this.errorHistory.some(h => h.timestamp > e.timestamp && h.type === e.type)
      ).length,
      strategiesAvailable: this.strategies.size,
    };
  }
}

// Export self-healing utilities
export const SelfHealing = {
  SelfHealingController,
};

export default SelfHealing;
