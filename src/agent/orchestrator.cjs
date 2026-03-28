/**
 * OpenOxygen Agent Orchestrator
 * 
 * 多 Agent 协调与通信机制
 */

const { EventEmitter } = require("events");
const WebSocket = require("ws");

const log = {
    info: (...args) => console.log("[AgentOrchestrator]", ...args),
    warn: (...args) => console.warn("[AgentOrchestrator]", ...args),
    error: (...args) => console.error("[AgentOrchestrator]", ...args)
};

/**
 * Agent 状态
 */
const AgentStatus = {
    IDLE: "idle",
    BUSY: "busy",
    OFFLINE: "offline",
    ERROR: "error"
};

/**
 * Agent 类
 */
class Agent {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.type = config.type || "general"; // general, browser, terminal, vision
        this.capabilities = config.capabilities || [];
        this.status = AgentStatus.IDLE;
        this.currentTask = null;
        this.stats = {
            tasksCompleted: 0,
            tasksFailed: 0,
            avgResponseTime: 0
        };
    }
    
    /**
     * 检查是否支持任务
     */
    canHandle(task) {
        return this.capabilities.some(cap => 
            task.requirements?.includes(cap)
        );
    }
    
    /**
     * 分配任务
     */
    async assignTask(task) {
        if (this.status !== AgentStatus.IDLE) {
            return false;
        }
        
        this.status = AgentStatus.BUSY;
        this.currentTask = task;
        
        log.info(`Agent ${this.name} assigned task: ${task.name}`);
        
        return true;
    }
    
    /**
     * 完成任务
     */
    completeTask(result) {
        this.status = AgentStatus.IDLE;
        this.currentTask = null;
        this.stats.tasksCompleted++;
        
        log.info(`Agent ${this.name} completed task`);
    }
    
    /**
     * 任务失败
     */
    failTask(error) {
        this.status = AgentStatus.IDLE;
        this.currentTask = null;
        this.stats.tasksFailed++;
        
        log.error(`Agent ${this.name} failed task:`, error);
    }
}

/**
 * Agent 协调器
 */
