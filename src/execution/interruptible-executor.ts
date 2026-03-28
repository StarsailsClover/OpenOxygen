/**
 * OpenOxygen Task Executor with Real-time Interrupt
 * 
 * Supports real-time interruption and dynamic adjustment
 */

import { createSubsystemLogger } from "../logging/index.js";
import { EventEmitter } from "events";

const log = createSubsystemLogger("execution/interruptible");

export interface Task {
    id: string;
    name: string;
    type: "native" | "llm" | "composite";
    action: () => Promise<any>;
    timeout?: number;
    retryCount?: number;
    onInterrupt?: () => Promise<void>;
}

export interface ExecutionContext {
    taskId: string;
    startTime: number;
    status: "pending" | "running" | "paused" | "interrupted" | "completed" | "failed";
    result?: any;
    error?: Error;
}

export interface ExecutorOptions {
    maxConcurrent?: number;
    defaultTimeout?: number;
    enableRetry?: boolean;
}

export class InterruptibleExecutor extends EventEmitter {
    private contexts: Map<string, ExecutionContext> = new Map();
    private shouldInterrupt = false;
    private options: ExecutorOptions;

    constructor(options: ExecutorOptions = {}) {
        super();
        this.options = {
            maxConcurrent: 5,
            defaultTimeout: 30000,
            enableRetry: true,
            ...options
        };
    }

    /**
     * Execute a single task
     */
    async execute(task: Task): Promise<any> {
        const context: ExecutionContext = {
            taskId: task.id,
            startTime: Date.now(),
            status: "running"
        };

        this.contexts.set(task.id, context);
        this.emit("taskStarted", task.id);

        try {
            const result = await this.runWithTimeout(task);
            context.status = "completed";
            context.result = result;
            this.emit("taskCompleted", task.id, result);
            return result;
        } catch (error) {
            context.status = "failed";
            context.error = error as Error;
            this.emit("taskFailed", task.id, error);
            throw error;
        } finally {
            this.contexts.delete(task.id);
        }
    }

    /**
     * Execute task with timeout
     */
    private async runWithTimeout(task: Task): Promise<any> {
        const timeout = task.timeout || this.options.defaultTimeout || 30000;
        
        return Promise.race([
            task.action(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Task ${task.id} timeout after ${timeout}ms`));
                }, timeout);
            })
        ]);
    }

    /**
     * Execute batch of tasks
     */
    async executeBatch(
        tasks: Task[],
        options: {
            stopOnError?: boolean;
            onTaskComplete?: (task: Task, index: number) => void;
        } = {}
    ): Promise<{ success: boolean; results: any[]; errors: Error[] }> {
        const results: any[] = [];
        const errors: Error[] = [];
        
        for (let i = 0; i < tasks.length; i++) {
            if (this.shouldInterrupt) {
                log.info("Batch execution interrupted");
                break;
            }
            
            const task = tasks[i];
            if (!task) {
                continue;
            }
            
            try {
                const result = await this.execute(task);
                results.push(result);
                
                if (options.onTaskComplete) {
                    options.onTaskComplete(task, i);
                }
            } catch (error) {
                errors.push(error as Error);
                
                if (options.stopOnError) {
                    break;
                }
            }
        }
        
        return {
            success: errors.length === 0,
            results,
            errors
        };
    }

    /**
     * Interrupt all running tasks
     */
    interrupt(): void {
        log.info("Interrupting all tasks");
        this.shouldInterrupt = true;
        
        for (const [taskId, context] of this.contexts) {
            if (context.status === "running") {
                context.status = "interrupted";
                this.emit("taskInterrupted", taskId);
            }
        }
    }

    /**
     * Reset interrupt flag
     */
    reset(): void {
        this.shouldInterrupt = false;
    }

    /**
     * Get running tasks count
     */
    getRunningCount(): number {
        return Array.from(this.contexts.values())
            .filter(c => c.status === "running")
            .length;
    }

    /**
     * Check if executor is busy
     */
    isBusy(): boolean {
        return this.getRunningCount() > 0;
    }
}

export default InterruptibleExecutor;
