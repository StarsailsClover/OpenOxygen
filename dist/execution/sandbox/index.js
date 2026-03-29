/**
 * OpenOxygen - Execution Sandbox (Security Hardened)
 *
 * Secure sandbox for executing untrusted code and plugins.
 * Uses Node.js Worker Threads for true isolation.
 * Provides resource limits, timeout control, and permission isolation.
 */
import { Worker } from "node:worker_threads";
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("execution/sandbox");
// ============================================================================
// Default Config
// ============================================================================
export function createDefaultSandboxConfig() {
    return {
        enabled: true,
        timeoutMs: 30_000,
        maxMemoryMB: 256,
        allowedModules: ["path", "url", "crypto", "util"],
        blockedAPIs: [
            "child_process",
            "fs",
            "net",
            "dgram",
            "cluster",
            "worker_threads",
        ],
    };
}
// ============================================================================
// Worker Thread Code (Serialized)
// ============================================================================
const WORKER_SCRIPT = `
const { parentPort } = require("worker_threads");

// Block dangerous APIs
const blockedGlobals = ["process", "require", "global", "Buffer"];
const sandboxContext = {};

// Safe console implementation
const safeConsole = {
  log: (...args) => parentPort.postMessage({ type: "log", level: "log", message: args.join(" ") }),
  error: (...args) => parentPort.postMessage({ type: "log", level: "error", message: args.join(" ") }),
  warn: (...args) => parentPort.postMessage({ type: "log", level: "warn", message: args.join(" ") }),
  info: (...args) => parentPort.postMessage({ type: "log", level: "info", message: args.join(" ") }),
};

// Safe Math and Date
const safeMath = Math;
const safeDate = Date;
const safeJSON = JSON;
const safeArray = Array;
const safeObject = Object;
const safeString = String;
const safeNumber = Number;
const safeBoolean = Boolean;
const safePromise = Promise;
const safeError = Error;
const safeMap = Map;
const safeSet = Set;
const safeRegExp = RegExp;

parentPort.on("message", async (message) => {
  const { code, context } = message;
  
  try {
    // Create isolated function with limited context
    const sandboxFn = new Function(
      "console",
      "Math",
      "Date",
      "JSON",
      "Array",
      "Object",
      "String",
      "Number",
      "Boolean",
      "Promise",
      "Error",
      "Map",
      "Set",
      "RegExp",
      "context",
      \`
        "use strict";
        try {
          const result = (\${code});
          return { success: true, result };
        } catch (e) {
          return { success: false, error: e.message };
        }
      \`
    );
    
    const executionResult = sandboxFn(
      safeConsole,
      safeMath,
      safeDate,
      safeJSON,
      safeArray,
      safeObject,
      safeString,
      safeNumber,
      safeBoolean,
      safePromise,
      safeError,
      safeMap,
      safeSet,
      safeRegExp,
      context || {}
    );
    
    if (executionResult.success) {
      parentPort.postMessage({ type: "result", result: executionResult.result });
    } else {
      parentPort.postMessage({ type: "error", error: executionResult.error });
    }
  } catch (error) {
    parentPort.postMessage({ type: "error", error: error.message });
  }
});
`;
// ============================================================================
// Sandbox Executor
// ============================================================================
const activeExecutions = new Map();
/**
 * Execute code in a secure sandbox using Worker Threads
 *
 * Security features:
 * - Code runs in isolated Worker Thread
 * - No access to Node.js APIs (fs, net, child_process, etc.)
 * - Limited JavaScript globals only
 * - Timeout enforcement
 * - Memory limits (via resourceLimits in Worker constructor)
 */