class AgentOrchestrator extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.agents = new Map();
        this.taskQueue = [];
        this.runningTasks = new Map();
        
        this.options = {
            maxConcurrentTasks: options.maxConcurrentTasks || 5,
            taskTimeout: options.taskTimeout || 30000,
            enableLoadBalancing: options.enableLoadBalancing !== false,
            enableFailover: options.enableFailover !== false
        };
        
        // 启动调度器
        this.startScheduler();
    }
    
    /**
     * 注册 Agent
     */
    registerAgent(agentConfig) {
        const agent = new Agent(agentConfig);
        this.agents.set(agent.id, agent);
        
        log.info(`Agent registered: ${agent.name} (${agent.id})`);
        
        this.emit("agentRegistered", agent);
        
        return agent;
    }
    
    /**
     * 注销 Agent
     */
    unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            this.agents.delete(agentId);
            log.info(`Agent unregistered: ${agent.name}`);
            this.emit("agentUnregistered", agent);
        }
    }
    
    /**
     * 提交任务
     */
    async submitTask(task) {
        log.info(`Task submitted: ${task.name}`);
        
        // 为任务分配 ID
        task.id = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        task.status = "pending";
        task.createdAt = Date.now();
        
        // 添加到队列
        this.taskQueue.push(task);
        
        this.emit("taskSubmitted", task);
        
        // 触发调度
        this.scheduleTasks();
        
        return task.id;
    }
    
    /**
     * 调度任务
     */
    scheduleTasks() {
        // 检查并发限制
        const runningCount = this.runningTasks.size;
        if (runningCount >= this.options.maxConcurrentTasks) {
            return;
        }
        
        // 获取可用的 Agent
        const availableAgents = Array.from(this.agents.values())
            .filter(agent => agent.status === AgentStatus.IDLE);
        
        if (availableAgents.length === 0) {
            return;
        }
        
        // 分配任务
        while (this.taskQueue.length > 0 && availableAgents.length > 0) {
            const task = this.taskQueue.shift();
            
            // 选择合适的 Agent
            const agent = this.selectAgent(task, availableAgents);
            
            if (agent) {
                this.executeTask(task, agent);
                
                // 从可用列表中移除
                const index = availableAgents.indexOf(agent);
                if (index > -1) {
                    availableAgents.splice(index, 1);
                }
            } else {
                // 没有合适的 Agent，放回队列
                this.taskQueue.unshift(task);
                break;
            }
        }
    }
    
    /**
     * 选择 Agent
     */
    selectAgent(task, availableAgents) {
        if (!this.options.enableLoadBalancing) {
            // 简单轮询
            return availableAgents.find(agent => agent.canHandle(task));
        }
        
        // 负载均衡：选择能力匹配且负载最低的 Agent
        const candidates = availableAgents.filter(agent => agent.canHandle(task));
        
        if (candidates.length === 0) {
            // 如果没有匹配的，选择第一个可用的
            return availableAgents[0];
        }
        
        // 按任务完成数排序（选择负载低的）
        candidates.sort((a, b) => a.stats.tasksCompleted - b.stats.tasksCompleted);
        
        return candidates[0];
    }
    
    /**
     * 执行任务
     */
    async executeTask(task, agent) {
        log.info(`Executing task ${task.name} on agent ${agent.name}`);
        
        task.status = "running";
        task.assignedAgent = agent.id;
        task.startedAt = Date.now();
        
        this.runningTasks.set(task.id, task);
        
        this.emit("taskStarted", task, agent);
        
        try {
            // 设置超时
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Task timeout after ${this.options.taskTimeout}ms`));
                }, this.options.taskTimeout);
            });
            
            // 执行任务
            const result = await Promise.race([
                task.action(),
                timeoutPromise
            ]);
            
            // 任务完成
            task.status = "completed";
            task.result = result;
            task.completedAt = Date.now();
            task.duration = task.completedAt - task.startedAt;
            
            agent.completeTask(result);
            
            this.emit("taskCompleted", task, result);
            
        } catch (error) {
            // 任务失败
            task.status = "failed";
            task.error = error.message;
            task.failedAt = Date.now();
            
            agent.failTask(error);
            
            this.emit("taskFailed", task, error);
            
            // 故障转移
            if (this.options.enableFailover) {
                this.handleFailover(task);
            }
        } finally {
            this.runningTasks.delete(task.id);
            
            // 继续调度
            this.scheduleTasks();
        }
    }
    
    /**
     * 故障转移
     */
    handleFailover(task) {
        log.info(`Handling failover for task: ${task.name}`);
        
        task.retryCount = (task.retryCount || 0) + 1;
        
        if (task.retryCount < 3) {
            log.info(`Retrying task (attempt ${task.retryCount})`);
            task.status = "pending";
            this.taskQueue.unshift(task);
            this.scheduleTasks();
        } else {
            log.error(`Task failed after ${task.retryCount} retries`);
            this.emit("taskFailedPermanently", task);
        }
    }
    
    /**
     * 启动调度器
     */
    startScheduler() {
        // 定期检查队列
        setInterval(() => {
            this.scheduleTasks();
        }, 1000);
    }
    
    /**
     * 获取状态
     */
    getStatus() {
        return {
            agents: {
                total: this.agents.size,
                idle: Array.from(this.agents.values()).filter(a => a.status === AgentStatus.IDLE).length,
                busy: Array.from(this.agents.values()).filter(a => a.status === AgentStatus.BUSY).length
            },
            tasks: {
                queued: this.taskQueue.length,
                running: this.runningTasks.size,
                completed: Array.from(this.agents.values()).reduce((sum, a) => sum + a.stats.tasksCompleted, 0),
                failed: Array.from(this.agents.values()).reduce((sum, a) => sum + a.stats.tasksFailed, 0)
            }
        };
    }
    
    /**
     * 广播消息
     */
    broadcast(message) {
        this.agents.forEach(agent => {
            // TODO: 实现 WebSocket 广播
            log.info(`Broadcast to ${agent.name}: ${message}`);
        });
    }
}

module.exports = { AgentOrchestrator, Agent, AgentStatus };
