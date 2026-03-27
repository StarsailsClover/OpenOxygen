/**
 * OpenOxygen — Workflow Engine (P2 Implementation)
 *
 * 复杂任务编排引擎：
 *   - 多步骤任务链自动执行
 *   - 状态传递机制
 *   - 条件分支支持
 *   - 错误处理与重试
 *   - 与 Edge/QQ 自动化集成
 */
import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
import { GmailAutomation, BilibiliAutomation, GitHubAutomation } from "../execution/edge-automation/index.js";
import { QQWindowController } from "../execution/qq-automation/index.js";
const log = createSubsystemLogger("tasks/workflow");

// ─── Workflow Definition ────────────────────────────────────────────────────
export class WorkflowEngine {
    workflows = new Map();
    running = new Map();
    
    /**
     * 注册工作流
     * @param {string} name - 工作流名称
     * @param {Object} definition - 工作流定义
     */
    register(name, definition) {
        this.workflows.set(name, {
            id: generateId("workflow"),
            name,
            steps: definition.steps || [],
            onError: definition.onError || "abort",
            createdAt: nowMs(),
        });
        log.info(`Workflow registered: ${name}`);
    }
    
    /**
     * 执行工作流
     * @param {string} name - 工作流名称
     * @param {Object} context - 初始上下文
     */
    async execute(name, context = {}) {
        const workflow = this.workflows.get(name);
        if (!workflow) {
            throw new Error(`Workflow not found: ${name}`);
        }
        
        const executionId = generateId("exec");
        const execution = {
            id: executionId,
            workflowName: name,
            status: "running",
            context: { ...context },
            results: [],
            startTime: nowMs(),
        };
        
        this.running.set(executionId, execution);
        log.info(`Starting workflow execution: ${executionId} (${name})`);
        
        try {
            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];
                log.info(`Executing step ${i + 1}/${workflow.steps.length}: ${step.name}`);
                
                const result = await this.executeStep(step, execution.context);
                execution.results.push({
                    step: step.name,
                    result,
                    timestamp: nowMs(),
                });
                
                // Update context with step output
                if (result.output && step.outputKey) {
                    execution.context[step.outputKey] = result.output;
                }
                
                // Check for errors
                if (!result.success && step.onError !== "continue") {
                    if (workflow.onError === "abort") {
                        throw new Error(`Step failed: ${step.name} - ${result.error}`);
                    }
                }
                
                // Conditional branching
                if (step.condition) {
                    const conditionMet = await this.evaluateCondition(step.condition, execution.context);
                    if (!conditionMet) {
                        log.info(`Condition not met for step: ${step.name}, skipping`);
                        continue;
                    }
                }
            }
            
            execution.status = "completed";
            execution.endTime = nowMs();
            execution.duration = execution.endTime - execution.startTime;
            
            log.info(`Workflow completed: ${executionId} (${execution.duration}ms)`);
            return execution;
            
        } catch (error) {
            execution.status = "failed";
            execution.error = error.message;
            execution.endTime = nowMs();
            
            log.error(`Workflow failed: ${executionId} - ${error.message}`);
            throw error;
        } finally {
            this.running.delete(executionId);
        }
    }
    
    /**
     * 执行单个步骤
     */
    async executeStep(step, context) {
        const { type, action, params } = step;
        
        switch (type) {
            case "edge":
                return this.executeEdgeAction(action, params, context);
            case "qq":
                return this.executeQQAction(action, params, context);
            case "terminal":
                return this.executeTerminalAction(action, params, context);
            case "condition":
                return this.evaluateCondition(action, context);
            case "delay":
                await sleep(params.duration || 1000);
                return { success: true };
            default:
                return { success: false, error: `Unknown step type: ${type}` };
        }
    }
    
    /**
     * 执行 Edge 浏览器操作
     */
    async executeEdgeAction(action, params, context) {
        const gmail = new GmailAutomation();
        const bilibili = new BilibiliAutomation();
        const github = new GitHubAutomation();
        
        switch (action) {
            case "gmail.check":
                return gmail.checkUnread(params.email || context.email);
            case "gmail.send":
                return gmail.sendEmail({
                    to: params.to || context.to,
                    subject: params.subject || context.subject,
                    body: params.body || context.body,
                });
            case "bilibili.search":
                return bilibili.searchVideo(params.keyword || context.keyword);
            case "bilibili.open":
                return bilibili.openVideo(params.bvid || context.bvid);
            case "github.checkNotifications":
                return github.checkNotifications(params.username || context.username);
            case "github.viewRepo":
                return github.viewRepository(
                    params.owner || context.owner,
                    params.repo || context.repo
                );
            default:
                return { success: false, error: `Unknown Edge action: ${action}` };
        }
    }
    
    /**
     * 执行 QQ 操作
     */
    async executeQQAction(action, params, context) {
        const qq = new QQWindowController();
        
        switch (action) {
            case "sendMessage":
                return qq.sendMessage(
                    params.contact || context.contact,
                    params.message || context.message
                );
            case "checkUnread":
                return qq.checkUnread();
            default:
                return { success: false, error: `Unknown QQ action: ${action}` };
        }
    }
    
    /**
     * 执行终端操作
     */
    async executeTerminalAction(action, params, context) {
        const { quickExec } = require("../execution/terminal/index.js");
        
        if (action === "exec") {
            return quickExec(
                params.command || context.command,
                params.shell || "powershell"
            );
        }
        
        return { success: false, error: `Unknown terminal action: ${action}` };
    }
    
    /**
     * 评估条件
     */
    async evaluateCondition(condition, context) {
        // Simple condition evaluation
        // e.g., "context.unreadCount > 0"
        try {
            const fn = new Function("context", `return ${condition}`);
            return fn(context);
        } catch (error) {
            log.error(`Condition evaluation failed: ${error.message}`);
            return false;
        }
    }
}

// ─── Predefined Workflows ───────────────────────────────────────────────────
export const predefinedWorkflows = {
    /**
     * 每日信息检查工作流
     * 检查 Gmail → GitHub → 哔哩哔哩 → QQ 提醒
     */
    dailyCheck: {
        steps: [
            {
                name: "checkGmail",
                type: "edge",
                action: "gmail.check",
                params: { email: "user@gmail.com" },
                outputKey: "gmailResult",
            },
            {
                name: "checkGitHub",
                type: "edge",
                action: "github.checkNotifications",
                params: { username: "user" },
                outputKey: "githubResult",
            },
            {
                name: "searchBilibili",
                type: "edge",
                action: "bilibili.search",
                params: { keyword: "OpenOxygen" },
                outputKey: "bilibiliResult",
            },
            {
                name: "notifyQQ",
                type: "qq",
                action: "sendMessage",
                params: {
                    contact: "Myself",
                    message: "每日检查完成！",
                },
                condition: "context.gmailResult.success || context.githubResult.success",
            },
        ],
        onError: "continue",
    },
    
    /**
     * 项目监控工作流
     * 检查 GitHub 仓库 → 发送邮件报告
     */
    projectMonitor: {
        steps: [
            {
                name: "checkRepo",
                type: "edge",
                action: "github.viewRepo",
                params: { owner: "openoxygen", repo: "core" },
                outputKey: "repoInfo",
            },
            {
                name: "sendReport",
                type: "edge",
                action: "gmail.send",
                params: {
                    to: "admin@example.com",
                    subject: "项目状态报告",
                    body: "请查看附件中的项目状态",
                },
            },
        ],
        onError: "abort",
    },
};

// ─── Export ─────────────────────────────────────────────────────────────────
export { WorkflowEngine, predefinedWorkflows };
