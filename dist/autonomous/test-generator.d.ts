/**
 * OpenOxygen — Autonomous Test Generator (26w15aD Phase 3)
 *
 * 自主测试生成系统
 * 利用预置数据库和记忆教会任务分配和拆解层
 * LLM 自主决策并运行任务
 */
import type { TaskPlan } from "../agent/orchestrator/index.js";
interface FunctionInfo {
    name: string;
    params: {
        name: string;
        type: string;
        optional?: boolean;
    }[];
    returnType?: string;
    async: boolean;
    description?: string;
    examples?: string[];
}
interface GeneratedTest {
    name: string;
    description: string;
    code: string;
    expectedResult: any;
    testData?: any[];
}
interface AutonomousDecision {
    id: string;
    timestamp: number;
    context: string;
    decision: string;
    reasoning: string;
    action: () => Promise<any>;
    result?: any;
    success: boolean;
}
/**
 * Analyze function and extract information
 * @param fn - Function to analyze
 */
export declare function analyzeFunction(fn: Function): FunctionInfo;
/**
 * Generate tests for a function
 * @param fn - Function to test
 * @param options - Generation options
 */
export declare function generateTestsForFunction(fn: Function, options?: {
    count?: number;
    patterns?: string[];
}): GeneratedTest[];
/**
 * Autonomous task decomposition
 * Uses memory and patterns to decompose tasks without human intervention
 * @param instruction - User instruction
 */
export declare function autonomousDecompose(instruction: string): Promise<TaskPlan>;
/**
 * Autonomous task execution with reflection
 * Executes task and reflects on result
 * @param instruction - Task instruction
 */
export declare function autonomousExecute(instruction: string): Promise<any>;
/**
 * Get decision history
 */
export declare function getDecisionHistory(): AutonomousDecision[];
/**
 * Learn from decisions
 * Analyzes decision history to improve future decisions
 */
export declare function learnFromDecisions(): {
    successRate: number;
    commonFailures: string[];
    recommendations: string[];
};
declare const _default: {
    analyzeFunction: typeof analyzeFunction;
    generateTestsForFunction: typeof generateTestsForFunction;
    autonomousDecompose: typeof autonomousDecompose;
    autonomousExecute: typeof autonomousExecute;
    getDecisionHistory: typeof getDecisionHistory;
    learnFromDecisions: typeof learnFromDecisions;
};
export default _default;
//# sourceMappingURL=test-generator.d.ts.map