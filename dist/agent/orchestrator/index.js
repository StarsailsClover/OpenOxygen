/**
 * OpenOxygen — Task Orchestrator (26w15a Phase 3)
 *
 * 任务编排器：复杂任务自动分解、并行执行、结果聚合
 *
 * 功能：
 *   - 任务分解（"部署项目" → [构建, 测试, 部署]）
 *   - 并行执行（子任务同时运行）
 *   - 结果聚合（合并子任务结果）
 *   - 失败重试（单个子任务失败可重试）
 *   - 依赖管理（任务 A 依赖任务 B）
 *   - 执行计划可视化
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import { executeWithStrategy, } from "../../execution/unified/index.js";
const log = createSubsystemLogger("agent/orchestrator");
// ─── Task Decomposition ─────────────────────────────────────────────────────
/**
 * 基于 LLM 的任务分解（简化版：使用关键词匹配）
 */
export function decomposeTask(instruction) {
    const lower = instruction.toLowerCase();
    // 部署项目模式
    if (lower.includes("部署") ||
        lower.includes("deploy") ||
        lower.includes("发布")) {
        return {
            name: "部署项目",
            description: `部署: ${instruction}`,
            strategy: "sequential",
            subtasks: [
                {
                    name: "构建",
                    instruction: "npm run build",
                    mode: "terminal",
                    maxRetries: 1,
                },
                {
                    name: "测试",
                    instruction: "npm test",
                    mode: "terminal",
                    dependsOn: ["构建"],
                    maxRetries: 2,
                },
                {
                    name: "部署",
                    instruction: "npm run deploy",
                    mode: "terminal",
                    dependsOn: ["测试"],
                    maxRetries: 1,
                },
            ],
        };
    }
    // 代码审查模式
    if (lower.includes("审查") ||
        lower.includes("review") ||
        lower.includes("code review")) {
        return {
            name: "代码审查",
            description: `审查: ${instruction}`,
            strategy: "parallel",
            subtasks: [
                { name: "语法检查", instruction: "npm run lint", mode: "terminal" },
                { name: "类型检查", instruction: "npx tsc --noEmit", mode: "terminal" },
                {
                    name: "单元测试",
                    instruction: "npm run test:unit",
                    mode: "terminal",
                },
            ],
        };
    }
    // 数据收集模式
    if (lower.includes("收集") ||
        lower.includes("收集数据") ||
        lower.includes("gather")) {
        return {
            name: "数据收集",
            description: `收集: ${instruction}`,
            strategy: "parallel",
            subtasks: [
                {
                    name: "打开网站A",
                    instruction: "打开 https://site-a.com 收集数据",
                    mode: "browser",
                },
                {
                    name: "打开网站B",
                    instruction: "打开 https://site-b.com 收集数据",
                    mode: "browser",
                },
                {
                    name: "整理数据",
                    instruction: "整理收集到的数据",
                    mode: "terminal",
                    dependsOn: ["打开网站A", "打开网站B"],
                },
            ],
        };
    }
    // 默认：简单顺序执行
    return {
        name: "执行任务",
        description: instruction,
        strategy: "sequential",
        subtasks: [{ name: "执行", instruction, mode: undefined }],
    };
}
// ─── Orchestrator ───────────────────────────────────────────────────────────
const orchestrations = new Map();
export function createOrchestration(instruction, plan) {
    const taskPlan = plan || decomposeTask(instruction);
    const subtasks = taskPlan.subtasks.map((st, index) => ({
        id: generateId("subtask"),
        name: st.name || `步骤 ${index + 1}`,
        instruction: st.instruction,
        mode: st.mode,
        dependsOn: st.dependsOn,
        retryCount: 0,
        maxRetries: st.maxRetries ?? 1,
        timeoutMs: st.timeoutMs ?? 60000,
        status: "pending",
    }));
    const orchestration = {
        id: generateId("orch"),
        name: taskPlan.name,
        instruction,
        subtasks,
        strategy: taskPlan.strategy,
        status: "pending",
        createdAt: nowMs(),
        results: { success: 0, failed: 0, skipped: 0, total: subtasks.length },
    };
    orchestrations.set(orchestration.id, orchestration);
    log.info(`Orchestration created: ${orchestration.id} (${taskPlan.name}, ${subtasks.length} subtasks, ${taskPlan.strategy})`);
    return orchestration;
}
export function getOrchestration(id) {
    return orchestrations.get(id) || null;
}
// ─── Execution Engine ───────────────────────────────────────────────────────
export async function executeOrchestration(orchestrationId, options) {
    const orch = orchestrations.get(orchestrationId);
    if (!orch) {
        throw new Error(`Orchestration ${orchestrationId} not found`);
    }
    orch.status = "running";
    orch.startedAt = nowMs();
    log.info(`Starting orchestration: ${orchestrationId} (${orch.strategy} strategy)`);
    try {
        switch (orch.strategy) {
            case "sequential":
                await executeSequential(orch, options);
                break;
            case "parallel":
                await executeParallel(orch, options);
                break;
            case "dag":
                await executeDAG(orch, options);
                break;
        }
    }
    catch (e) {
        log.error(`Orchestration failed: ${e.message}`);
        orch.status = "failed";
    }
    orch.completedAt = nowMs();
    orch.results = calculateResults(orch);
    orch.status = determineFinalStatus(orch);
    log.info(`Orchestration completed: ${orchestrationId} (${orch.status}, ${orch.results.success}/${orch.results.total} success)`);
    options?.onComplete?.(orch);
    return orch;
}
// ─── Sequential Execution ───────────────────────────────────────────────────
async function executeSequential(orch, options) {
    for (const subtask of orch.subtasks) {
        await executeSubtask(orch, subtask, options);
        // Stop if critical subtask fails
        if (subtask.status === "failed" &&
            subtask.retryCount >= subtask.maxRetries) {
            // Mark remaining as skipped
            for (const remaining of orch.subtasks) {
                if (remaining.status === "pending") {
                    remaining.status = "skipped";
                }
            }
            break;
        }
    }
}
// ─── Parallel Execution ─────────────────────────────────────────────────────
async function executeParallel(orch, options) {
    const promises = orch.subtasks.map((st) => executeSubtask(orch, st, options));
    await Promise.all(promises);
}
// ─── DAG Execution ──────────────────────────────────────────────────────────
async function executeDAG(orch, options) {
    const completed = new Set();
    const failed = new Set();
    async function canExecute(subtask) {
        if (!subtask.dependsOn || subtask.dependsOn.length === 0)
            return true;
        // Check if all dependencies are completed
        for (const depName of subtask.dependsOn) {
            const dep = orch.subtasks.find((st) => st.name === depName);
            if (!dep)
                return false;
            if (dep.status !== "completed")
                return false;
        }
        return true;
    }
    async function executeReady() {
        const ready = orch.subtasks.filter((st) => st.status === "pending" && !completed.has(st.id) && !failed.has(st.id));
        for (const subtask of ready) {
            if (await canExecute(subtask)) {
                // Execute immediately (could be parallelized)
                await executeSubtask(orch, subtask, options);
                if (subtask.status === "completed") {
                    completed.add(subtask.id);
                }
                else if (subtask.status === "failed") {
                    failed.add(subtask.id);
                    // Mark dependents as skipped
                    markDependentsSkipped(orch, subtask.name);
                }
            }
        }
        // Continue if there are still pending tasks
        const stillPending = orch.subtasks.some((st) => st.status === "pending");
        if (stillPending) {
            await new Promise((r) => setTimeout(r, 100)); // Small delay to prevent busy loop
            await executeReady();
        }
    }
    await executeReady();
}
function markDependentsSkipped(orch, failedTaskName) {
    for (const st of orch.subtasks) {
        if (st.dependsOn?.includes(failedTaskName) && st.status === "pending") {
            st.status = "skipped";
            markDependentsSkipped(orch, st.name);
        }
    }
}
// ─── Subtask Execution ──────────────────────────────────────────────────────
async function executeSubtask(orch, subtask, options) {
    if (subtask.status !== "pending")
        return;
    subtask.status = "running";
    subtask.startedAt = nowMs();
    options?.onProgress?.(orch, subtask);
    log.info(`Executing subtask: ${subtask.name} (${subtask.instruction.substring(0, 50)}...)`);
    try {
        // Use unified executor
        const result = await executeWithStrategy(subtask.instruction, subtask.mode
            ? { mode: subtask.mode, confidence: 1, reason: "Orchestrated subtask" }
            : undefined);
        subtask.result = result;
        subtask.completedAt = nowMs();
        if (result.success) {
            subtask.status = "completed";
            log.info(`Subtask completed: ${subtask.name}`);
        }
        else {
            // Retry logic
            if (subtask.retryCount < subtask.maxRetries) {
                subtask.retryCount++;
                log.warn(`Subtask failed, retrying (${subtask.retryCount}/${subtask.maxRetries}): ${subtask.name}`);
                subtask.status = "pending";
                await executeSubtask(orch, subtask, options);
            }
            else {
                subtask.status = "failed";
                log.error(`Subtask failed after ${subtask.maxRetries} retries: ${subtask.name}`);
            }
        }
    }
    catch (e) {
        subtask.status = "failed";
        subtask.completedAt = nowMs();
        subtask.result = {
            success: false,
            error: e.message,
            durationMs: 0,
            mode: subtask.mode || "hybrid",
            strategy: {
                mode: subtask.mode || "hybrid",
                confidence: 0,
                reason: "Exception",
            },
            logs: [],
        };
        log.error(`Subtask exception: ${subtask.name} - ${e.message}`);
    }
    options?.onProgress?.(orch, subtask);
}
// ─── Result Calculation ─────────────────────────────────────────────────────
function calculateResults(orch) {
    let success = 0, failed = 0, skipped = 0;
    for (const st of orch.subtasks) {
        switch (st.status) {
            case "completed":
                success++;
                break;
            case "failed":
                failed++;
                break;
            case "skipped":
                skipped++;
                break;
        }
    }
    return { success, failed, skipped, total: orch.subtasks.length };
}
function determineFinalStatus(orch) {
    if (orch.results.failed === 0 && orch.results.skipped === 0) {
        return "completed";
    }
    if (orch.results.success === 0) {
        return "failed";
    }
    return "partial";
}
// ─── Visualization ──────────────────────────────────────────────────────────
export function generateExecutionReport(orch) {
    const lines = [];
    lines.push(`╔═══════════════════════════════════════════════════════════════╗`);
    lines.push(`║  任务执行报告: ${orch.name.padEnd(40)}║`);
    lines.push(`╚═══════════════════════════════════════════════════════════════╝`);
    lines.push("");
    lines.push(`策略: ${orch.strategy}`);
    lines.push(`状态: ${orch.status}`);
    lines.push(`耗时: ${((orch.completedAt || nowMs()) - (orch.startedAt || orch.createdAt)) / 1000}s`);
    lines.push("");
    lines.push("子任务:");
    for (const st of orch.subtasks) {
        const icon = st.status === "completed"
            ? "✅"
            : st.status === "failed"
                ? "❌"
                : st.status === "skipped"
                    ? "⏭️"
                    : "⏳";
        const duration = st.completedAt && st.startedAt
            ? `(${((st.completedAt - st.startedAt) / 1000).toFixed(1)}s)`
            : "";
        lines.push(`  ${icon} ${st.name.padEnd(20)} ${st.status.padEnd(10)} ${duration}`);
        if (st.result?.error) {
            lines.push(`      错误: ${st.result.error.substring(0, 50)}`);
        }
    }
    lines.push("");
    lines.push(`结果: ${orch.results.success} 成功, ${orch.results.failed} 失败, ${orch.results.skipped} 跳过 / ${orch.results.total} 总计`);
    return lines.join("\n");
}
// ─── Cleanup ────────────────────────────────────────────────────────────────
export function cleanupOrchestration(id) {
    orchestrations.delete(id);
}
export function listOrchestrations() {
    return Array.from(orchestrations.values());
}
// Export for debugging
export { orchestrations };
