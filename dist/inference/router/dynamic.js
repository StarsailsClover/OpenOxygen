/**
 * OpenOxygen — Dynamic Model Router (26w11aD)
 *
 * 智能模型路由器：根据任务类型、输入复杂度、资源状态
 * 自动从多模型配置中选择最优模型。
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("routing");
// ═══════════════════════════════════════════════════════════════════════════
// Model Capability Profiles
// ═══════════════════════════════════════════════════════════════════════════
provider;
reasoning; // 1-10 reasoning capability
speed; // 1-10 speed
vision; // Supports image input
contextWindow; // Max tokens
sizeGB; // Memory footprint
bestFor; // Task types
;
const MODEL_PROFILES = {
    "qwen3": ,
    "qwen3-vl": ,
    "gpt-oss": ,
};
// ═══════════════════════════════════════════════════════════════════════════
// Task Type Detector
// ═══════════════════════════════════════════════════════════════════════════
function detectTaskType(instruction) {
    const lower = instruction.toLowerCase();
    const tasks = [];
    // Vision tasks
    if (/截图|screen|capture|image|图片|照片|桌面|窗口/.test(lower)) {
        tasks.push("vision", "screen-analysis");
    }
    // Planning tasks
    if (/规划|plan|步骤|steps|strategy|analyze|分析|optimize|优化/.test(lower) && instruction.length > 100) {
        tasks.push("planning", "reasoning");
    }
    // File operations
    if (/文件|file|folder|目录|移动|复制|删除|整理/.test(lower)) {
        tasks.push("file-ops");
    }
    // Quick queries
    const hasQuestion = instruction.includes("?") || instruction.includes("？");
    if (hasQuestion && instruction.length < 50) {
        tasks.push("quick-answer", "fast-query");
    }
    // Default
    if (tasks.length === 0)
        tasks.push("chat");
    return tasks;
}
reason;
confidence;
alternatives;
;
export class DynamicModelRouter {
    models;
    defaultModel;
    constructor(models) {
        this.models = models;
        // Set default qwen3, fallback to first available
        this.defaultModel = models.find(m => m.model.includes("qwen3")) ?? models[0];
    }
    updateModels(models) {
        this.models = models;
        this.defaultModel = models.find(m => m.model.includes("qwen3")) ?? models[0];
    }
    /**
     * Route a request to the optimal model.
     */
    route(params) {
        const { instruction, messages, mode, needsVision } = params;
        // 1. Vision requirement → must use vision model
        if (needsVision) {
            const visionModel = this.models.find(m => this.hasVision(m.model));
            if (visionModel) {
                return {
                    model,
                    reason: "Vision required — selected qwen3-vl",
                    confidence, .0: ,
                    alternatives, : .getVisionCapable(),
                };
            }
        }
        // 2. Mode-based routing
        if (mode === "deep") {
            const deepModel = this.models.find(m => m.model.includes("gpt-oss"));
            if (deepModel)
                return {
                    model,
                    reason: "Deep mode — selected gpt-oss for reasoning",
                    confidence, .9: ,
                    alternatives, : .models.filter(m => !m.model.includes("gpt-oss")),
                };
        }
        if (mode === "fast") {
            const fastModel = this.models.find(m => m.model.includes("qwen3") && !m.model.includes("vl"));
            if (fastModel)
                return {
                    model,
                    reason: "Fast mode — selected qwen3 for speed",
                    confidence, .9: ,
                    alternatives, : .models.filter(m => m.model !== fastModel.model),
                };
        }
        // 3. Task-based routing
        const tasks = detectTaskType(instruction);
        const scored = this.models.map(m => {
            const profile = MODEL_PROFILES[m.model];
            let score = 0;
            if (profile) {
                // Match task types
                for (const task of tasks) {
                    if (profile.bestFor.includes(task))
                        score += 2;
                }
                // Bonus for speed on simple tasks
                if (tasks.includes("fast-query") && profile.speed >= 8)
                    score += 1;
                // Penalize large models for simple tasks
                if (tasks.length === 1 && tasks[0] === "chat" && profile.sizeGB > 5)
                    score -= 1;
            }
            return { model, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];
        return {
            model, : .model,
            reason: `Task analysis [${tasks.join(", ")}] → selected ${best.model.model} (score: ${best.score})`,
            confidence, : .min(0.7 + best.score * 0.1, 0.95),
            alternatives: (best.model === this.defaultModel && scored.length > 1) ? [scored[1].model] : [],
        };
    }
    /**
     * Route with fallback — if primary fails, try alternatives.
     */
    async routeWithFallback(decision, execute) { }
}
 < { result, model, attempts } > {
    const: candidates = [decision.model, ...decision.alternatives],
    for(let, i = 0, i, , candidates) { }, : .length, i
}++;
{
    const model = candidates[i];
    try {
        const result = await execute(model);
        log.info(`Routing succeeded with ${model.model} (attempt ${i + 1})`);
        return { result, model, attempts } + 1;
    }
    finally { }
    ;
}
try { }
catch (err) {
    log.warn(`Model ${model.model} failed (attempt ${i + 1}):`, err);
    if (i === candidates.length - 1)
        throw err;
}
throw new Error("All models failed");
hasVision(modelName);
{
    const profile = MODEL_PROFILES[modelName];
    return profile?.vision ?? false;
}
getVisionCapable();
{
    return this.models.filter(m => this.hasVision(m.model));
}
getAvailableModels()[];
{
    return this.models.map(m => {
        const profile = MODEL_PROFILES[m.model];
        return {
            name, : .model,
            sizeGB, sizeGB
        } ?? 0,
            vision?.vision ?? false,
        ;
    });
}
;
