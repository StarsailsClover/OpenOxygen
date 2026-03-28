/**
 * OpenOxygen — Multi-Model Router
 *
 * 多模型智能路由：根据任务类型、复杂度、成本约束自动选择最优模型。
 * 支持负载均衡、故障转移、API Key 轮换。
 */
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("inference/router");
// ─── Model Capability Profile ───────────────────────────────────────────────
// 0-10
speed; // 0-10
vision; // 0-10
toolUse; // 0-10
costPer1kTokens; // USD
maxContext; // tokens
;
const MODEL_PROFILES = {
    "gpt-4o": ,
    "gpt-4o-mini": ,
    "gpt-5.1": ,
    "claude-sonnet-4-20250514": ,
    "claude-opus-4-20250514": ,
    "gemini-2.5-pro": ,
    "gemini-2.5-flash": ,
    "step-2-16k": ,
};
function getModelProfile(model) { }
 | null;
{
    return MODEL_PROFILES[model] ?? null;
}
maxCostPer1kTokens ?  : ;
requireVision ?  : ;
requireToolUse ?  : ;
minContextLength ?  : ;
preferredProviders ?  : ;
excludeProviders ?  : ;
;
reason;
score;
fallbacks;
;
// ─── Key Rotation ───────────────────────────────────────────────────────────
currentIndex;
failedKeys;
;
const keyPools = new Map();
export function registerKeyPool(provider, keys) {
    keyPools.set(provider, {
        keys,
        currentIndex,
        failedKeys, Set() { },
    });
}
export function getNextKey(provider) { }
 | null;
{
    const pool = keyPools.get(provider);
    if (!pool || pool.keys.length === 0)
        return null;
    const availableKeys = pool.keys.filter((k) => !pool.failedKeys.has(k));
    if (availableKeys.length === 0) {
        // Reset failed keys and try again
        pool.failedKeys.clear();
        log.warn(`All keys for ${provider} failed, resetting pool`);
        return pool.keys[0] ?? null;
    }
    const key = availableKeys[pool.currentIndex % availableKeys.length];
    pool.currentIndex = (pool.currentIndex + 1) % availableKeys.length;
    return key ?? null;
}
export function markKeyFailed(provider, key) {
    const pool = keyPools.get(provider);
    if (pool) {
        pool.failedKeys.add(key);
        log.warn(`Key marked  for ${provider} (${pool.failedKeys.size}/${pool.keys.length})`);
    }
}
// ─── Router ─────────────────────────────────────────────────────────────────
export class ModelRouter {
    models;
    constructor(models) {
        this.models = models;
        this.initKeyPools();
    }
    initKeyPools() {
        // Group keys by provider for rotation
        const providerKeys = new Map < string, string, [];
         > ();
        for (const model of this.models) {
            if (model.apiKey) {
                const existing = providerKeys.get(model.provider) ?? [];
                existing.push(model.apiKey);
                providerKeys.set(model.provider, existing);
            }
        }
        for (const [provider, keys] of providerKeys) {
            registerKeyPool(provider, keys);
        }
    }
    updateModels(models) {
        this.models = models;
        this.initKeyPools();
    }
}
 | null;
{
    const strategy = constraints?.strategy ?? "balanced";
    const candidates = this.filterCandidates(constraints);
    if (candidates.length === 0) {
        log.warn("No models available for routing");
        return null;
    }
    // Score each candidate
    const scored = candidates.map((model) => ({
        model,
        score, : .scoreModel(model, mode, strategy),
    }));
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    const fallbacks = scored.slice(1, 3).map((s) => s.model);
    // Apply key rotation
    const rotatedKey = getNextKey(best.model.provider);
    if (rotatedKey) {
        best.model = { ...best.model, apiKey };
    }
    log.debug(`Routed to ${best.model.provider}/${best.model.model} (score: ${best.score.toFixed(2)}, mode: ${mode})`);
    return {
        model, : .model,
        reason: `${strategy} routing for ${mode} mode`,
        score, : .score,
        fallbacks,
    };
}
filterCandidates(constraints ?  : );
{
    let candidates = [...this.models];
    if (constraints?.excludeProviders) {
        candidates = candidates.filter((m) => !constraints.excludeProviders.includes(m.provider));
    }
    if (constraints?.preferredProviders) {
        const preferred = candidates.filter((m) => constraints.preferredProviders.includes(m.provider));
        if (preferred.length > 0)
            candidates = preferred;
    }
    if (constraints?.requireVision) {
        candidates = candidates.filter((m) => {
            const profile = getModelProfile(m.model);
            return profile ? profile.vision >= 5 : ; // Allow unknown models
        });
    }
    if (constraints?.maxCostPer1kTokens) {
        candidates = candidates.filter((m) => {
            const profile = getModelProfile(m.model);
            return profile ? profile.costPer1kTokens <= constraints.maxCostPer1kTokens : ;
        });
    }
    return candidates;
}
scoreModel(model, mode, strategy);
{
    const profile = getModelProfile(model.model);
    if (!profile)
        return 5; // Neutral score for unknown models
    const weights = mode === "deep"
        ? { reasoning, .5: , speed, .1: , toolUse, .3: , cost, .1:  }
            === "fast"
            ? { reasoning, .1: , speed, .5: , toolUse, .2: , cost, .2:  }
            :
        :
    ;
    if (strategy === "cost") {
        weights.cost = 0.5;
        weights.reasoning = 0.2;
        weights.speed = 0.2;
        weights.toolUse = 0.1;
    }
    else if (strategy === "performance") {
        weights.cost = 0.05;
        weights.reasoning = 0.5;
        weights.speed = 0.2;
        weights.toolUse = 0.25;
    }
    const costScore = Math.max(0, 10 - profile.costPer1kTokens * 1000);
    return (profile.reasoning * weights.reasoning +
        profile.speed * weights.speed +
        profile.toolUse * weights.toolUse +
        costScore * weights.cost);
}
