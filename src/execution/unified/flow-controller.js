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
  realTimeReflection
} from "../../llm/index.js";
import { TaskPlanner, TaskOrchestrator } from "../../agent/orchestrator/index.js";
import { handleExecutionRequest , executeWithStrategy } from "./index.js";

const log = createSubsystemLogger("execution/flow-controller");

/**
 * Main flow entry point
 *
 * Process user request according to flowchart paths
 */
export async function processRequest(request)<{
  success;
  result?;
  error?;
  executionPath;
  durationMs;
}> {
  const startTime = nowMs();
  const executionPath = [];
  
  log.info(`Processing request: ${request.instruction.substring(0, 100)}...`);
  executionPath.push("A");

  try {
    // === Flow B Assessment ===
    executionPath.push("B Assessment");
    const complexity = await llmJudgeComplexity(request.instruction);
    log.info(`Complexity assessed: ${complexity.complexity}, needsAgent: ${complexity.needsAgent}`);

    // === Flow C Clarification ===
    executionPath.push("C Clarification");
    const clarification = await clarifyRequirement(request.instruction);
    
    if (!clarification.isClear) {
      // Return clarification questions
      executionPath.push("D Questions");
      return {
        success,
        error: "Need clarification",
        result,
        executionPath,
        durationMs() - startTime
      };
    }

    const clarifiedInstruction = clarification.clarifiedInstruction || request.instruction;

    // === Flow E if Agent needed ===
    if (!complexity.needsAgent) {
      // Simple task - direct execution
      executionPath.push("E Execution");
      const result = await legacyExecute(clarifiedInstruction);
      
      executionPath.push("F Result");
      return {
        success.success,
        result.output,
        executionPath,
        durationMs() - startTime
      };
    }

    // === Flow G Decomposition ===
    executionPath.push("G Decomposition");
    const planner = new TaskPlanner();
    const plan = await planner.plan(clarifiedInstruction);
    log.info(`Task decomposed into ${plan.subtasks.length} subtasks`);

    // === Flow H DAG Orchestration ===
    executionPath.push("H DAG Orchestration");
    const orchestrator = new TaskOrchestrator();
    const orch = await orchestrator.orchestrate(clarifiedInstruction);

    // === Flow I Vision Analysis ===
    executionPath.push("I Vision Analysis");
    // OUV visual analysis for element detection and operation verification

    // === Flow J Subtasks ===
    executionPath.push("J Subtasks");
    // Execute through orchestrator

    // === Flow K-time Reflection ===
    executionPath.push("K-time Reflection");
    // === Flow L Result Processing ===
    executionPath.push("L Result Processing");

    // === Flow M-AI Deliberation (if needed) ===
    if (complexity.needsDeliberation) {
      executionPath.push("M-AI Deliberation");
      const deliberation = await multiAIDeliberation({
        instruction,
        agentTypes: ["planner", "executor", "reviewer"]
      });
      log.info(`Multi-AI deliberation consensus: ${deliberation.consensus}`);
    }

    // === Flow N Final Result ===
    executionPath.push("N Final Result");

    return {
      success,
      result,
      executionPath,
      durationMs() - startTime
    };

  } catch (error) {
    log.error("Flow controller error:", error);
    executionPath.push("Error Handler");
    
    return {
      success,
      error instanceof Error ? error.message (error),
      executionPath,
      durationMs() - startTime
    };
  }
}

/**
 * Simple task execution (Flow E -> F)
 */
export async function executeSimpleTask(instruction)<{
  success;
  output?;
  error?;
}> {
  log.info(`Executing simple task: ${instruction}`);
  
  try {
    const result = await legacyExecute(instruction);
    
    return {
      success.success,
      output result.output === 'string' ? result.output (result.output ?? ''),
      error.error ? String(result.error) 
    };
  } catch (error) {
    return {
      success,
      error instanceof Error ? error.message (error)
    };
  }
}

/**
 * Complex task with multi-AI deliberation (Flow M)
 */
export async function executeComplexTaskWithDeliberation(request)<{
  success;
  result?;
  deliberation?;
  error?;
}> {
  log.info(`Executing complex task with deliberation: ${request.instruction}`);
  
  try {
    // Multi-AI deliberation
    const deliberation = await multiAIDeliberation({
      instruction.instruction,
      agentTypes.agentTypes || ["planner", "executor", "reviewer"]
    });

    // Execute based on consensus
    const result = await executeWithStrategy(deliberation.consensus, {
      mode: "hybrid",
      confidence,
      reason: "Multi-AI deliberation consensus"
    });

    return {
      success.success,
      result.output,
      deliberation
    };
  } catch (error) {
    return {
      success,
      error instanceof Error ? error.message (error)
    };
  }
}

/**
 * Real-time reflection during execution (Flow K)
 */
export async function reflectOnExecution(params)<{
  shouldContinue;
  adjustments?;
  feedback;
}> {
  log.info(`Reflecting on execution: ${params.taskId}, step ${params.currentStep}`);
  
  const reflection = await realTimeReflection({
    taskId.taskId,
    currentStep.currentStep,
    context.context
  });

  return {
    shouldContinue.shouldContinue,
    adjustments.adjustments,
    feedback.feedback
  };
}

export default {
  processRequest,
  executeSimpleTask,
  executeComplexTaskWithDeliberation,
  reflectOnExecution
};
