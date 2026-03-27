/**
 * OpenOxygen — Reflection Engine
 *
 * 反思迭代器：执行后自我评估，发现问题并自适应调整。
 * 实现 ReAct (Reasoning + Acting) 循环的反思环节。
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("inference/reflection");
// ─── Reflection Prompts ─────────────────────────────────────────────────────
const REFLECTION_SYSTEM_PROMPT = `You are a reflection engine for an AI agent framework.
Your job is to evaluate the quality of completed actions and identify issues.

Analyze the execution result and respond with JSON:
{
  "quality": "good" | "acceptable" | "poor",
  "issues": [
    {
      "severity": "low" | "medium" | "high" | "critical",
      "category": "accuracy" | "completeness" | "safety" | "efficiency" | "format",
      "description": "what went wrong"
    }
  ],
  "suggestions": ["how to improve"],
  "shouldRetry": true/false
}

Be concise and precise. Only flag real issues.`;
// ─── Reflection Engine ─────────────────────────────────────────────────────
export class ReflectionEngine {
    inferenceEngine;
    maxReflectionDepth;
    constructor(inferenceEngine, maxDepth = 3) {
        this.inferenceEngine = inferenceEngine;
        this.maxReflectionDepth = maxDepth;
    }
    async reflect(plan, stepId, result, error) {
        const step = plan.steps.find((s) => s.id === stepId);
        if (!step) {
            return { quality: "good", issues: [], suggestions: [], shouldRetry: false };
        }
        // Check reflection depth to prevent infinite loops
        const existingReflections = plan.reflections.filter((r) => r.stepId === stepId);
        if (existingReflections.length >= this.maxReflectionDepth) {
            log.warn(`Max reflection depth reached for step ${stepId}`);
            return {
                quality: "acceptable",
                issues: [],
                suggestions: ["Max reflection depth reached"],
                shouldRetry: false,
            };
        }
        const messages = [
            {
                role: "user",
                content: JSON.stringify({
                    goal: plan.goal,
                    step: { action: step.action, params: step.params },
                    result: error ? { error } : result,
                    previousReflections: existingReflections,
                }),
            },
        ];
        try {
            const response = await this.inferenceEngine.infer({
                messages,
                mode: "fast",
                systemPrompt: REFLECTION_SYSTEM_PROMPT,
                temperature: 0.2,
            });
            const parsed = parseReflectionResponse(response.content);
            // Record reflection in plan
            const entry = {
                stepId,
                observation: `Quality: ${parsed.quality}. Issues: ${parsed.issues.length}`,
                adjustment: parsed.suggestions.join("; "),
                timestamp: nowMs(),
            };
            plan.reflections.push(entry);
            log.info(`Reflection on step ${stepId}: quality=${parsed.quality}, issues=${parsed.issues.length}, retry=${parsed.shouldRetry}`);
            return parsed;
        }
        catch (err) {
            log.error(`Reflection failed for step ${stepId}:`, err);
            return { quality: "acceptable", issues: [], suggestions: [], shouldRetry: false };
        }
    }
    async reflectOnPlan(plan) {
        const completedSteps = plan.steps.filter((s) => s.status === "completed");
        const failedSteps = plan.steps.filter((s) => s.status === "failed");
        const messages = [
            {
                role: "user",
                content: JSON.stringify({
                    goal: plan.goal,
                    totalSteps: plan.steps.length,
                    completed: completedSteps.map((s) => ({
                        action: s.action,
                        result: s.result,
                    })),
                    failed: failedSteps.map((s) => ({
                        action: s.action,
                        error: s.error,
                    })),
                    reflections: plan.reflections,
                }),
            },
        ];
        try {
            const response = await this.inferenceEngine.infer({
                messages,
                mode: "balanced",
                systemPrompt: REFLECTION_SYSTEM_PROMPT,
                temperature: 0.3,
            });
            return parseReflectionResponse(response.content);
        }
        catch (err) {
            log.error("Plan-level reflection failed:", err);
            return { quality: "acceptable", issues: [], suggestions: [], shouldRetry: false };
        }
    }
}
// ─── Helpers ────────────────────────────────────────────────────────────────
function parseReflectionResponse(content) {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error("No JSON found");
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            quality: parsed.quality ?? "acceptable",
            issues: parsed.issues ?? [],
            suggestions: parsed.suggestions ?? [],
            shouldRetry: parsed.shouldRetry ?? false,
            adjustedPlan: parsed.adjustedPlan,
        };
    }
    catch {
        return { quality: "acceptable", issues: [], suggestions: [], shouldRetry: false };
    }
}
//# sourceMappingURL=index.js.map