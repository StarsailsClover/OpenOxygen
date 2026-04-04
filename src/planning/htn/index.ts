/**
 * HTN (Hierarchical Task Network) Planner
 *
 * Core implementation of HTN planning algorithm
 * Supports task decomposition, method selection, and plan generation
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type { ToolResult } from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";

const log = createSubsystemLogger("planning/htn");

// ============================================================================
// HTN Types
// ============================================================================

export interface HTNTask {
  id: string;
  name: string;
  type: "primitive" | "compound";
  parameters?: Record<string, unknown>;
  preconditions?: HTNCondition[];
  effects?: HTNEffect[];
}

export interface HTNPrimitiveTask extends HTNTask {
  type: "primitive";
  action: string;
  executor: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface HTNCompoundTask extends HTNTask {
  type: "compound";
  methods: HTNMethod[];
}

export interface HTNMethod {
  id: string;
  name: string;
  preconditions?: HTNCondition[];
  subtasks: HTNTask[];
}

export interface HTNCondition {
  type: "equals" | "notEquals" | "greaterThan" | "lessThan" | "exists" | "custom";
  field: string;
  value?: unknown;
  evaluator?: (state: HTNState) => boolean;
}

export interface HTNEffect {
  type: "set" | "add" | "remove" | "custom";
  field: string;
  value?: unknown;
  executor?: (state: HTNState) => HTNState;
}

export interface HTNState {
  [key: string]: unknown;
}

export interface HTNPlan {
  id: string;
  tasks: HTNPrimitiveTask[];
  totalCost: number;
  estimatedDuration: number;
  createdAt: number;
}

export interface HTNDomain {
  id: string;
  name: string;
  tasks: Map<string, HTNTask>;
  initialState: HTNState;
}

export interface HTNPlanningResult {
  success: boolean;
  plan?: HTNPlan;
  error?: string;
  durationMs: number;
  decompositionDepth: number;
}

// ============================================================================
// HTN Planner
// ============================================================================

export class HTNPlanner {
  private domain: HTNDomain;
  private maxDepth: number;
  private currentDepth: number = 0;

  constructor(domain: HTNDomain, maxDepth: number = 10) {
    this.domain = domain;
    this.maxDepth = maxDepth;
    log.info(`HTNPlanner initialized for domain: ${domain.name}`);
  }

  /**
   * Generate plan for goal task
   */
  async plan(goalTaskName: string): Promise<HTNPlanningResult> {
    const startTime = nowMs();
    this.currentDepth = 0;

    log.info(`Starting HTN planning for: ${goalTaskName}`);

    try {
      const goalTask = this.domain.tasks.get(goalTaskName);
      if (!goalTask) {
        return {
          success: false,
          error: `Goal task not found: ${goalTaskName}`,
          durationMs: nowMs() - startTime,
          decompositionDepth: 0,
        };
      }

      const state = { ...this.domain.initialState };
      const plan = await this.decomposeTask(goalTask, state);

      if (!plan) {
        return {
          success: false,
          error: "Failed to decompose goal task",
          durationMs: nowMs() - startTime,
          decompositionDepth: this.currentDepth,
        };
      }

      const durationMs = nowMs() - startTime;

      log.info(
        `HTN planning complete: ${plan.tasks.length} tasks in ${durationMs}ms`,
      );

      return {
        success: true,
        plan,
        durationMs,
        decompositionDepth: this.currentDepth,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: nowMs() - startTime,
        decompositionDepth: this.currentDepth,
      };
    }
  }

  /**
   * Decompose task into primitive tasks
   */
  private async decomposeTask(
    task: HTNTask,
    state: HTNState,
  ): Promise<HTNPlan | null> {
    // Check depth limit
    if (this.currentDepth >= this.maxDepth) {
      log.warn(`Max decomposition depth reached: ${this.maxDepth}`);
      return null;
    }

    this.currentDepth++;

    try {
      // Check preconditions
      if (task.preconditions && !this.checkPreconditions(task.preconditions, state)) {
        log.debug(`Preconditions not met for task: ${task.name}`);
        return null;
      }

      // Handle primitive tasks
      if (task.type === "primitive") {
        const primitiveTask = task as HTNPrimitiveTask;
        return {
          id: generateId("plan"),
          tasks: [primitiveTask],
          totalCost: 1,
          estimatedDuration: 1000, // Default 1s per task
          createdAt: nowMs(),
        };
      }

      // Handle compound tasks
      if (task.type === "compound") {
        const compoundTask = task as HTNCompoundTask;
        return await this.decomposeCompoundTask(compoundTask, state);
      }

      return null;
    } finally {
      this.currentDepth--;
    }
  }

  /**
   * Decompose compound task using methods
   */
  private async decomposeCompoundTask(
    task: HTNCompoundTask,
    state: HTNState,
  ): Promise<HTNPlan | null> {
    // Try each method
    for (const method of task.methods) {
      // Check method preconditions
      if (method.preconditions && !this.checkPreconditions(method.preconditions, state)) {
        log.debug(`Method ${method.name} preconditions not met`);
        continue;
      }

      // Try to decompose all subtasks
      const subPlans: HTNPlan[] = [];
      let valid = true;

      for (const subtask of method.subtasks) {
        const subPlan = await this.decomposeTask(subtask, state);
        if (!subPlan) {
          valid = false;
          break;
        }
        subPlans.push(subPlan);

        // Apply effects to state for next subtask
        if (subtask.effects) {
          this.applyEffects(subtask.effects, state);
        }
      }

      if (valid) {
        // Merge sub-plans
        return this.mergePlans(subPlans);
      }
    }

    log.warn(`No valid method found for compound task: ${task.name}`);
    return null;
  }

  /**
   * Check if preconditions are met
   */
  private checkPreconditions(conditions: HTNCondition[], state: HTNState): boolean {
    for (const condition of conditions) {
      if (!this.checkCondition(condition, state)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check single condition
   */
  private checkCondition(condition: HTNCondition, state: HTNState): boolean {
    // Use custom evaluator if provided
    if (condition.evaluator) {
      return condition.evaluator(state);
    }

    const value = state[condition.field];

    switch (condition.type) {
      case "equals":
        return value === condition.value;
      case "notEquals":
        return value !== condition.value;
      case "greaterThan":
        return typeof value === "number" && value > (condition.value as number);
      case "lessThan":
        return typeof value === "number" && value < (condition.value as number);
      case "exists":
        return value !== undefined;
      default:
        return true;
    }
  }

  /**
   * Apply effects to state
   */
  private applyEffects(effects: HTNEffect[], state: HTNState): void {
    for (const effect of effects) {
      this.applyEffect(effect, state);
    }
  }

  /**
   * Apply single effect
   */
  private applyEffect(effect: HTNEffect, state: HTNState): void {
    // Use custom executor if provided
    if (effect.executor) {
      Object.assign(state, effect.executor(state));
      return;
    }

    switch (effect.type) {
      case "set":
        state[effect.field] = effect.value;
        break;
      case "add":
        if (Array.isArray(state[effect.field])) {
          (state[effect.field] as unknown[]).push(effect.value);
        }
        break;
      case "remove":
        if (Array.isArray(state[effect.field])) {
          const arr = state[effect.field] as unknown[];
          const index = arr.indexOf(effect.value);
          if (index > -1) {
            arr.splice(index, 1);
          }
        }
        break;
    }
  }

  /**
   * Merge multiple plans into one
   */
  private mergePlans(plans: HTNPlan[]): HTNPlan {
    const allTasks: HTNPrimitiveTask[] = [];
    let totalCost = 0;
    let totalDuration = 0;

    for (const plan of plans) {
      allTasks.push(...plan.tasks);
      totalCost += plan.totalCost;
      totalDuration += plan.estimatedDuration;
    }

    return {
      id: generateId("plan"),
      tasks: allTasks,
      totalCost,
      estimatedDuration: totalDuration,
      createdAt: nowMs(),
    };
  }

  /**
   * Execute plan
   */
  async executePlan(plan: HTNPlan): Promise<{
    success: boolean;
    results: ToolResult[];
    error?: string;
  }> {
    const results: ToolResult[] = [];

    for (const task of plan.tasks) {
      try {
        log.info(`Executing task: ${task.name}`);
        const result = await task.executor(task.parameters || {});
        results.push(result);

        if (!result.success) {
          return {
            success: false,
            results,
            error: `Task ${task.name} failed: ${result.error}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          results,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return { success: true, results };
  }
}

// ============================================================================
// Domain Builder
// ============================================================================

export class HTNDomainBuilder {
  private tasks: Map<string, HTNTask> = new Map();
  private initialState: HTNState = {};
  private domainName: string;

  constructor(name: string) {
    this.domainName = name;
  }

  /**
   * Add primitive task
   */
  addPrimitiveTask(
    name: string,
    action: string,
    executor: (params: Record<string, unknown>) => Promise<ToolResult>,
    options: {
      parameters?: Record<string, unknown>;
      preconditions?: HTNCondition[];
      effects?: HTNEffect[];
    } = {},
  ): this {
    const task: HTNPrimitiveTask = {
      id: generateId("task"),
      name,
      type: "primitive",
      action,
      executor,
      parameters: options.parameters,
      preconditions: options.preconditions,
      effects: options.effects,
    };

    this.tasks.set(name, task);
    return this;
  }

  /**
   * Add compound task
   */
  addCompoundTask(
    name: string,
    methods: HTNMethod[],
    options: {
      parameters?: Record<string, unknown>;
      preconditions?: HTNCondition[];
      effects?: HTNEffect[];
    } = {},
  ): this {
    const task: HTNCompoundTask = {
      id: generateId("task"),
      name,
      type: "compound",
      methods,
      parameters: options.parameters,
      preconditions: options.preconditions,
      effects: options.effects,
    };

    this.tasks.set(name, task);
    return this;
  }

  /**
   * Set initial state
   */
  setInitialState(state: HTNState): this {
    this.initialState = state;
    return this;
  }

  /**
   * Build domain
   */
  build(): HTNDomain {
    return {
      id: generateId("domain"),
      name: this.domainName,
      tasks: this.tasks,
      initialState: this.initialState,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  HTNPlanner,
  HTNDomainBuilder,
  type HTNTask,
  type HTNPrimitiveTask,
  type HTNCompoundTask,
  type HTNMethod,
  type HTNCondition,
  type HTNEffect,
  type HTNState,
  type HTNPlan,
  type HTNDomain,
  type HTNPlanningResult,
};

export default HTNPlanner;
