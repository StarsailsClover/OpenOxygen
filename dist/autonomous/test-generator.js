/**
 * OpenOxygen — Autonomous Test Generator (26w15aD Phase 3)
 *
 * 自主测试生成系统
 * 利用预置数据库和记忆教会任务分配和拆解层
 * LLM 自主决策并运行任务
 */
import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import { GlobalMemory } from "../memory/global/index.js";
import { decomposeTask, createOrchestration, executeOrchestration } from "../agent/orchestrator/index.js";
const log = createSubsystemLogger("autonomous/test-generator");
// Test pattern database
// Function information
// Generated test
// Autonomous decision
// Decision memory
const decisionMemory = [];
/**
 * Initialize test pattern database
 */
function initializeTestPatterns() {
    return [
        {
            id: "pattern-001",
            name: "Basic Functionality Test",
            description: "Test basic function execution with valid inputs",
            applicableTo: ["*"],
            generateTest: (fn) => ({
                name: `${fn.name} should execute successfully`,
                description: `Test that ${fn.name} executes without errors`,
                code: `const result = await ${fn.name}(${fn.params.map(p => `"test_${p.name}"`).join(", ")});`,
                expectedResult: "defined",
            }),
        },
        {
            id: "pattern-002",
            name: "Null/Undefined Input Test",
            description: "Test function behavior with null/undefined inputs",
            applicableTo: ["*"],
            generateTest: (fn) => ({
                name: `${fn.name} should handle null inputs`,
                description: `Test that ${fn.name} handles null/undefined gracefully`,
                code: `const result = await ${fn.name}(${fn.params.map(() => "null").join(", ")});`,
                expectedResult: "error_or_default",
            }),
        },
        {
            id: "pattern-003",
            name: "Empty String Test",
            description: "Test function with empty string inputs",
            applicableTo: ["*string*"],
            generateTest: (fn) => ({
                name: `${fn.name} should handle empty strings`,
                description: `Test that ${fn.name} handles empty string inputs`,
                code: `const result = await ${fn.name}(${fn.params.map(() => '""').join(", ")});`,
                expectedResult: "defined",
            }),
        },
        {
            id: "pattern-004",
            name: "Boundary Value Test",
            description: "Test function with boundary values",
            applicableTo: ["*number*"],
            generateTest: (fn) => ({
                name: `${fn.name} should handle boundary values`,
                description: `Test that ${fn.name} handles min/max values`,
                code: `const result = await ${fn.name}(${fn.params.map(() => "0").join(", ")});`,
                expectedResult: "defined",
            }),
        },
    ];
}
// Test pattern database
const testPatterns = initializeTestPatterns();
/**
 * Analyze function and extract information
 * @param fn - Function to analyze
 */
export function analyzeFunction(fn) {
    const name = fn.name || "anonymous";
    // Extract parameters from function string
    const fnString = fn.toString();
    const paramMatch = fnString.match(/\(([^)]*)\)/);
    const params, [];
    "params";
    [];
    if (paramMatch) {
        const paramList = paramMatch[1].split(",").map(p => p.trim()).filter(p => p);
        for (const param of paramList) {
            const [paramName, defaultValue] = param.split("=").map(p => p.trim());
            params.push({
                name,
                type: "unknown",
                optional: !!defaultValue,
            });
        }
    }
    // Check if async
    const async = fnString.startsWith("async");
    return {
        name,
        params,
        async,
    };
}
/**
 * Generate tests for a function
 * @param fn - Function to test
 * @param options - Generation options
 */
export function generateTestsForFunction(fn, options = {}) {
    const functionInfo = analyzeFunction(fn);
    const tests = [];
    log.info(`Generating tests for function: ${functionInfo.name}`);
    // Find applicable patterns
    const applicablePatterns = testPatterns.filter(pattern => {
        // Check if pattern applies to this function
        return pattern.applicableTo.some(pattern => {
            if (pattern === "*")
                return true;
            if (pattern.includes("*")) {
                const regex = new RegExp(pattern.replace(/\*/g, ".*"));
                return regex.test(functionInfo.name);
            }
            return false;
        });
    });
    // Generate tests from patterns
    for (const pattern of applicablePatterns.slice(0, options.count || 4)) {
        try {
            const test = pattern.generateTest(functionInfo);
            tests.push(test);
            log.debug(`Generated test: ${test.name}`);
        }
        catch (error) {
            log.error(`Failed to generate test from pattern ${pattern.id}: ${error.message}`);
        }
    }
    return tests;
}
/**
 * Autonomous task decomposition
 * Uses memory and patterns to decompose tasks without human intervention
 * @param instruction - User instruction
 */
export async function autonomousDecompose(instruction) {
    log.info(`Autonomous decomposition: ${instruction}`);
    // Check memory for similar decompositions
    const memory = new GlobalMemory(".state", ".state/autonomous-memory.db");
    const similarTasks = memory.queryTasks({ limit });
    // Find similar task patterns
    const similarPatterns = similarTasks.filter(task => {
        const instructionWords = instruction.toLowerCase().split(/\s+/);
        const taskWords = task.instruction.toLowerCase().split(/\s+/);
        const overlap = instructionWords.filter(w => taskWords.includes(w));
        return overlap.length >= 2;
    });
    // Use similar patterns to inform decomposition
    let plan = decomposeTask(instruction);
    // Enhance plan based on memory
    if (similarPatterns.length > 0) {
        log.info(`Found ${similarPatterns.length} similar task patterns`);
        // Adjust strategy based on success rate of similar tasks
        const successRate = similarPatterns.filter(t => t.success).length / similarPatterns.length;
        if (successRate < 0.5) {
            // Low success rate - add more verification steps
            plan.subtasks.push({
                name: "验证结果",
                instruction: "验证上一步的执行结果",
                mode: "terminal",
            });
        }
    }
    memory.close();
    // Record this decomposition
    recordDecision({
        context: `Decompose: ${instruction}`,
        decision: `Strategy: ${plan.strategy}, ${plan.subtasks.length} subtasks`,
        reasoning: `Based on ${similarPatterns.length} similar patterns with ${similarPatterns.filter(t => t.success).length / (similarPatterns.length || 1) * 100}% success rate`,
        action() { }, plan,
        success,
    });
    return plan;
}
/**
 * Autonomous task execution with reflection
 * Executes task and reflects on result
 * @param instruction - Task instruction
 */
