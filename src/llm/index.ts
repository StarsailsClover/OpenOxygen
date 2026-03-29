/**
 * OpenOxygen LLM Service
 *
 * Complete LLM-driven interaction mechanism for flowchart requirements
 */

import { createSubsystemLogger } from "../logging/index.js";

const log = createSubsystemLogger("llm");

// Ollama configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

/**
 * LLM complexity judgment result
 */
export interface ComplexityJudgment {
  complexity: "simple" | "medium" | "complex";
  needsAgent: boolean;
  needsReflection: boolean;
  needsDeliberation: boolean;
  reasoning: string;
}

/**
 * Requirement clarification result
 */
export interface ClarificationResult {
  isClear: boolean;
  questions?: string[];
  clarifiedInstruction?: string;
}

/**
 * Chain of Thought reasoning result
 */
export interface CoTResult {
  reasoning: string[];
  conclusion: string;
  steps: string[];
}

/**
 * Multi-AI deliberation result
 */
export interface DeliberationResult {
  consensus: string;
  disagreements: string[];
  finalDecision: string;
  agentOpinions: Record<string, string>;
}

/**
 * Call Ollama LLM
 */
async function callOllama(
  prompt: string,
  format: "json" | "text" = "json",
): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: format === "json" ? "json" : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data: any = await response.json();
    return data.response;
  } catch (error: any) {
    log.error(`LLM call failed: ${error.message}`);
    throw error;
  }
}

/**
 * 1. Complexity Assessment (Flowchart Node B)
 *
 * Assess task complexity to determine processing path
 */
export async function llmJudgeComplexity(
  instruction: string,
): Promise<ComplexityJudgment> {
  log.info(`Judging complexity for: "${instruction.substring(0, 50)}..."`);

  const prompt = `Analyze the following task and assess its complexity:

Task: "${instruction}"

Respond with JSON:
{
  "complexity": "simple|medium|complex",
  "needsAgent": true|false,
  "needsReflection": true|false,
  "reasoning": "explanation"
}

Guidelines:
- simple: Single step, clear instructions, no ambiguity
- medium: Multiple steps, some context needed, moderate reasoning
- complex: Requires planning, multiple subtasks, or deep reasoning
- needsAgent: true if task requires UI/browser/terminal interaction
- needsReflection: true if task benefits from iterative refinement`;

  try {
    const response = await callOllama(prompt);
    const result = JSON.parse(response);

    return {
      complexity: result.complexity || "medium",
      needsAgent: result.needsAgent ?? true,
      needsReflection: result.needsReflection ?? false,
      needsDeliberation: result.needsDeliberation ?? false,
      reasoning: result.reasoning || "",
    };
  } catch (error: any) {
    log.error("Complexity judgment failed:", error);
    return {
      complexity: "medium",
      needsAgent: true,
      needsReflection: false,
      needsDeliberation: false,
      reasoning: "Fallback due to error",
    };
  }
}

/**
 * 2. Requirement Clarification (Flowchart Node C/D)
 *
 * Check if instruction is clear, ask questions if not
 */
export async function clarifyRequirement(
  instruction: string,
): Promise<ClarificationResult> {
  log.info(`Clarifying requirement: "${instruction.substring(0, 50)}..."`);

  const prompt = `Analyze if the following instruction is clear and complete:

Instruction: "${instruction}"

Respond with JSON:
{
  "isClear": true|false,
  "questions": ["question 1", "question 2"],
  "clarifiedInstruction": "improved version if clear, otherwise empty"
}

If the instruction is ambiguous, missing details, or could be interpreted multiple ways,
set isClear to false and provide specific questions to ask the user.
If the instruction is clear, set isClear to true and provide a clarified version.`;

  try {
    const response = await callOllama(prompt);
    const result = JSON.parse(response);

    return {
      isClear: result.isClear ?? false,
      questions: result.questions || [],
      clarifiedInstruction: result.clarifiedInstruction || instruction,
    };
  } catch (error) {
    log.error("Clarification failed:", error);
    return {
      isClear: true,
      clarifiedInstruction: instruction,
    };
  }
}

/**
 * 3. Chain of Thought Reasoning (Flowchart Node E)
 *
 * Break down complex tasks into reasoning steps
 */
