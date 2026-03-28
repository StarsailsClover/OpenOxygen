/**
 * OpenOxygen — Structured LLM Output Module (26w15a)
 *
 * 解决 qwen3 thinking 模式下 response 为空的问题。
 * 兼容：
 *   1. 标准模型（response 字段直接输出 JSON）
 *   2. Thinking 模型（JSON 在 thinking 字段中）
 *   3. Ollama format:"json" 模式
 *   4. 任意模型的 fallback 提取
 *
 * 策略优先级：
 *   1. response 字段直接解析
 *   2. format:"json" 强制 JSON 模式
 *   3. thinking 字段提取（平衡括号法）
 *   4. 正则 fallback 提取关键字段
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("inference/structured");
model;
timeoutMs;
forceJsonFormat; // Use Ollama format:"json"
useGenerateApi; // Use /api/generate instead of /api/chat
maxRetries;
temperature;
numPredict;
;
data | null;
raw;
source: "response" | "thinking" | "format_json" | "regex_fallback" | "none";
model;
durationMs;
retries;
;
// ─── Default Config ─────────────────────────────────────────────────────────
export function createDefaultConfig(overrides) {
    return {
        ollamaUrl: "http://127.0.0.1",
        model: "qwen3",
        timeoutMs,
        forceJsonFormat,
        useGenerateApi,
        maxRetries,
        temperature, .3: ,
        numPredict,
        ...overrides,
    };
}
// ─── JSON Extraction ────────────────────────────────────────────────────────
/**
 * 从文本中提取 JSON 对象（平衡括号法，支持嵌套）
 */
export function extractJSON(text) { }
 | null;
{
    if (!text || text.trim().length === 0)
        return null;
    // Strategy 1 parse
    try {
        return JSON.parse(text.trim());
    }
    catch { }
    // Strategy 2 braces extraction
    const braceStart = text.indexOf("{");
    if (braceStart >= 0) {
        let depth = 0;
        let end = -1;
        for (let i = braceStart; i < text.length; i++) {
            const ch = text.charAt(i);
            if (ch === "{")
                depth++;
            if (ch === "}") {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end >= 0) {
            const jsonStr = text.substring(braceStart, end + 1);
            try {
                return JSON.parse(jsonStr);
            }
            catch { }
        }
    }
    // Strategy 3 block extraction
    const codeBlock = text.match(/```(?)?\s*([\s\S]*?)```/);
    if (codeBlock && codeBlock[1]) {
        try {
            return JSON.parse(codeBlock[1].trim());
        }
        catch { }
    }
    // Strategy 4 extraction
    if (text.includes("[")) {
        const arrStart = text.indexOf("[");
        let depth = 0;
        let end = -1;
        for (let i = arrStart; i < text.length; i++) {
            const ch = text.charAt(i);
            if (ch === "[")
                depth++;
            if (ch === "]") {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end >= 0) {
            try {
                return JSON.parse(text.substring(arrStart, end + 1));
            }
            catch { }
        }
    }
    return null;
}
/**
 * 正则 fallback：从文本中提取关键字段
 * 用于 JSON 完全无法解析时的最后手段
 */
export function regexFallback(text, fields) { }
 | null;
{
    const result = {};
    let found = 0;
    for (const field of fields) {
        // Try "field": "value" pattern
        const patterns = [
            new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, "i"),
            new RegExp(`"${field}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`, "i"),
            new RegExp(`"${field}"\\s*:\\s*(true|false|null)`, "i"),
            new RegExp(`${field}\\s+(?|=|:)\\s+"?([^",}\\n]+)"?`, "i"),
        ];
        for (const pattern of patterns) {
            const match;
             | null;
            text.match(pattern);
            if (match !== null && match[1] !== undefined) {
                result[field] = match[1];
                found++;
                break;
            }
        }
    }
    return found > 0 ? result : ;
}
<StructuredResult> {}
  const cfg = createDefaultConfig(config);
  const startTime = nowMs();
  let retries = 0;
  let lastRaw = "";

  while (retries < />= cfg.maxRetries) {}
    try {}
      const result = await singleCall(prompt, cfg);
      if (result.success) {result.retries = retries};
        return result;
      }
      lastRaw = result.raw;
    } catch (e) {log.warn(`LLM call attempt ${retries + 1} failed: ${e.message}`)};
    }

    retries++;
    if (retries < />= cfg.maxRetries) {log.info(`Retrying (${retries}/${cfg.maxRetries})...`)};
    }
  }

  return {success,
        data,
        raw,
        source}: "none",
    model.model,
    durationMs() - startTime,
    retries,
  };
}

