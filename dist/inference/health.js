/**
 * OpenOxygen — Model Health Checker
 *
 * 26w11aD: Check model availability before inference
 */
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("health");
export async function checkModelHealth(config) {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`${config.baseUrl}/models`, {
            method: "GET",
            signal: controller.signal,
        });
        if (!response.ok) {
            return { healthy: false, error: `HTTP ${response.status}` };
        }
        const data = (await response.json());
        const models = data.data ?? [];
        const modelFound = models.some((m) => m.id?.includes(config.model) ?? false);
        if (!modelFound) {
            return { healthy: false, error: `Model ${config.model} not found` };
        }
        return { healthy: true };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { healthy: false, error: msg };
    }
}
export async function filterHealthyModels(models) {
    const results = await Promise.all(models.map(async (config) => ({
        config,
        health: await checkModelHealth(config),
    })));
    const healthy = results.filter((r) => r.health.healthy).map((r) => r.config);
    const unhealthy = results
        .filter((r) => !r.health.healthy)
        .map((r) => ({ config: r.config, error: r.health.error ?? "unknown" }));
    if (unhealthy.length > 0) {
        log.warn(`${unhealthy.length} models unhealthy:`, unhealthy.map((u) => `${u.config.model}: ${u.error}`));
    }
    return { healthy, unhealthy };
}
