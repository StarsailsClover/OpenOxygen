/**
 * OpenOxygen �?Task Planner
 *
 * 任务规划引擎：将用户意图分解为可执行的多步骤计划�?
 * 实现「推�?规划-执行-反馈-反思」一体化循环�?
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("inference/planner");
// ─── Plan Builder ───────────────────────────────────────────────────────────
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
// ─── Plan Status ────────────────────────────────────────────────────────────
export function getNextExecutableSteps(plan) {
    return plan.steps.filter((step) => {
        if (step.status !== "pending")
            return false;
        // All dependencies must be completed
        return step.dependencies.every((depId) => {
            const dep = plan.steps.find((s) => s.id === depId);
            return dep?.status === "completed";
        });
    });
}
export function isPlanComplete(plan) {
    return plan.steps.every((s) => s.status === "completed" || s.status === "skipped");
}
export function isPlanFailed(plan) {
    return plan.steps.some((s) => s.status === "failed");
}
// ─── AI-Driven Planning ────────────────────────────────────────────────────
const PLANNING_SYSTEM_PROMPT = `You are a task planning engine for OpenOxygen, a Windows-native AI agent framework.

When given a user goal, decompose it into concrete, executable steps.

Output your plan as a JSON array of steps, each with:
- "action": the tool/operation name (e.g., "file.read", "process.start", "screen.capture", "inference", "web.search")
- "params": an object of parameters for the action
- "dependencies": array of step indices (0-based) that must complete before this step

Rules:
1. Each step must be atomic and independently verifiable
2. Prefer parallel execution where possible (minimize dependencies)
3. Include verification steps after critical operations
4. For Windows system operations, use specific Win32 action names
5. Keep plans concise �?avoid unnecessary steps

Respond ONLY with the JSON array, no other text.`;
export class TaskPlanner {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    async generatePlan(goal, context) {
        const plan = createEmptyPlan(goal);
        const messages = [
            {
                role: "user",
                content: context ? `Context: ${context}\n\nGoal: ${goal}` : goal,
            },
        ];
        try {
            const response = await this.engine.infer({
                messages,
                mode: "balanced",
                systemPrompt: PLANNING_SYSTEM_PROMPT,
                temperature: 0.3,
            });
            const steps = parsePlanSteps(response.content);
            const stepIds = [];
            for (const raw of steps) {
                const deps = (raw.dependencies ?? [])
                    .map((idx) => stepIds[idx])
                    .filter(Boolean);
                const step = addStep(plan, raw.action, raw.params ?? {}, deps);
                stepIds.push(step.id);
            }
            plan.status = "executing";
            log.info(`Plan generated: ${plan.id} with ${plan.steps.length} steps`);
        }
        catch (err) {
            plan.status = "failed";
            log.error(`Plan generation failed:`, err);
        }
        return plan;
    }
    async reflectOnStep(plan, stepId, result, error) {
        const step = plan.steps.find((s) => s.id === stepId);
        if (!step)
            return { shouldContinue: true };
        if (!error) {
            addReflection(plan, stepId, `Step "${step.action}" completed successfully`);
            return { shouldContinue: true };
        }
        // Ask the model to reflect on the failure
        const messages = [
            {
                role: "user",
                content: `A step in the execution plan failed.

Plan goal: ${plan.goal}
Failed step: ${step.action}
Params: ${JSON.stringify(step.params)}
Error: ${error}
Previous results: ${JSON.stringify(plan.steps.filter((s) => s.status === "completed").map((s) => ({ action: s.action, result: s.result })))}

Should we:
1. Retry with modified params
2. Skip this step and continue
3. Abort the plan

Respond with JSON: { "decision": "retry|skip|abort", "adjustment": "description of change if retry" }`,
            },
        ];
        try {
            const response = await this.engine.infer({
                messages,
                mode: "fast",
                temperature: 0.2,
            });
            const decision = JSON.parse(response.content);
            addReflection(plan, stepId, `Reflection: ${decision.decision}`, decision.adjustment);
            if (decision.decision === "abort") {
                plan.status = "failed";
                return { shouldContinue: false };
            }
            if (decision.decision === "skip") {
                updateStepStatus(plan, stepId, "skipped");
                return { shouldContinue: true };
            }
            return { shouldContinue: true, adjustment: decision.adjustment };
        }
        catch {
            addReflection(plan, stepId, `Reflection failed, continuing with default behavior`);
            return { shouldContinue: true };
        }
    }
}
// ─── Helpers ────────────────────────────────────────────────────────────────
function parsePlanSteps(content) {
    try {
        // Extract JSON array from response (may be wrapped in markdown code block)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch)
            return [];
        return JSON.parse(jsonMatch[0]);
    }
    catch {
        log.warn("Failed to parse plan steps from model response");
        return [];
    }
}
