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

import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";

const log = createSubsystemLogger("async/compute");

// ═══════════════════════════════════════════════════════════════════════════
// Task Types & Priorities
// ═══════════════════════════════════════════════════════════════════════════

export type TaskType =
  | "inference" // LLM 推理
  | "vision" // 视觉处理
  | "io" // IO 操作
  | "compute" // 通用计算
  | "background"; // 后台任务

export type TaskPriority =
  | "critical" // 用户阻塞等待
  | "high" // 交互式任务
  | "normal" // 标准任务
  | "low" // 可延迟任务
  | "background"; // 空闲时执行

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
  cpuCores?: number; // 需要的 CPU 核心数
  gpuMemoryMB?: number; // 需要的 GPU 显存
  ramMB?: number; // 需要的内存
  preferGPU?: boolean; // 优先使用 GPU
}

// ═══════════════════════════════════════════════════════════════════════════
// Thread Pool Manager
// ═══════════════════════════════════════════════════════════════════════════

export class ThreadPool {
  private workers: unknown[] = [];
  private taskQueue: ComputeTask[] = [];
  private runningTasks = new Map<string, AbortController>();
  private maxConcurrency: number;
  private currentConcurrency = 0;

  constructor(maxConcurrency = navigator.hardwareConcurrency || 4) {
    this.maxConcurrency = maxConcurrency;
    log.info(`ThreadPool initialized with ${maxConcurrency} workers`);
  }

  /**
   * 提交任务到线程池
   */
  async submit<T>(task: Omit<ComputeTask<T>, "id" | "createdAt">): Promise<T> {
    const fullTask: ComputeTask<T> = {
      ...task,
      id: generateId("task"),
      createdAt: nowMs(),
    };

    return new Promise((resolve, reject) => {
      const wrappedFn = async () => {
        try {
          const result = await task.fn();
          resolve(result);
          return result;
        } catch (err) {
          reject(err);
          throw err;
        }
      };

      this.taskQueue.push({ ...fullTask, fn: wrappedFn });
      this.schedule();
    });
  }

  /**
   * 优先级调度
   */
  private schedule(): void {
    if (this.currentConcurrency >= this.maxConcurrency) return;
    if (this.taskQueue.length === 0) return;

    // 按优先级排序
    const priorityOrder = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
      background: 4,
    };
    this.taskQueue.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    const task = this.taskQueue.shift()!;
    this.execute(task);
  }

  private async execute(task: ComputeTask): Promise<void> {
    this.currentConcurrency++;
    const controller = new AbortController();
    this.runningTasks.set(task.id, controller);

    const startTime = nowMs();
    log.debug(`[${task.type}:${task.priority}] Task ${task.id} started`);

    try {
      await task.fn();
    } finally {
      const duration = nowMs() - startTime;
      this.runningTasks.delete(task.id);
      this.currentConcurrency--;
      log.debug(`[${task.type}] Task ${task.id} completed in ${duration}ms`);
      this.schedule();
    }
  }

  /**
   * 取消指定任务
   */
  cancel(taskId: string): boolean {
    const controller = this.runningTasks.get(taskId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    queued: number;
    running: number;
    maxConcurrency: number;
  } {
    return {
      queued: this.taskQueue.length,
      running: this.currentConcurrency,
      maxConcurrency: this.maxConcurrency,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GPU Task Dispatcher
// ═══════════════════════════════════════════════════════════════════════════

export interface GPUDevice {
  id: number;
  name: string;
  memoryMB: number;
  computeCapability: number;
  isAvailable: boolean;
}

export class GPUDispatcher {
  private devices: GPUDevice[] = [];
  private deviceQueues: Map<number, ComputeTask[]> = new Map();

  constructor() {
    this.detectDevices();
  }

  private detectDevices(): void {
    // 实际实现需要调用 native 模块检测 GPU
    // 这里提供框架接口
    log.info("GPU device detection (requires native module)");
  }

  /**
   * 选择最优 GPU 设备
   */
  selectDevice(hints: ResourceHints): GPUDevice | null {
    const available = this.devices.filter((d) => d.isAvailable);
    if (available.length === 0) return null;

    if (hints.gpuMemoryMB) {
      // 选择满足显存要求的最小设备
      return (
        available
          .filter((d) => d.memoryMB >= hints.gpuMemoryMB!)
          .sort((a, b) => a.memoryMB - b.memoryMB)[0] || null
      );
    }

    // 默认选择第一个可用设备
    return available[0] || null;
  }

  /**
   * 提交 GPU 任务
   */
  async submitToGPU<T>(task: ComputeTask<T>): Promise<T> {
    const device = this.selectDevice(task.resourceHints || {});
    if (!device) {
      throw new Error("No suitable GPU device available");
    }

    // 添加到设备队列
    const queue = this.deviceQueues.get(device.id) || [];
    queue.push(task);
    this.deviceQueues.set(device.id, queue);

    log.info(`GPU task ${task.id} queued on device ${device.name}`);
    return task.fn();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Async Compute Stack (Main Export)
// ═══════════════════════════════════════════════════════════════════════════

export class AsyncComputeStack {
  private threadPool: ThreadPool;
  private gpuDispatcher: GPUDispatcher;
  private metrics = {
    tasksSubmitted: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    totalLatency: 0,
  };

  constructor(options?: { maxThreads?: number }) {
    this.threadPool = new ThreadPool(options?.maxThreads);
    this.gpuDispatcher = new GPUDispatcher();
  }

  /**
   * 提交计算任务（自动选择 CPU/GPU）
   */
  async submit<T>(
    fn: () => Promise<T>,
    options: {
      type?: TaskType;
      priority?: TaskPriority;
      useGPU?: boolean;
      resourceHints?: ResourceHints;
    } = {},
  ): Promise<T> {
    const startTime = nowMs();
    this.metrics.tasksSubmitted++;

    const task: ComputeTask<T> = {
      id: generateId("compute"),
      type: options.type || "compute",
      priority: options.priority || "normal",
      fn,
      createdAt: startTime,
      resourceHints: options.resourceHints,
    };

    try {
      let result: T;

      if (options.useGPU && options.resourceHints?.preferGPU) {
        result = await this.gpuDispatcher.submitToGPU(task);
      } else {
        result = await this.threadPool.submit(task);
      }

      this.metrics.tasksCompleted++;
      this.metrics.totalLatency += nowMs() - startTime;
      return result;
    } catch (err) {
      this.metrics.tasksFailed++;
      throw err;
    }
  }

  /**
   * 批量提交任务（并行执行）
   */
  async batch<T>(
    tasks: Array<() => Promise<T>>,
    options: {
      type?: TaskType;
      priority?: TaskPriority;
      concurrency?: number;
    } = {},
  ): Promise<T[]> {
    const limit =
      options.concurrency || this.threadPool.getStatus().maxConcurrency;
    const results: T[] = [];

    // 使用 p-limit 风格的并发控制
    const executing: Promise<void>[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]!;
      const promise = this.submit(task, options).then((result) => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1,
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const avgLatency =
      this.metrics.tasksCompleted > 0
        ? this.metrics.totalLatency / this.metrics.tasksCompleted
        : 0;

    return {
      ...this.metrics,
      averageLatency: avgLatency,
      threadPool: this.threadPool.getStatus(),
    };
  }
}

// 全局实例
export const computeStack = new AsyncComputeStack();
