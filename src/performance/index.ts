/**
 * Performance Monitoring and Optimization
 * 
 * Performance metrics collection, benchmarking, and optimization
 */

import { createSubsystemLogger } from "../logging/index.js";

const log = createSubsystemLogger("performance");

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  timestamp: number;
  memory: MemoryMetrics;
  cpu: CPUMetrics;
  inference: InferenceMetrics;
  execution: ExecutionMetrics;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface CPUMetrics {
  usage: number;
  loadAverage: number[];
}

export interface InferenceMetrics {
  totalCalls: number;
  avgLatency: number;
  tokensPerSecond: number;
  cacheHitRate: number;
}

export interface ExecutionMetrics {
  tasksExecuted: number;
  avgTaskDuration: number;
  successRate: number;
}

// ============================================================================
// Performance Monitor
// ============================================================================

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxHistorySize = 1000;
  private intervalId?: NodeJS.Timeout;

  /**
   * Start monitoring
   */
  start(intervalMs: number = 5000): void {
    log.info(`Starting performance monitoring (interval: ${intervalMs}ms)`);
    
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      log.info("Performance monitoring stopped");
    }
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    const memUsage = process.memoryUsage();
    
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memory: {
        used: memUsage.rss,
        total: memUsage.heapTotal + memUsage.external,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
      cpu: {
        usage: 0, // Would need os module
        loadAverage: require("node:os").loadavg(),
      },
      inference: {
        totalCalls: 0,
        avgLatency: 0,
        tokensPerSecond: 0,
        cacheHitRate: 0,
      },
      execution: {
        tasksExecuted: 0,
        avgTaskDuration: 0,
        successRate: 0,
      },
    };

    this.metrics.push(metrics);

    // Trim history
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }

    // Log if memory is high
    if (metrics.memory.heapUsed > metrics.memory.heapTotal * 0.8) {
      log.warn(`High memory usage: ${(metrics.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getHistory(durationMs?: number): PerformanceMetrics[] {
    if (!durationMs) {
      return [...this.metrics];
    }

    const cutoff = Date.now() - durationMs;
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get average metrics
   */
  getAverageMetrics(durationMs: number = 60000): Partial<PerformanceMetrics> {
    const recent = this.getHistory(durationMs);
    
    if (recent.length === 0) {
      return {};
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      memory: {
        used: avg(recent.map(m => m.memory.used)),
        total: avg(recent.map(m => m.memory.total)),
        heapUsed: avg(recent.map(m => m.memory.heapUsed)),
        heapTotal: avg(recent.map(m => m.memory.heapTotal)),
        external: avg(recent.map(m => m.memory.external)),
      },
      cpu: {
        usage: avg(recent.map(m => m.cpu.usage)),
        loadAverage: recent[recent.length - 1]?.cpu.loadAverage || [0, 0, 0],
      },
    };
  }
}

// ============================================================================
// Benchmark
// ============================================================================

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

export class Benchmark {
  /**
   * Run a benchmark
   */
  static async run(
    name: string,
    fn: () => Promise<void> | void,
    iterations: number = 1000,
  ): Promise<BenchmarkResult> {
    log.info(`Running benchmark: ${name} (${iterations} iterations)`);

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / avgTime;

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      opsPerSecond,
    };

    log.info(`Benchmark ${name} complete: ${opsPerSecond.toFixed(2)} ops/sec`);

    return result;
  }

  /**
   * Compare two implementations
   */
  static async compare(
    name: string,
    implementations: Record<string, () => Promise<void> | void>,
    iterations: number = 1000,
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const [implName, fn] of Object.entries(implementations)) {
      const result = await Benchmark.run(`${name} - ${implName}`, fn, iterations);
      results.push(result);
    }

    // Sort by ops/sec
    results.sort((a, b) => b.opsPerSecond - a.opsPerSecond);

    log.info(`Benchmark comparison ${name}:`);
    results.forEach((r, i) => {
      log.info(`  ${i + 1}. ${r.name}: ${r.opsPerSecond.toFixed(2)} ops/sec`);
    });

    return results;
  }
}

// ============================================================================
// Optimization Tips
// ============================================================================

export class OptimizationTips {
  /**
   * Get optimization suggestions based on metrics
   */
  static analyze(metrics: PerformanceMetrics): string[] {
    const tips: string[] = [];

    // Memory tips
    const memoryUsage = metrics.memory.heapUsed / metrics.memory.heapTotal;
    if (memoryUsage > 0.8) {
      tips.push("High memory usage detected. Consider:",
        "  - Enabling KV cache compression",
        "  - Reducing batch size",
        "  - Implementing memory pooling");
    }

    // CPU tips
    if (metrics.cpu.loadAverage[0] > 0.8) {
      tips.push("High CPU load detected. Consider:",
        "  - Using async I/O",
        "  - Implementing worker threads",
        "  - Optimizing hot paths");
    }

    return tips;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();