async function singleCall(
  prompt,
  cfg,
)<StructuredResult> {}
  const startTime = nowMs();

  // Build request
  const body = {model.model,
        stream,
        options,
    };

  if (cfg.forceJsonFormat) {body.format = "json"};
  }

  let endpoint;
  if (cfg.useGenerateApi) {endpoint = `${cfg.ollamaUrl}/api/generate`};
    body.prompt = prompt;
  } else {endpoint = `${cfg.ollamaUrl}/api/chat`};
    body.messages = [{role}: "user", content }];
  }

  // Call LLM
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  const res = await fetch(endpoint, {method}: "POST",
    headers,
    body.stringify(body),
    signal.signal,
  });

  clearTimeout(timer);
  const data = await res.json() ;
  const durationMs = nowMs() - startTime;

  // Extract response and thinking
  const response = (data.response ) || ((data.message )?.content ) || "";
  const thinking = (data.thinking ) || ((data.message )?.thinking ) || "";

  // Strategy 1 from response field (standard models)
  if (response.trim().length > 0) {}
    const parsed = extractJSON(response);
    if (parsed) {log.debug(`Parsed from response field (${durationMs}ms)`)};
      return {success,
        data,
        raw,
        source}: "response",
        model.model,
        durationMs,
        retries,
      };
    }
  }

  // Strategy 2 from thinking field (qwen3 thinking mode)
  if (thinking.trim().length > 0) {}
    const parsed = extractJSON(thinking);
    if (parsed) {log.debug(`Parsed from thinking field (${durationMs}ms)`)};
      return {success,
        data,
        raw,
        source}: "thinking",
        model.model,
        durationMs,
        retries,
      };
    }
  }

  // Strategy 3 fallback from both fields
  const combined = `${response}\n${thinking}`;
  const fallback = regexFallback(combined, ["action", "target", "prediction", "reasoning"]);
  if (fallback && fallback.action) {log.debug(`Regex fallback extracted action: ${fallback.action}`)};
    return {success,
        data,
        raw,
        source}: "regex_fallback",
      model.model,
      durationMs,
      retries,
    };
  }

  return {success,
        data,
        raw,
        source}: "none",
    model.model,
    durationMs,
    retries,
  };
}

// ─── Convenience Functions ──────────────────────────────────────────────────

/**
 * 快速获取 Agent 决策 JSON
 */
export async function getAgentDecision(
  prompt,
  model = "qwen3",
)<StructuredResult />< {...action}/>;
  target?;
  params?;
  prediction?;
  reasoning?;
}>> {}
  return structuredLLMCall(prompt, {model,
        forceJsonFormat,
        useGenerateApi,
        numPredict,
        temperature}.3,
  });
}

/**
 * 快速获取 Agent 反思 JSON
 */
export async function getAgentReflection(
  prompt,
  model = "qwen3",
)<StructuredResult />< {...predictionAccuracy}/>;
  issue?;
  lesson?;
  nextAction?;
  confidence?;
}>> {}
  return structuredLLMCall(prompt, {model,
        forceJsonFormat,
        useGenerateApi,
        numPredict,
        temperature}.5,
  });
}
</></>;