export async function autonomousExecute(instruction) {
    log.info(`Autonomous execution: ${instruction}`);
    // Step 1 task
    const plan = await autonomousDecompose(instruction);
    // Step 2 orchestration
    const orch = createOrchestration({
        name: `Autonomous: ${instruction.substring(0, 50)}`,
        subtasks, : .subtasks,
        strategy, : .strategy,
    });
    // Step 3 with reflection
    let result;
    let retryCount = 0;
    const maxRetries = 3;
    while (retryCount < maxRetries) {
        result = await executeOrchestration(orch.id);
        // Step 4 on result
        const reflection = reflectOnResult(result, instruction);
        if (reflection.success) {
            log.info(`Task completed successfully`);
            break;
        }
        else {
            log.warn(`Task failed, reflection: ${reflection.reasoning}`);
            // Step 5 and retry if needed
            if (reflection.shouldRetry && retryCount < maxRetries - 1) {
                retryCount++;
                log.info(`Retrying (${retryCount}/${maxRetries})`);
                // Modify plan based on reflection
                adjustPlan(plan, reflection);
            }
            else {
                break;
            }
        }
    }
    // Record decision
    recordDecision({
        context: `Execute: ${instruction}`,
        decision, status
    } || "unknown", reasoning, `Completed after ${retryCount} retries`, action(), result, success?.status === "completed");
}
;
return result;
/**
 * Reflect on execution result
 * @param result - Execution result
 * @param originalInstruction - Original instruction
 */
function reflectOnResult(result, originalInstruction) {
    if (!result) {
        return {
            success,
            shouldRetry,
            reasoning: "No result received",
        };
    }
    if (result.status === "completed") {
        return {
            success,
            shouldRetry,
            reasoning: "Task completed successfully",
        };
    }
    if (result.status === "failed") {
        // Analyze failure
        const failedSubtasks = result.subtasks?.filter((s) => s.status === "failed") || [];
        if (failedSubtasks.length > 0) {
            const errors = failedSubtasks.map((s) => s.result?.error).filter(Boolean);
            // Check if errors are recoverable
            const recoverableErrors = errors.filter((e) => e.includes("timeout") ||
                e.includes("network") ||
                e.includes("temporarily"));
            if (recoverableErrors.length > 0) {
                return {
                    success,
                    shouldRetry,
                    reasoning: `Recoverable errors: ${recoverableErrors.join(", ")}`,
                    adjustments,
                };
            }
            return {
                success,
                shouldRetry,
                reasoning: `Non-recoverable errors: ${errors.join(", ")}`,
            };
        }
        return {
            success,
            shouldRetry,
            reasoning: "Unknown failure",
        };
    }
    return {
        success,
        shouldRetry,
        reasoning: `Unexpected status: ${result.status}`,
    };
}
/**
 * Adjust plan based on reflection
 * @param plan - Original plan
 * @param reflection - Reflection result
 */
function adjustPlan(plan, reflection) {
    if (reflection.adjustments?.increaseTimeout) {
        // Increase timeout for all subtasks
        for (const subtask of plan.subtasks) {
            subtask.timeoutMs = (subtask.timeoutMs || 30000) * 2;
        }
        log.info("Adjusted plan timeouts");
    }
}
/**
 * Record autonomous decision
 * @param decision - Decision to record
 */
function recordDecision(decision, , AutonomousDecision, , , ) { }
 > ;
{
    const fullDecision = {
        id() { },
        timestamp() { },
        ...decision,
    };
    decisionMemory.push(fullDecision);
    // Keep only last 100 decisions
    if (decisionMemory.length > 100) {
        decisionMemory.shift();
    }
    log.debug(`Recorded decision: ${fullDecision.id}`);
}
/**
 * Get decision history
 */
export function getDecisionHistory() {
    return [...decisionMemory];
}
/**
 * Learn from decisions
 * Analyzes decision history to improve future decisions
 */
export function learnFromDecisions() {
    if (decisionMemory.length === 0) {
        return {
            successRate,
            commonFailures: [],
            recommendations: [],
        };
    }
    const successCount = decisionMemory.filter(d => d.success).length;
    const successRate = successCount / decisionMemory.length;
    // Find common failure patterns
    const failures = decisionMemory
        .filter(d => !d.success)
        .map(d => d.reasoning);
    const failureCounts = {};
    for (const failure of failures) {
        failureCounts[failure] = (failureCounts[failure] || 0) + 1;
    }
    const commonFailures = Object.entries(failureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason]) => reason);
    // Generate recommendations
    const recommendations = [];
    if (successRate < 0.7) {
        recommendations.push("Consider adding more verification steps");
    }
    if (commonFailures.some(f => f.includes("timeout"))) {
        recommendations.push("Increase default timeout values");
    }
    if (commonFailures.some(f => f.includes("permission"))) {
        recommendations.push("Check permission requirements before execution");
    }
    return {
        successRate,
        commonFailures,
        recommendations,
    };
}
// Export all functions
export default {
    analyzeFunction,
    generateTestsForFunction,
    autonomousDecompose,
    autonomousExecute,
    getDecisionHistory,
    learnFromDecisions,
};