export async function executeSandboxed(code, config = createDefaultSandboxConfig(), context) {
    const start = nowMs();
    const execId = generateId("sandbox");
    const execution = {
        id: execId,
        code: code.slice(0, 1000), // Truncate for logging
        startTime: start,
        status: "running",
    };
    activeExecutions.set(execId, execution);
    log.info(`Sandbox execution started: ${execId}`);
    if (!config.enabled) {
        return {
            success: false,
            error: "Sandbox is disabled",
            durationMs: nowMs() - start,
        };
    }
    // Validate code for dangerous patterns
    const validation = validateCode(code);
    if (!validation.valid) {
        execution.status = "failed";
        execution.endTime = nowMs();
        return {
            success: false,
            error: `Code validation failed: ${validation.reason}`,
            durationMs: nowMs() - start,
        };
    }
    try {
        const result = await executeInWorker(code, context, config);
        execution.status = result.success ? "completed" : "failed";
        execution.endTime = nowMs();
        execution.result = result.result;
        if (!result.success) {
            execution.error = result.error;
        }
        log.info(`Sandbox execution completed: ${execId} (${result.success ? "success" : "failed"})`);
        return {
            success: result.success,
            data: result.result,
            error: result.error,
            durationMs: nowMs() - start,
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        execution.status = "failed";
        execution.endTime = nowMs();
        execution.error = errorMsg;
        log.error(`Sandbox execution failed: ${execId} - ${errorMsg}`);
        return {
            success: false,
            error: errorMsg,
            durationMs: nowMs() - start,
        };
    }
    finally {
        // Clean up after a delay to allow result inspection
        setTimeout(() => activeExecutions.delete(execId), 60_000);
    }
}
/**
 * Execute code in a Worker Thread with proper isolation
 */
async function executeInWorker(code, context, config) {
    return new Promise((resolve, reject) => {
        let timeoutId;
        let worker = null;
        try {
            worker = new Worker(WORKER_SCRIPT, {
                eval: true,
                resourceLimits: {
                    maxOldGenerationSizeMb: config.maxMemoryMB,
                    maxYoungGenerationSizeMb: Math.floor(config.maxMemoryMB / 4),
                },
            });
            const cleanup = () => {
                if (timeoutId)
                    clearTimeout(timeoutId);
                if (worker) {
                    worker.terminate().catch(() => { });
                    worker = null;
                }
            };
            // Set timeout
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Sandbox execution timed out after ${config.timeoutMs}ms`));
            }, config.timeoutMs);
            worker.on("message", (message) => {
                switch (message.type) {
                    case "result":
                        cleanup();
                        resolve({ success: true, result: message.result });
                        break;
                    case "error":
                        cleanup();
                        resolve({ success: false, error: message.error });
                        break;
                    case "log":
                        log.debug(`[Sandbox] ${message.message}`);
                        break;
                }
            });
            worker.on("error", (error) => {
                cleanup();
                reject(error);
            });
            worker.on("exit", (code) => {
                if (code !== 0) {
                    cleanup();
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
            // Send code to worker
            worker.postMessage({ code, context });
        }
        catch (error) {
            if (worker) {
                worker.terminate().catch(() => { });
            }
            reject(error);
        }
    });
}
/**
 * Validate code for dangerous patterns
 */
function validateCode(code) {
    // Check for blocked APIs
    const dangerousPatterns = [
        { pattern: /\brequire\s*\(/, desc: "require() is not allowed" },
        { pattern: /\bimport\s+/, desc: "ES modules import is not allowed" },
        { pattern: /\bprocess\b/, desc: "process object access is not allowed" },
        { pattern: /\bglobal\b/, desc: "global object access is not allowed" },
        { pattern: /\bBuffer\b/, desc: "Buffer access is not allowed" },
        { pattern: /\beval\s*\(/, desc: "eval() is not allowed" },
        { pattern: /\bFunction\s*\(/, desc: "Function constructor is not allowed" },
        { pattern: /\bsetTimeout\s*\(/, desc: "setTimeout is not allowed" },
        { pattern: /\bsetInterval\s*\(/, desc: "setInterval is not allowed" },
        { pattern: /\bclearTimeout\s*\(/, desc: "clearTimeout is not allowed" },
        { pattern: /\bclearInterval\s*\(/, desc: "clearInterval is not allowed" },
        { pattern: /\bfetch\s*\(/, desc: "fetch() is not allowed" },
        { pattern: /\bXMLHttpRequest\b/, desc: "XMLHttpRequest is not allowed" },
        { pattern: /\bWebSocket\b/, desc: "WebSocket is not allowed" },
        { pattern: /\blocalStorage\b/, desc: "localStorage access is not allowed" },
        {
            pattern: /\bsessionStorage\b/,
            desc: "sessionStorage access is not allowed",
        },
        { pattern: /\bdocument\b/, desc: "document access is not allowed" },
        { pattern: /\bwindow\b/, desc: "window access is not allowed" },
        {
            pattern: /\bconstructor\s*\[\s*"prototype"\s*\]/,
            desc: "Prototype pollution attempt detected",
        },
        { pattern: /__proto__/, desc: "Prototype access is not allowed" },
        {
            pattern: /prototype\s*\.\s*constructor/,
            desc: "Constructor manipulation is not allowed",
        },
    ];
    for (const { pattern, desc } of dangerousPatterns) {
        if (pattern.test(code)) {
            return { valid: false, reason: desc };
        }
    }
    // Check code length
    if (code.length > 100_000) {
        return {
            valid: false,
            reason: "Code exceeds maximum length of 100,000 characters",
        };
    }
    return { valid: true };
}
// ============================================================================
// Execution Management
// ============================================================================
export function getActiveExecutions() {
    return [...activeExecutions.values()].filter((e) => e.status === "running");
}
export function getExecution(id) {
    return activeExecutions.get(id);
}
export function cancelExecution(id) {
    const execution = activeExecutions.get(id);
    if (execution && execution.status === "running") {
        execution.status = "failed";
        execution.endTime = nowMs();
        execution.error = "Cancelled by user";
        return true;
    }
    return false;
}
export function getExecutionStats() {
    const executions = [...activeExecutions.values()];
    return {
        total: executions.length,
        running: executions.filter((e) => e.status === "running").length,
        completed: executions.filter((e) => e.status === "completed").length,
        failed: executions.filter((e) => e.status === "failed").length,
        timeout: executions.filter((e) => e.status === "timeout").length,
    };
}
// ============================================================================
// Safe Expression Evaluation
// ============================================================================
/**
 * Safely evaluate a simple mathematical or logical expression
 * This is a convenience wrapper for simple use cases
 */
export async function evaluateExpression(expression, variables) {
    // Only allow safe characters in expressions
    const safePattern = /^[\d\s+\-*/().,<>!=&|%^\w\[\]"']+$/;
    if (!safePattern.test(expression)) {
        return {
            success: false,
            error: "Expression contains unsafe characters",
        };
    }
    const code = `
    const { ${Object.keys(variables || {}).join(", ")} } = context;
    return (${expression});
  `;
    return executeSandboxed(code, createDefaultSandboxConfig(), variables);
}
