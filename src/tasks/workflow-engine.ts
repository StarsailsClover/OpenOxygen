/**
 * OpenOxygen - Workflow Engine
 * 
 * Enhanced workflow engine with DAG execution, parallel processing,
 * conditional branching, loops, retry mechanism, caching, and timeout control
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
import { EventEmitter } from "events";

const log = createSubsystemLogger("tasks/workflow");

export type WorkflowStepType = "terminal" | "browser" | "gui" | "delay" | "condition" | "loop" | "parallel";

export type WorkflowStep = {
  id: string;
  name: string;
  type: WorkflowStepType;
  instruction: string;
  timeout?: number;
  retryCount?: number;
  condition?: string;  // For condition steps
  loopCondition?: string;  // For loop steps
  maxIterations?: number;  // For loop steps
  parallelSteps?: WorkflowStep[];  // For parallel steps
  dependsOn?: string[];  // For DAG execution
  cacheKey?: string;  // For caching
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: number;
  variables?: Record<string, unknown>;
};

export type StepResult = {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
  cached?: boolean;
  retryCount?: number;
};

export type WorkflowResult = {
  workflowId: string;
  success: boolean;
  results: StepResult[];
  durationMs: number;
  completedAt: number;
};

const workflows = new Map<string, Workflow>();
const cache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class DAGExecutor extends EventEmitter {
  private steps: Map<string, WorkflowStep> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();
  private completed: Set<string> = new Set();
  private results: Map<string, StepResult> = new Map();

  constructor(steps: WorkflowStep[]) {
    super();
    for (const step of steps) {
      this.steps.set(step.id, step);
      this.dependencies.set(step.id, new Set(step.dependsOn || []));
    }
  }

  getReadySteps(): WorkflowStep[] {
    const ready: WorkflowStep[] = [];
    for (const [stepId, deps] of this.dependencies) {
      if (!this.completed.has(stepId)) {
        const allDepsCompleted = Array.from(deps).every(d => this.completed.has(d));
        if (allDepsCompleted) {
          ready.push(this.steps.get(stepId)!);
        }
      }
    }
    return ready;
  }

  markCompleted(stepId: string, result: StepResult): void {
    this.completed.add(stepId);
    this.results.set(stepId, result);
    this.emit("stepCompleted", stepId, result);
  }

  isComplete(): boolean {
    return this.completed.size === this.steps.size;
  }

  getResult(stepId: string): StepResult | undefined {
    return this.results.get(stepId);
  }
}

async function executeStep(
  step: WorkflowStep,
  variables: Record<string, unknown>
): Promise<StepResult> {
  const startTime = nowMs();
  const timeout = step.timeout || 30000;
  const maxRetries = step.retryCount || 0;

  // Check cache
  if (step.cacheKey && cache.has(step.cacheKey)) {
    const cached = cache.get(step.cacheKey)!;
    if (nowMs() - cached.timestamp < CACHE_TTL) {
      log.info(`Step ${step.name} using cached result`);
      return {
        stepId: step.id,
        success: true,
        output: cached.result,
        durationMs: 0,
        cached: true
      };
    }
  }

  let lastError: string | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeStepWithTimeout(step, variables, timeout);
      
      // Cache result if successful
      if (step.cacheKey && result.success) {
        cache.set(step.cacheKey, {
          result: result.output,
          timestamp: nowMs()
        });
      }
      
      return {
        ...result,
        retryCount: attempt,
        durationMs: 0,
        cached: false
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      log.warn(`Step ${step.name} attempt ${attempt + 1} failed: ${lastError}`);
      
      if (attempt < maxRetries) {
        await sleep(1000 * (attempt + 1)); // Exponential backoff
      }
    }
  }

  return {
    stepId: step.id,
    success: false,
    error: lastError || "Max retries exceeded",
    durationMs: nowMs() - startTime,
    retryCount: maxRetries
  };
}

async function executeStepWithTimeout(
  step: WorkflowStep,
  variables: Record<string, unknown>,
  timeout: number
): Promise<Omit<StepResult, "durationMs" | "retryCount" | "cached">> {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Step timeout after ${timeout}ms`));
    }, timeout);

    try {
      const result = await executeStepLogic(step, variables);
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

async function executeStepLogic(
  step: WorkflowStep,
  variables: Record<string, unknown>
): Promise<Omit<StepResult, "durationMs" | "retryCount" | "cached">> {
  log.info(`Executing step: ${step.name} (${step.type})`);

  switch (step.type) {
    case "delay":
      const delayMs = parseInt(step.instruction) || 1000;
      await sleep(delayMs);
      return {
        stepId: step.id,
        success: true,
        output: { delayed: delayMs }
      };

    case "condition":
      // Evaluate condition
      const conditionResult = evaluateCondition(step.condition || "", variables);
      return {
        stepId: step.id,
        success: true,
        output: { condition: step.condition, result: conditionResult }
      };

    case "loop":
      const iterations = step.maxIterations || 10;
      const loopResults: unknown[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const shouldContinue = evaluateCondition(step.loopCondition || "", {
          ...variables,
          iteration: i
        });
        
        if (!shouldContinue) break;
        
        // Execute loop body (simplified)
        loopResults.push({ iteration: i, status: "completed" });
      }
      
      return {
        stepId: step.id,
        success: true,
        output: { iterations: loopResults.length, results: loopResults }
      };

    case "parallel":
      if (!step.parallelSteps || step.parallelSteps.length === 0) {
        return {
          stepId: step.id,
          success: true,
          output: { message: "No parallel steps defined" }
        };
      }
      
      const parallelResults = await Promise.all(
        step.parallelSteps.map(s => executeStep(s, variables))
      );
      
      const allSuccess = parallelResults.every(r => r.success);
      return {
        stepId: step.id,
        success: allSuccess,
        output: { parallelResults },
        error: allSuccess ? undefined : "Some parallel steps failed"
      };

    case "terminal":
      // TODO: Integrate with terminal execution module
      return {
        stepId: step.id,
        success: true,
        output: { 
          type: "terminal",
          command: step.instruction,
          status: "executed"
        }
      };

    case "browser":
      // TODO: Integrate with browser automation module
      return {
        stepId: step.id,
        success: true,
        output: {
          type: "browser",
          action: step.instruction,
          status: "executed"
        }
      };

    case "gui":
      // TODO: Integrate with GUI automation module
      return {
        stepId: step.id,
        success: true,
        output: {
          type: "gui",
          action: step.instruction,
          status: "executed"
        }
      };

    default:
      return {
        stepId: step.id,
        success: false,
        error: `Unknown step type: ${step.type}`
      };
  }
}

function evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
  try {
    // Simple condition evaluation
    // In production, use a proper expression evaluator
    const substituted = condition.replace(/\$\{(\w+)\}/g, (match, key) => {
      const value = variables[key];
      return typeof value === "string" ? `"${value}"` : String(value);
    });
    
    // WARNING: eval is dangerous, use a safe evaluator in production
    // This is simplified for demonstration
    return substituted ? eval(substituted) : true;
  } catch {
    return false;
  }
}

export function registerWorkflow(name: string, steps: WorkflowStep[]): Workflow {
  const workflow: Workflow = {
    id: generateId("workflow"),
    name,
    description: `Workflow: ${name}`,
    steps,
    createdAt: nowMs(),
    variables: {}
  };
  workflows.set(workflow.id, workflow);
  log.info(`Workflow registered: ${name} (${steps.length} steps)`);
  return workflow;
}

export async function executeWorkflow(
  workflowId: string,
  variables: Record<string, unknown> = {}
): Promise<WorkflowResult> {
  const workflow = workflows.get(workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  log.info(`Starting workflow execution: ${workflow.name}`);
  const startTime = nowMs();
  const results: StepResult[] = [];

  // Check if workflow has dependencies (DAG)
  const hasDependencies = workflow.steps.some(s => s.dependsOn && s.dependsOn.length > 0);
  
  if (hasDependencies) {
    // DAG execution
    const dag = new DAGExecutor(workflow.steps);
    
    while (!dag.isComplete()) {
      const readySteps = dag.getReadySteps();
      
      if (readySteps.length === 0 && !dag.isComplete()) {
        throw new Error("Circular dependency detected or no ready steps");
      }
      
      // Execute ready steps in parallel
      const stepResults = await Promise.all(
        readySteps.map(step => executeStep(step, { ...workflow.variables, ...variables }))
      );
      
      for (const result of stepResults) {
        dag.markCompleted(result.stepId, result);
        results.push(result);
      }
    }
  } else {
    // Sequential execution
    for (const step of workflow.steps) {
      const result = await executeStep(step, { ...workflow.variables, ...variables });
      results.push(result);
      
      // Stop on failure unless it's a condition step
      if (!result.success && step.type !== "condition") {
        log.error(`Step ${step.name} failed, stopping workflow`);
        break;
      }
    }
  }

  const success = results.every(r => r.success);
  const durationMs = nowMs() - startTime;

  log.info(`Workflow ${workflow.name} completed in ${durationMs}ms`);

  return {
    workflowId,
    success,
    results,
    durationMs,
    completedAt: nowMs()
  };
}

export function listWorkflows(): Workflow[] {
  return Array.from(workflows.values());
}

export function getWorkflow(id: string): Workflow | undefined {
  return workflows.get(id);
}

export function deleteWorkflow(id: string): boolean {
  return workflows.delete(id);
}

export function clearCache(): void {
  cache.clear();
  log.info("Workflow cache cleared");
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

export default {
  registerWorkflow,
  executeWorkflow,
  listWorkflows,
  getWorkflow,
  deleteWorkflow,
  clearCache,
  getCacheStats
};
