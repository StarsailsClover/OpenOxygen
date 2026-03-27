/**
 * OpenOxygen — Async Compute Stack (26w11aE)
 *
 * 异步多线程算力栈：核心性能基础设施
 *
 * 设计目标：
 * 1. 最大化 CPU/GPU 利用率
 * 2. 最小化任务切换开销
 * 3. 可预测的性能特征
 * 4. 资源隔离与公平调度
 */
export type TaskType = "inference" | "vision" | "io" | "compute" | "background";
export type TaskPriority = "critical" | "high" | "normal" | "low" | "background";
export interface ComputeTask<T = unknown> {
    id: string;
    type: TaskType;
    priority: TaskPriority;
    fn: () => Promise<T>;
    createdAt: number;
    deadline?: number;
    estimatedDuration?: number;
    resourceHints?: ResourceHints;
}
export interface ResourceHints {
    cpuCores?: number;
    gpuMemoryMB?: number;
    ramMB?: number;
    preferGPU?: boolean;
}
export declare class ThreadPool {
    private workers;
    private taskQueue;
    private runningTasks;
    private maxConcurrency;
    private currentConcurrency;
    constructor(maxConcurrency?: number);
    /**
     * 提交任务到线程池
     */
    submit<T>(task: Omit<ComputeTask<T>, "id" | "createdAt">): Promise<T>;
    /**
     * 优先级调度
     */
    private schedule;
    private execute;
    /**
     * 取消指定任务
     */
    cancel(taskId: string): boolean;
    /**
     * 获取当前状态
     */
    getStatus(): {
        queued: number;
        running: number;
        maxConcurrency: number;
    };
}
export interface GPUDevice {
    id: number;
    name: string;
    memoryMB: number;
    computeCapability: number;
    isAvailable: boolean;
}
export declare class GPUDispatcher {
    private devices;
    private deviceQueues;
    constructor();
    private detectDevices;
    /**
     * 选择最优 GPU 设备
     */
    selectDevice(hints: ResourceHints): GPUDevice | null;
    /**
     * 提交 GPU 任务
     */
    submitToGPU<T>(task: ComputeTask<T>): Promise<T>;
}
export declare class AsyncComputeStack {
    private threadPool;
    private gpuDispatcher;
    private metrics;
    constructor(options?: {
        maxThreads?: number;
    });
    /**
     * 提交计算任务（自动选择 CPU/GPU）
     */
    submit<T>(fn: () => Promise<T>, options?: {
        type?: TaskType;
        priority?: TaskPriority;
        useGPU?: boolean;
        resourceHints?: ResourceHints;
    }): Promise<T>;
    /**
     * 批量提交任务（并行执行）
     */
    batch<T>(tasks: Array<() => Promise<T>>, options?: {
        type?: TaskType;
        priority?: TaskPriority;
        concurrency?: number;
    }): Promise<T[]>;
    /**
     * 获取性能指标
     */
    getMetrics(): {
        averageLatency: number;
        threadPool: {
            queued: number;
            running: number;
            maxConcurrency: number;
        };
        tasksSubmitted: number;
        tasksCompleted: number;
        tasksFailed: number;
        totalLatency: number;
    };
}
export declare const computeStack: AsyncComputeStack;
//# sourceMappingURL=index.d.ts.map