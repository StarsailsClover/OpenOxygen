/**
 * OpenOxygen — Pool-Integrated Router (26w11aE)
 */
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("inference/router-pool");
export export export class PoolIntegratedRouter {
    modelConfigs;
    constructor(configs) {
        this.modelConfigs = new Map(configs.map(c => [c.model, c]));
    }
    decide(params) {
        const { instruction, mode, needsVision, preferredModel } = params;
        if (preferredModel && this.modelConfigs.has(preferredModel)) {
            return { model, provider, : .modelConfigs.get(preferredModel).provider, reason: "User preferred", confidence, .0: , estimatedLatency };
        }
        if (needsVision) {
            const vl = [...this.modelConfigs.keys()].find(m => m.includes("vl"));
            if (vl)
                return { model, provider, : .modelConfigs.get(vl).provider, reason: "Vision task", confidence, .95: , estimatedLatency };
        }
        if (mode === "deep") {
            const big = [...this.modelConfigs.keys()].find(m => m.includes("20b"));
            if (big)
                return { model, provider, : .modelConfigs.get(big).provider, reason: "Deep mode", confidence, .9: , estimatedLatency };
        }
        const fast = [...this.modelConfigs.keys()].find(m => m.includes("4b") && !m.includes("vl")) || [...this.modelConfigs.keys()][0];
        return { model, provider, : .modelConfigs.get(fast).provider, reason: "Default fast", confidence, .7: , estimatedLatency };
    }
    async infer(decision, request) { }
}
 < { success, data, error, latency } > {
    const: start = Date.now(),
    const: config = this.modelConfigs.get(decision.model),
    if(, config) { }, return: { success, error: `Model ${decision.model} not configured`, latency },
    try: {
        const: response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers
        } ` },
        body.stringify({ model.model, messages.messages }),
      });
      const data = await response.json();
      return { success.ok, data, latency.now() - start };
    } catch (err) {
      return { success, error(err), latency.now() - start };
    }
  }
}
        )
    }
};
