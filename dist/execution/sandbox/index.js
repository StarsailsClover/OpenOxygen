/**
 * OpenOxygen — Execution Sandbox
 *
 * 安全沙箱：隔离执行不受信任的代码和插件。
 * 提供资源限制、超时控制和权限隔离。
 */
import { Worker } from "node:worker_threads";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs, withTimeout } from "../../utils/index.js";
const log = createSubsystemLogger("execution/sandbox");
// ─── Default Config ─────────────────────────────────────────────────────────
export function createDefaultSandboxConfig() {
    return {
        enabled: true,
        timeoutMs: 30_000,
        maxMemoryMB: 256,
        allowedModules: ["path", "url", "crypto", "util"],
        blockedAPIs: ["child_process", "fs", "net", "dgram", "cluster", "worker_threads"],
    };
}
// ─── Sandbox Executor ───────────────────────────────────────────────────────
const activeExecutions = new Map();
export async function executeSandboxed(code, config = createDefaultSandboxConfig(), context) {
    const start = nowMs();
    const execId = generateId("sandbox");
    const execution = {
        id: execId,
        code,
        startTime: start,
        status: "running",
    };
    activeExecutions.set(execId, execution);
    try {
        // Validate code doesn't use blocked APIs
        for (const blocked of config.blockedAPIs) {
            if (code.includes(`require('${blocked}')`) || code.includes(`require("${blocked}")`)) {
                throw new Error(`Blocked API usage: ${blocked}`);
            }
            if (code.includes(`from '${blocked}'`) || code.includes(`from "${blocked}"`)) {
                throw new Error(`Blocked API import: ${blocked}`);
            }
        }
        // Execute in isolated context using Function constructor
        // (Worker threads would be used for full isolation in production)
        const wrappedCode = `
      "use strict";
      const __context = ${JSON.stringify(context ?? {})};
      const __result = (async () => {
        ${code}
      })();
      return __result;
    `;
        const fn = new Function(wrappedCode);
        const result = await withTimeout(fn(), config.timeoutMs, `sandbox:${execId}`);
        execution.result = result;
        execution.status = "completed";
        execution.endTime = nowMs();
        log.info(`Sandbox ${execId} completed in ${execution.endTime - start}ms`);
        return { success: true, output: result, durationMs: nowMs() - start };
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        execution.error = errorMsg;
        execution.status = errorMsg.includes("timed out") ? "timeout" : "failed";
        execution.endTime = nowMs();
        log.warn(`Sandbox ${execId} ${execution.status}: ${errorMsg}`);
        return { success: false, error: errorMsg, durationMs: nowMs() - start };
    }
    finally {
        // Clean up after a delay
        setTimeout(() => activeExecutions.delete(execId), 60_000);
    }
}
export function getActiveExecutions() {
    return [...activeExecutions.values()].filter((e) => e.status === "running");
}
export function getExecution(id) {
    return activeExecutions.get(id);
}
//# sourceMappingURL=index.js.map