export async function chainOfThought(instruction: string): Promise<CoTResult> {
  log.info(`Chain of thought for: "${instruction.substring(0, 50)}..."`);

  const prompt = `Solve the following task using step-by-step reasoning:

Task: "${instruction}"

Respond with JSON:
{
  "reasoning": ["step 1", "step 2", "step 3"],
  "conclusion": "final answer or plan",
  "steps": ["action 1", "action 2", "action 3"]
}

Think through this carefully, showing your reasoning process.`;

  try {
    const response = await callOllama(prompt);
    const result = JSON.parse(response);

    return {
      reasoning: result.reasoning || [],
      conclusion: result.conclusion || "",
      steps: result.steps || [],
    };
  } catch (error) {
    log.error("Chain of thought failed:", error);
    return {
      reasoning: [],
      conclusion: instruction,
      steps: [instruction],
    };
  }
}

/**
 * 4. Multi-AI Deliberation (Flowchart Node M)
 *
 * Multiple AI agents discuss and reach consensus
 */
export async function multiAIDeliberation(params: {
  instruction: string;
  agentTypes?: string[];
}): Promise<DeliberationResult> {
  const agentTypes = params.agentTypes || ["planner", "executor", "reviewer"];
  log.info(`Multi-AI deliberation with ${agentTypes.length} agents`);

  const agentOpinions: Record<string, string> = {};

  // Each agent provides their perspective
  for (const agentId of agentTypes) {
    const context =
      agentId === "planner"
        ? "Focus on planning and strategy"
        : agentId === "executor"
          ? "Focus on implementation details"
          : "Focus on review and potential issues";

    const prompt = `You are Agent ${agentId}. Analyze the following task from your perspective:
${context}

Task: "${params.instruction}"

Provide your analysis in 2-3 sentences.`;

    try {
      const response = await callOllama(prompt, "text");
      agentOpinions[agentId] = response.trim();
    } catch (error) {
      agentOpinions[agentId] = `Agent ${agentId} could not respond`;
    }
  }

  // Analyze consensus
  const prompt = `Analyze the following opinions from different agents:
${Object.entries(agentOpinions)
  .map(([id, opinion]) => `${id}: ${opinion}`)
  .join("\n")}

Respond with JSON:
{
  "consensus": "areas of agreement",
  "disagreements": ["disagreement 1", "disagreement 2"],
  "finalDecision": "recommended approach"
}`;

  try {
    const response = await callOllama(prompt);
    const result = JSON.parse(response);

    return {
      consensus: result.consensus || "",
      disagreements: result.disagreements || [],
      finalDecision: result.finalDecision || "",
      agentOpinions,
    };
  } catch (error) {
    log.error("Deliberation analysis failed:", error);
    return {
      consensus: "No consensus reached",
      disagreements: [],
      finalDecision: params.instruction,
      agentOpinions,
    };
  }
}

/**
 * 5. Real-time Reflection (Flowchart Node K)
 *
 * Reflect on execution progress and suggest adjustments
 */
export async function realTimeReflection(params: {
  taskId: string;
  currentStep: number;
  context: any;
}): Promise<{
  shouldContinue: boolean;
  adjustments?: any;
  feedback: string;
}> {
  log.info(
    `Real-time reflection for task ${params.taskId}, step ${params.currentStep}`,
  );

  const prompt = `Reflect on the current task execution:

Task ID: ${params.taskId}
Current Step: ${params.currentStep}
Context: ${JSON.stringify(params.context)}

Respond with JSON:
{
  "shouldContinue": true|false,
  "adjustments": { "key": "value" },
  "feedback": "reflection and suggestions"
}

Consider: Is the task progressing as expected? Should we adjust the approach?`;

  try {
    const response = await callOllama(prompt);
    const result = JSON.parse(response);

    return {
      shouldContinue: result.shouldContinue ?? true,
      adjustments: result.adjustments,
      feedback: result.feedback || "No specific feedback",
    };
  } catch (error) {
    log.error("Reflection failed:", error);
    return {
      shouldContinue: true,
      feedback: "Continue with current approach",
    };
  }
}

export default {
  llmJudgeComplexity,
  clarifyRequirement,
  chainOfThought,
  multiAIDeliberation,
  realTimeReflection,
  callOllama,
};
