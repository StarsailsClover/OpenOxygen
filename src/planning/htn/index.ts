/**
 * HTN (Hierarchical Task Network) Planner
 * 
 * Core implementation of HTN planning algorithm
 * Supports task decomposition, method selection, and plan generation
 */

import { createSubsystemLogger } from "../logging/index.js";
import type { ToolResult } from "../types/index.js";

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
  tasks: HTNPrimitiveTask[];
  totalCost: number;
  estimatedDuration: number;
}

export interface HTNDomain {
  id: string;
  name: string;
  tasks: Map<string, HTNTask>;
  initialState: HTNState;
}

// ============================================================================
// HTN Planner
// ============================================================================

export class HTNPlanner {
  private domains: Map<string, HTNDomain> = new Map();
  private currentPlan: HTNPlan | null = null;
  private planStack: HTNTask[] = [];

  /**
   * Register a domain
   */
  registerDomain(domain: HTNDomain): void {
    this.domains.set(domain.id, domain);
    log.info(`Domain registered: ${domain.name} (${domain.id})`);
  }

  /**
   * Create a plan from a compound task
   */
  async plan(
    domainId: string,
    goalTask: HTNCompoundTask,
    initialState?: HTNState,
  ): Promise<HTNPlan | null> {
    const domain = this.domains.get(domainId);
    if (!domain) {
      log.error(`Domain not found: ${domainId}`);
      return null;
    }

    const state = initialState || { ...domain.initialState };
    const plan: HTNPrimitiveTask[] = [];

    log.info(`Starting HTN planning for: ${goalTask.name}`);

    const success = await this.decomposeTask(goalTask, state, plan);

    if (success) {
      this.currentPlan = {
        tasks: plan,
        totalCost: this.calculateCost(plan),
        estimatedDuration: this.estimateDuration(plan),
      };

      log.info(`Plan generated: ${plan.length} tasks`);
      return this.currentPlan;
    }

    log.warn(`Failed to generate plan for: ${goalTask.name}`);
    return null;
  }

  /**
   * Decompose a task into primitive tasks
   */
  private async decomposeTask(
    task: HTNTask,
    state: HTNState,
    plan: HTNPrimitiveTask[],
  ): Promise<boolean> {
    // Check preconditions
    if (task.preconditions && !this.checkConditions(task.preconditions, state)) {
      return false;
    }

    if (task.type === "primitive") {
      const primitiveTask = task as HTNPrimitiveTask;
      plan.push(primitiveTask);
      
      // Apply effects
      if (task.effects) {
        this.applyEffects(task.effects, state);
      }
      
      return true;
    }

    // Compound task - find applicable method
    const compoundTask = task as HTNCompoundTask;
    const applicableMethod = this.findApplicableMethod(compoundTask, state);

    if (!applicableMethod) {
      log.warn(`No applicable method for task: ${task.name}`);
      return false;
    }

    log.debug(`Using method: ${applicableMethod.name}`);

    // Decompose subtasks
    for (const subtask of applicableMethod.subtasks) {
      const success = await this.decomposeTask(subtask, state, plan);
      if (!success) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find an applicable method for a compound task
   */
  private findApplicableMethod(
    task: HTNCompoundTask,
    state: HTNState,
  ): HTNMethod | null {
    for (const method of task.methods) {
      if (!method.preconditions || this.checkConditions(method.preconditions, state)) {
        return method;
      }
    }
    return null;
  }

  /**
   * Check if conditions are satisfied
   */
  private checkConditions(conditions: HTNCondition[], state: HTNState): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, state)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: HTNCondition, state: HTNState): boolean {
    if (condition.evaluator) {
      return condition.evaluator(state);
    }

    const fieldValue = state[condition.field];

    switch (condition.type) {
      case "equals":
        return fieldValue === condition.value;
      case "notEquals":
        return fieldValue !== condition.value;
      case "greaterThan":
        return (fieldValue as number) > (condition.value as number);
      case "lessThan":
        return (fieldValue as number) < (condition.value as number);
      case "exists":
        return fieldValue !== undefined;
      default:
        return true;
    }
  }

  /**
   * Apply effects to state
   */
  private applyEffects(effects: HTNEffect[], state: HTNState): void {
    for (const effect of effects) {
      if (effect.executor) {
        Object.assign(state, effect.executor(state));
      } else {
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
    }
  }

  /**
   * Execute the current plan
   */
  async executePlan(): Promise<ToolResult[]> {
    if (!this.currentPlan) {
      return [{ success: false, error: "No plan to execute" }];
    }

    const results: ToolResult[] = [];

    for (const task of this.currentPlan.tasks) {
      log.info(`Executing task: ${task.name}`);
      
      try {
        const result = await task.executor(task.parameters || {});
        results.push(result);
        
        if (!result.success) {
          log.error(`Task failed: ${task.name}`);
          break;
        }
      } catch (error) {
        log.error(`Task execution error: ${task.name}`, error);
        results.push({
          success: false,
          error: `Execution error: ${error}`,
        });
        break;
      }
    }

    return results;
  }

  /**
   * Calculate plan cost
   */
  private calculateCost(plan: HTNPrimitiveTask[]): number {
    // Simple cost calculation - can be customized
    return plan.length;
  }

  /**
   * Estimate plan duration
   */
  private estimateDuration(plan: HTNPrimitiveTask[]): number {
    // Simple estimation - can be customized
    return plan.length * 1000; // 1 second per task
  }

  /**
   * Get current plan
   */
  getCurrentPlan(): HTNPlan | null {
    return this.currentPlan;
  }

  /**
   * Clear current plan
   */
  clearPlan(): void {
    this.currentPlan = null;
    this.planStack = [];
  }
}

// ============================================================================
// Domain Builder
// ============================================================================

export class HTNDomainBuilder {
  private domain: HTNDomain;

  constructor(id: string, name: string) {
    this.domain = {
      id,
      name,
      tasks: new Map(),
      initialState: {},
    };
  }

  setInitialState(state: HTNState): this {
    this.domain.initialState = state;
    return this;
  }

  addPrimitiveTask(task: HTNPrimitiveTask): this {
    this.domain.tasks.set(task.id, task);
    return this;
  }

  addCompoundTask(task: HTNCompoundTask): this {
    this.domain.tasks.set(task.id, task);
    return this;
  }

  build(): HTNDomain {
    return this.domain;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const htnPlanner = new HTNPlanner();
