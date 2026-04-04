/**
 * OpenOxygen - Task Planner
 *
 * 任务规划引擎：将用户意图拆解为可执行的多步骤计划。
 * 实现「推理-规划-执行-反馈-反思」一体化循环。
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("inference/planner");
// === Plan Builder ===
export function createEmptyPlan(goal) {
    return {
        id: generateId("plan"),
        goal,
        steps: [],
        createdAt: nowMs(),
        updatedAt: nowMs(),
        status: "planning",
        reflections: [],
    };
}
export function addStep(plan, action, params = {}, dependencies = []) {
    const step = {
        id: generateId("step"),
        action,
        params,
        dependencies,
        status: "pending",
    };
    plan.steps.push(step);
    plan.updatedAt = nowMs();
    return step;
}
export function updateStepStatus(plan, stepId, status, result, error) {
    const step = plan.steps.find((s) => s.id === stepId);
    if (!step)
        return;
    step.status = status;
    if (result !== undefined)
        step.result = result;
    if (error !== undefined)
        step.error = error;
    plan.updatedAt = nowMs();
}
export function addReflection(plan, stepId, observation, adjustment) {
    const entry = {
        stepId,
        observation,
        adjustment,
        timestamp: nowMs(),
    };
    plan.reflections.push(entry);
    plan.updatedAt = nowMs();
}
export function getPlanProgress(plan) {
    const total = plan.steps.length;
    const completed = plan.steps.filter((s) => s.status === "completed").length;
    const failed = plan.steps.filter((s) => s.status === "failed").length;
    const pending = plan.steps.filter((s) => s.status === "pending").length;
    return {
        total,
        completed,
        failed,
        pending,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
}
export class TaskPlanner {
    inferenceEngine;
    config;
    constructor(inferenceEngine, config = {}) {
        this.inferenceEngine = inferenceEngine;
        this.config = {
            maxSteps: 10,
            allowRetry: true,
            reflectionEnabled: true,
            ...config,
        };
    }
    /**
     * Create plan from natural language instruction
     */
    async createPlan(instruction) {
        log.info(`Creating plan for: ${instruction}`);
        const prompt = this.buildPlanningPrompt(instruction);
        const response = await this.inferenceEngine.infer({
            messages: [
                {
                    role: "system",
                    content: "You are a task planning assistant. Break down the user's request into clear, executable steps.",
                },
                { role: "user", content: prompt },
            ],
            mode: "balanced",
        });
        const plan = this.parsePlanFromResponse(instruction, response.content);
        log.info(`Plan created with ${plan.steps.length} steps`);
        return plan;
    }
    /**
     * Refine plan based on execution results
     */
    async refinePlan(plan, failedStepId, error) {
        log.info(`Refining plan after failure in step ${failedStepId}`);
        const failedStep = plan.steps.find((s) => s.id === failedStepId);
        if (!failedStep)
            return plan;
        const prompt = this.buildRefinementPrompt(plan, failedStep, error);
        const response = await this.inferenceEngine.infer({
            messages: [
                {
                    role: "system",
                    content: "You are a task planning assistant. The previous plan failed. Suggest adjustments.",
                },
                { role: "user", content: prompt },
            ],
            mode: "deep",
        });
        // Add reflection
        addReflection(plan, failedStepId, `Step failed: ${error}`, response.content);
        // Create adjusted plan
        const adjustedPlan = this.parsePlanFromResponse(plan.goal, response.content);
        adjustedPlan.reflections = [...plan.reflections];
        return adjustedPlan;
    }
    buildPlanningPrompt(instruction) {
        return `Break down the following task into executable steps:

Task: ${instruction}

Provide your response in this JSON format:
{
  "steps": [
    {
      "action": "step description",
      "params": { "key": "value" },
      "dependencies": []
    }
  ]
}

Guidelines:
- Each step should be atomic and executable
- Use dependencies to indicate order
- Keep steps under ${this.config.maxSteps}
- Be specific about parameters`;
    }
    buildRefinementPrompt(plan, failedStep, error) {
        const progress = getPlanProgress(plan);
        return `The following plan failed during execution:

Goal: ${plan.goal}
Progress: ${progress.completed}/${progress.total} steps completed

Failed Step: ${failedStep.action}
Error: ${error}

Previous Steps:
${plan.steps
            .map((s) => `- ${s.action} (${s.status})${s.error ? ` [Error: ${s.error}]` : ""}`)
            .join("\n")}

Please suggest an adjusted plan to complete the task.
Provide your response in the same JSON format as before.`;
    }
    parsePlanFromResponse(goal, content) {
        const plan = createEmptyPlan(goal);
        try {
            // Try to extract JSON from response
            const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                if (parsed.steps && Array.isArray(parsed.steps)) {
                    for (const step of parsed.steps) {
                        addStep(plan, step.action, step.params || {}, step.dependencies || []);
                    }
                }
            }
        }
        catch (error) {
            log.warn(`Failed to parse plan from response: ${error}`);
            // Fallback: create single-step plan
            addStep(plan, goal);
        }
        plan.status = "planning";
        return plan;
    }
}
export async function executePlan(plan, executor, options = {}) {
    log.info(`Executing plan: ${plan.id}`);
    plan.status = "executing";
    for (const step of plan.steps) {
        // Check dependencies
        const depsCompleted = step.dependencies.every((depId) => {
            const dep = plan.steps.find((s) => s.id === depId);
            return dep?.status === "completed";
        });
        if (!depsCompleted) {
            step.status = "skipped";
            continue;
        }
        // Execute step
        options.onStepStart?.(step);
        step.status = "running";
        try {
            const result = await executor.executeStep(step);
            if (result.success) {
                updateStepStatus(plan, step.id, "completed", result.result);
                options.onStepComplete?.(step);
            }
            else {
                updateStepStatus(plan, step.id, "failed", undefined, result.error);
                options.onStepError?.(step, result.error || "Unknown error");
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            updateStepStatus(plan, step.id, "failed", undefined, errorMsg);
            options.onStepError?.(step, errorMsg);
        }
    }
    // Update plan status
    const progress = getPlanProgress(plan);
    if (progress.failed > 0) {
        plan.status = "failed";
    }
    else if (progress.completed === progress.total) {
        plan.status = "completed";
    }
    log.info(`Plan execution complete: ${progress.completed}/${progress.total} steps`);
    return plan;
}
export default TaskPlanner;
