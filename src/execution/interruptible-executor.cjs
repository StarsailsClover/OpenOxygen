const { EventEmitter } = require("events");

const log = {
    info: (...args) => console.log("[EXEC]", ...args),
    warn: (...args) => console.warn("[EXEC]", ...args),
    error: (...args) => console.error("[EXEC]", ...args)
};

class InterruptibleTaskExecutor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            enableInterrupt: true,
            enablePause: true,
            defaultTimeout: 30000,
            ...options
        };
        this.isRunning = false;
        this.shouldInterrupt = false;
        this.currentTask = null;
    }
    
    async execute(task) {
        if (this.isRunning) {
            throw new Error("Another task is already running");
        }
        
        this.isRunning = true;
        this.currentTask = task;
        this.shouldInterrupt = false;
        
        log.info(`Starting task: ${task.name}`);
        this.emit("taskStart", task);
        
        try {
            const result = await task.action();
            
            if (this.shouldInterrupt) {
                this.emit("taskInterrupted", task);
                throw new Error("Task was interrupted");
            }
            
            log.info(`Task completed: ${task.name}`);
            this.emit("taskComplete", task, result);
            return result;
            
        } catch (error) {
            log.error(`Task failed: ${task.name}`, error);
            this.emit("taskError", task, error);
            throw error;
        } finally {
            this.isRunning = false;
            this.currentTask = null;
        }
    }
    
    async interrupt() {
        if (!this.isRunning) {
            log.warn("No task is running");
            return false;
        }
        
        log.info(`Interrupting task: ${this.currentTask.name}`);
        this.shouldInterrupt = true;
        this.emit("interrupt", this.currentTask);
        return true;
    }
    
    getStatus() {
        return {
            isRunning: this.isRunning,
            currentTask: this.currentTask
        };
    }
}

module.exports = { InterruptibleTaskExecutor };
