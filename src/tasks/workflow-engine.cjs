/**
 * OpenOxygen Workflow Engine
 * 
 * 增强版工作流引擎
 * 支持 DAG、条件分支、错误处理
 */

const { EventEmitter } = require("events");

const log = {
    info: (...args) => console.log("[Workflow]", ...args),
    warn: (...args) => console.warn("[Workflow]", ...args),
    error: (...args) => console.error("[Workflow]", ...args)
};

/**
 * 工作流步骤
 */
class WorkflowStep {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.type = config.type || "task"; // task, condition, loop, parallel
        this.action = config.action;
        this.condition = config.condition;
        this.retryCount = config.retryCount || 0;
        this.maxRetries = config.maxRetries || 3;
        this.timeout = config.timeout || 30000;
        this.dependsOn = config.dependsOn || [];
        this.nextSteps = config.nextSteps || [];
        this.onError = config.onError;
        this.output = null;
        this.status = "pending";
        this.startTime = null;
        this.endTime = null;
        this.error = null;
    }
}

/**
 * 工作流引擎
 */
class WorkflowEngine extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            maxConcurrent: config.maxConcurrent || 5,
            defaultTimeout: config.defaultTimeout || 30000,
            enableRetry: config.enableRetry !== false,
            enableCache: config.enableCache !== false,
            ...config
        };
        
        this.steps = new Map();
        this.cache = new Map();
        this.isRunning = false;
    }
    
    /**
     * 注册步骤
     */
    registerStep(stepConfig) {
        const step = new WorkflowStep(stepConfig);
        this.steps.set(step.id, step);
        log.info(`Registered step: ${step.name} (${step.id})`);
        return step;
    }
    
    /**
     * 执行工作流
     */
    async execute(workflowId, context = {}) {
        log.info(`Starting workflow: ${workflowId}`);
        
        this.isRunning = true;
        this.emit("workflowStart", workflowId);
        
        try {
            // 构建 DAG
            const dag = this.buildDAG();
            
            // 执行 DAG
            const result = await this.executeDAG(dag, context);
            
            this.emit("workflowComplete", workflowId, result);
            return result;
            
        } catch (error) {
            log.error("Workflow failed:", error);
            this.emit("workflowError", workflowId, error);
            throw error;
            
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * 构建 DAG
     */
    buildDAG() {
        const dag = new Map();
        
        // 初始化节点
        for (const [id, step] of this.steps) {
            dag.set(id, {
                step,
                dependencies: new Set(step.dependsOn),
                dependents: new Set()
            });
        }
        
        // 构建依赖关系
        for (const [id, node] of dag) {
            for (const depId of node.dependencies) {
                const depNode = dag.get(depId);
                if (depNode) {
                    depNode.dependents.add(id);
                }
            }
        }
        
        return dag;
    }
    
    /**
     * 执行 DAG
     */
    async executeDAG(dag, context) {
        const completed = new Set();
        const results = new Map();
        
        while (completed.size < dag.size) {
            // 找到可以执行的步骤
            const ready = this.findReadySteps(dag, completed);
            
            if (ready.length === 0) {
                throw new Error("Deadlock detected in workflow");
            }
            
            // 并行执行就绪步骤
            const batch = ready.slice(0, this.config.maxConcurrent);
            
            await Promise.all(
                batch.map(stepId => 
                    this.executeStep(dag.get(stepId).step, context, results)
                        .then(result => {
                            completed.add(stepId);
                            results.set(stepId, result);
                        })
                )
            );
        }
        
        return results;
    }
    
    /**
     * 找到就绪步骤
     */
    findReadySteps(dag, completed) {
        const ready = [];
        
        for (const [id, node] of dag) {
            if (completed.has(id)) continue;
            
            // 检查所有依赖是否完成
            const depsCompleted = Array.from(node.dependencies)
                .every(depId => completed.has(depId));
            
            if (depsCompleted) {
                ready.push(id);
            }
        }
        
        return ready;
    }
    
    /**
     * 执行单个步骤
     */
    async executeStep(step, context, results) {
        log.info(`Executing step: ${step.name}`);
        
        step.status = "running";
        step.startTime = Date.now();
        
        this.emit("stepStart", step);
        
        try {
            // 检查缓存
            const cacheKey = this.getCacheKey(step, context);
            if (this.config.enableCache && this.cache.has(cacheKey)) {
                log.info(`Cache hit for step: ${step.name}`);
                step.output = this.cache.get(cacheKey);
                step.status = "completed";
                step.endTime = Date.now();
                return step.output;
            }
            
            // 准备输入
            const input = this.prepareInput(step, context, results);
            
            // 执行动作
            let result;
            if (step.type === "condition") {
                result = await this.executeCondition(step, input);
            } else if (step.type === "loop") {
                result = await this.executeLoop(step, input);
            } else if (step.type === "parallel") {
                result = await this.executeParallel(step, input);
            } else {
                result = await this.executeTask(step, input);
            }
            
            // 缓存结果
            if (this.config.enableCache) {
                this.cache.set(cacheKey, result);
            }
            
            step.output = result;
            step.status = "completed";
            step.endTime = Date.now();
            
            this.emit("stepComplete", step, result);
            
            return result;
            
        } catch (error) {
            step.error = error;
            step.status = "failed";
            step.endTime = Date.now();
            
            this.emit("stepError", step, error);
            
            // 重试逻辑
            if (step.retryCount < step.maxRetries && this.config.enableRetry) {
                step.retryCount++;
                log.warn(`Retrying step ${step.name} (attempt ${step.retryCount})`);
                return this.executeStep(step, context, results);
            }
            
            // 错误处理
            if (step.onError) {
                return step.onError(error, context);
            }
            
            throw error;
        }
    }
    
    /**
     * 执行任务
     */
    async executeTask(step, input) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Step timeout: ${step.name}`));
            }, step.timeout);
            
            Promise.resolve(step.action(input))
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }
    
    /**
     * 执行条件
     */
    async executeCondition(step, input) {
        const condition = step.condition(input);
        
        if (condition) {
            return { result: true, branch: "true" };
        } else {
            return { result: false, branch: "false" };
        }
    }
    
    /**
     * 执行循环
     */
    async executeLoop(step, input) {
        const results = [];
        
        for (const item of input.items) {
            const result = await step.action(item);
            results.push(result);
        }
        
        return results;
    }
    
    /**
     * 执行并行
     */
    async executeParallel(step, input) {
        const promises = input.items.map(item => step.action(item));
        return Promise.all(promises);
    }
    
    /**
     * 准备输入
     */
    prepareInput(step, context, results) {
        const input = { ...context };
        
        // 添加上游步骤的输出
        for (const depId of step.dependsOn) {
            if (results.has(depId)) {
                input[depId] = results.get(depId);
            }
        }
        
        return input;
    }
    
    /**
     * 获取缓存键
     */
    getCacheKey(step, context) {
        return `${step.id}:${JSON.stringify(context)}`;
    }
    
    /**
     * 获取工作流状态
     */
    getStatus() {
        const steps = Array.from(this.steps.values()).map(step => ({
            id: step.id,
            name: step.name,
            status: step.status,
            duration: step.endTime ? step.endTime - step.startTime : null
        }));
        
        return {
            isRunning: this.isRunning,
            totalSteps: this.steps.size,
            completedSteps: steps.filter(s => s.status === "completed").length,
            failedSteps: steps.filter(s => s.status === "failed").length,
            steps
        };
    }
}

module.exports = { WorkflowEngine, WorkflowStep };
