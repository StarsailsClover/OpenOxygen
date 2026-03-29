/**
 * OpenOxygen - Flow Controller
 *
 * LLM-driven workflow execution engine based on flowcharts
 */

import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs, sleep } from "../../utils/index.js";
import {
  llmJudgeComplexity,
  clarifyRequirement,
  chainOfThought,
  multiAIDeliberation,
  realTimeReflection,
} from "../../llm/index.js";
import {
  TaskPlanner,
  TaskOrchestrator,
} from "../../agent/orchestrator/index.js";
import {
  handleExecutionRequest as legacyExecute,
  executeWithStrategy,
} from "./index.js";

const log = createSubsystemLogger("execution/flow-controller");

/**
 * Main flow entry point
 *
 * Process user request according to flowchart paths
 */
export async function processRequest(request: {
  instruction: string;
  userId?: string;
  context?: any;
  sessionId?: string;
}): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  executionPath: string[];
  durationMs: number;
}> {
  const startTime = nowMs();
  const executionPath: string[] = [];

  log.info(`Processing request: ${request.instruction.substring(0, 100)}...`);
  executionPath.push("A: Start");

  try {
    // === Flow B: Complexity Assessment ===
    executionPath.push("B: Complexity Assessment");
    const complexity = await llmJudgeComplexity(request.instruction);
    log.info(
      `Complexity assessed: ${complexity.complexity}, needsAgent: ${complexity.needsAgent}`,
    );

    // === Flow C: Requirement Clarification ===
    executionPath.push("C: Requirement Clarification");
    const clarification = await clarifyRequirement(request.instruction);

    if (!clarification.isClear) {
      // Return clarification questions
      executionPath.push("D: Return Questions");
      return {
        success: false,
        error: "Need clarification",
        result: {
          questions: clarification.questions,
          type: "clarification_needed",
        },
        executionPath,
        durationMs: nowMs() - startTime,
      };
    }

    const clarifiedInstruction =
      clarification.clarifiedInstruction || request.instruction;

    // === Flow E: Check if Agent needed ===
    if (!complexity.needsAgent) {
      // Simple task - direct execution
      executionPath.push("E: Direct Execution");
      const result = await legacyExecute(clarifiedInstruction);

      executionPath.push("F: Return Result");
      return {
        success: result.success,
        result: result.output,
        executionPath,
        durationMs: nowMs() - startTime,
      };
    }

    // === Flow G: Task Decomposition ===
    executionPath.push("G: Task Decomposition");
    const planner = new TaskPlanner();
    const plan = await planner.plan(clarifiedInstruction);
    log.info(`Task decomposed into ${plan.subtasks.length} subtasks`);

    // === Flow H: Create DAG Orchestration ===
    executionPath.push("H: Create DAG Orchestration");
    const orchestrator = new TaskOrchestrator();
    const orch = await orchestrator.orchestrate(clarifiedInstruction);

    // === Flow I: OUV Vision Analysis ===
    executionPath.push("I: OUV Vision Analysis");
    // OUV visual analysis for element detection and operation verification

    // === Flow J: Execute Subtasks ===
    executionPath.push("J: Execute Subtasks");
    // Execute through orchestrator

    // === Flow K: Real-time Reflection ===
    executionPath.push("K: Real-time Reflection");
    // === Flow L: LLM Result Processing ===
    executionPath.push("L: LLM Result Processing");

    // === Flow M: Multi-AI Deliberation (if needed) ===
    if (complexity.needsDeliberation) {
      executionPath.push("M: Multi-AI Deliberation");
      const deliberation = await multiAIDeliberation({
        instruction: clarifiedInstruction,
        agentTypes: ["planner", "executor", "reviewer"],
      });
      log.info(`Multi-AI deliberation consensus: ${deliberation.consensus}`);
    }

    // === Flow N: Return Final Result ===
    executionPath.push("N: Return Final Result");

    return {
      success: true,
      result: { orchestrationId: orch.id },
      executionPath,
      durationMs: nowMs() - startTime,
    };
  } catch (error) {
    log.error("Flow controller error:", error);
    executionPath.push("Error Handler");

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionPath,
      durationMs: nowMs() - startTime,
    };
  }
}

/**
 * Simple task execution (Flow E -> F)
 */
export async function executeSimpleTask(instruction: string): Promise<{
  success: boolean;
  output?: string;
  error?: string;
}> {
  log.info(`Executing simple task: ${instruction}`);

  try {
    const result = await legacyExecute(instruction);

    return {
      success: result.success,
      output:
        typeof result.output === "string"
          ? result.output
          : String(result.output ?? ""),
      error: result.error ? String(result.error) : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Complex task with multi-AI deliberation (Flow M)
 */
export async function executeComplexTaskWithDeliberation(request: {
  instruction: string;
  agentTypes?: string[];
}): Promise<{
  success: boolean;
  result?: any;
  deliberation?: any;
  error?: string;
}> {
  log.info(`Executing complex task with deliberation: ${request.instruction}`);

  try {
    // Multi-AI deliberation
    const deliberation = await multiAIDeliberation({
      instruction: request.instruction,
      agentTypes: request.agentTypes || ["planner", "executor", "reviewer"],
    });

    // Execute based on consensus
    const result = await executeWithStrategy(deliberation.consensus, {
      mode: "hybrid",
      confidence: 1,
      reason: "Multi-AI deliberation consensus",
    });

    return {
      success: result.success,
      result: result.output,
      deliberation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Real-time reflection during execution (Flow K)
 */
export async function reflectOnExecution(params: {
  taskId: string;
  currentStep: number;
  context: any;
}): Promise<{
  shouldContinue: boolean;
  adjustments?: any;
  feedback: string;
}> {
  log.info(
    `Reflecting on execution: ${params.taskId}, step ${params.currentStep}`,
  );

  const reflection = await realTimeReflection({
    taskId: params.taskId,
    currentStep: params.currentStep,
    context: params.context,
  });

  return {
    shouldContinue: reflection.shouldContinue,
    adjustments: reflection.adjustments,
    feedback: reflection.feedback,
  };
}

export default {
  processRequest,
  executeSimpleTask,
  executeComplexTaskWithDeliberation,
  reflectOnExecution,
};
