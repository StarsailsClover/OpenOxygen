/**
 * OpenOxygen — Multi-Model Router
 *
 * 多模型智能路由：根据任务类型、复杂度、成本约束自动选择最优模型。
 * 支持负载均衡、故障转移、API Key 轮换。
 */
import { createSubsystemLogger } from "../../logging/index.js";
const log = createSubsystemLogger("inference/router");
const MODEL_PROFILES = {
    "gpt-4o": {
        reasoning: 9,
        speed: 7,
        vision: 9,
        toolUse: 9,
        costPer1kTokens: 0.005,
        maxContext: 128000,
    },
    "gpt-4o-mini": {
        reasoning: 7,
        speed: 9,
        vision: 7,
        toolUse: 8,
        costPer1kTokens: 0.00015,
        maxContext: 128000,
    },
    "gpt-5.1": {
        reasoning: 10,
        speed: 6,
        vision: 10,
        toolUse: 10,
        costPer1kTokens: 0.01,
        maxContext: 256000,
    },
    "claude-sonnet-4-20250514": {
        reasoning: 9,
        speed: 7,
        vision: 8,
        toolUse: 9,
        costPer1kTokens: 0.003,
        maxContext: 200000,
    },
    "claude-opus-4-20250514": {
        reasoning: 10,
        speed: 5,
        vision: 9,
        toolUse: 9,
        costPer1kTokens: 0.015,
        maxContext: 200000,
    },
    "gemini-2.5-pro": {
        reasoning: 9,
        speed: 7,
        vision: 9,
        toolUse: 8,
        costPer1kTokens: 0.00125,
        maxContext: 1000000,
    },
    "gemini-2.5-flash": {
        reasoning: 7,
        speed: 9,
        vision: 7,
        toolUse: 7,
        costPer1kTokens: 0.00015,
        maxContext: 1000000,
    },
    "step-2-16k": {
        reasoning: 8,
        speed: 8,
        vision: 7,
        toolUse: 7,
        costPer1kTokens: 0.001,
        maxContext: 16000,
    },
};
function getModelProfile(model) {
    return MODEL_PROFILES[model] ?? null;
}
const keyPools = new Map();
export function registerKeyPool(provider, keys) {
    keyPools.set(provider, {
        keys,
        currentIndex: 0,
        failedKeys: new Set(),
    });
}
export function getNextKey(provider) {
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
        log.warn(`Key marked as failed for ${provider} (${pool.failedKeys.size}/${pool.keys.length})`);
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
        const providerKeys = new Map();
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
    route(mode, constraints) {
        const strategy = constraints?.strategy ?? "balanced";
        const candidates = this.filterCandidates(constraints);
        if (candidates.length === 0) {
            log.warn("No models available for routing");
            return null;
        }
        // Score each candidate
        const scored = candidates.map((model) => ({
            model,
            score: this.scoreModel(model, mode, strategy),
        }));
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];
        const fallbacks = scored.slice(1, 3).map((s) => s.model);
        // Apply key rotation
        const rotatedKey = getNextKey(best.model.provider);
        if (rotatedKey) {
            best.model = { ...best.model, apiKey: rotatedKey };
        }
        log.debug(`Routed to ${best.model.provider}/${best.model.model} (score: ${best.score.toFixed(2)}, mode: ${mode})`);
        return {
            model: best.model,
            reason: `${strategy} routing for ${mode} mode`,
            score: best.score,
            fallbacks,
        };
    }
    filterCandidates(constraints) {
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
                return profile ? profile.vision >= 5 : true; // Allow unknown models
            });
        }
        if (constraints?.maxCostPer1kTokens) {
            candidates = candidates.filter((m) => {
                const profile = getModelProfile(m.model);
                return profile
                    ? profile.costPer1kTokens <= constraints.maxCostPer1kTokens
                    : true;
            });
        }
        return candidates;
    }
    scoreModel(model, mode, strategy) {
        const profile = getModelProfile(model.model);
        if (!profile)
            return 5; // Neutral score for unknown models
        const weights = mode === "deep"
            ? { reasoning: 0.5, speed: 0.1, toolUse: 0.3, cost: 0.1 }
            : mode === "fast"
                ? { reasoning: 0.1, speed: 0.5, toolUse: 0.2, cost: 0.2 }
                : { reasoning: 0.3, speed: 0.3, toolUse: 0.2, cost: 0.2 };
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
}
