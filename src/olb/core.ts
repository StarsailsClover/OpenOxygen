/**
 * OpenOxygen - OLB Acceleration Engine Core (26w15aD Phase 7)
 *
 * P-0: OLB 加速引擎核心
 * - SIMD 向量运算加速
 * - 内存池管理
 * - 并行计算优化
 * - 缓存优化策略
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";

const log = createSubsystemLogger("olb/core");

// SIMD operations supported
export type SIMDOps =
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "min"
  | "max"
  | "sqrt"
  | "abs";

// Data types for SIMD
export type SIMDDataType = "float32" | "float64" | "int32" | "int64";

// Vector dimensions
export type VectorDim = 128 | 256 | 512;

// Memory pool configuration
export interface MemoryPoolConfig {
  blockSize: number;
  initialBlocks: number;
  maxBlocks: number;
  alignment: number;
}

// SIMD vector
export interface SIMDVector {
  data: Float32Array | Float64Array | Int32Array;
  dimension: VectorDim;
  type: SIMDDataType;
}

// Operation result
export interface OperationResult {
  success: boolean;
  durationMs: number;
  throughput: number; // ops/sec
  result?: SIMDVector;
  error?: string;
}

// Performance metrics
export interface PerformanceMetrics {
  totalOps: number;
  totalDurationMs: number;
  avgThroughput: number;
  peakThroughput: number;
  memoryUsed: number;
  cacheHitRate: number;
}

/**
 * SIMD Acceleration Engine
 */
export class SIMDArrayEngine {
  private dimension: VectorDim;
  private type: SIMDDataType;
  private metrics: PerformanceMetrics;

  constructor(dimension: VectorDim = 256, type: SIMDDataType = "float32") {
    this.dimension = dimension;
    this.type = type;
    this.metrics = {
      totalOps: 0,
      totalDurationMs: 0,
      avgThroughput: 0,
      peakThroughput: 0,
      memoryUsed: 0,
      cacheHitRate: 0,
    };
    log.info(`SIMDArrayEngine initialized: ${dimension}-bit ${type}`);
  }

  /**
   * Create a SIMD vector from array
   */
  createVector(data: number[]): SIMDVector {
    const array = new Float32Array(data);
    return {
      data: array,
      dimension: this.dimension,
      type: this.type,
    };
  }

  /**
   * Perform SIMD operation on two vectors
   */
  operate(
    op: SIMDOps,
    a: SIMDVector,
    b?: SIMDVector,
  ): OperationResult {
    const startTime = nowMs();

    try {
      let result: Float32Array;

      switch (op) {
        case "add":
          result = this.add(a.data as Float32Array, b!.data as Float32Array);
          break;
        case "sub":
          result = this.sub(a.data as Float32Array, b!.data as Float32Array);
          break;
        case "mul":
          result = this.mul(a.data as Float32Array, b!.data as Float32Array);
          break;
        case "div":
          result = this.div(a.data as Float32Array, b!.data as Float32Array);
          break;
        case "sqrt":
          result = this.sqrt(a.data as Float32Array);
          break;
        case "abs":
          result = this.abs(a.data as Float32Array);
          break;
        default:
          throw new Error(`Unsupported operation: ${op}`);
      }

      const durationMs = nowMs() - startTime;
      const throughput = (a.data.length / durationMs) * 1000;

      // Update metrics
      this.metrics.totalOps++;
      this.metrics.totalDurationMs += durationMs;
      this.metrics.avgThroughput =
        (this.metrics.avgThroughput * (this.metrics.totalOps - 1) + throughput) /
        this.metrics.totalOps;
      this.metrics.peakThroughput = Math.max(
        this.metrics.peakThroughput,
        throughput,
      );

      return {
        success: true,
        durationMs,
        throughput,
        result: {
          data: result,
          dimension: this.dimension,
          type: this.type,
        },
      };
    } catch (error) {
      return {
        success: false,
        durationMs: nowMs() - startTime,
        throughput: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // SIMD operations (simulated with standard arrays for now)
  private add(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i]! + b[i]!;
    }
    return result;
  }

  private sub(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i]! - b[i]!;
    }
    return result;
  }

  private mul(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i]! * b[i]!;
    }
    return result;
  }

  private div(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i]! / b[i]!;
    }
    return result;
  }

  private sqrt(a: Float32Array): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = Math.sqrt(a[i]!);
    }
    return result;
  }

  private abs(a: Float32Array): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = Math.abs(a[i]!);
    }
    return result;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalOps: 0,
      totalDurationMs: 0,
      avgThroughput: 0,
      peakThroughput: 0,
      memoryUsed: 0,
      cacheHitRate: 0,
    };
  }
}

/**
 * Memory Pool Manager
 */
export class MemoryPoolManager {
  private config: MemoryPoolConfig;
  private pools: Map<string, ArrayBuffer[]> = new Map();
  private allocated: Map<string, number> = new Map();

  constructor(config: Partial<MemoryPoolConfig> = {}) {
    this.config = {
      blockSize: config.blockSize || 1024 * 1024, // 1MB default
      initialBlocks: config.initialBlocks || 10,
      maxBlocks: config.maxBlocks || 100,
      alignment: config.alignment || 64,
    };
    log.info(
      `MemoryPoolManager initialized: ${this.config.initialBlocks} blocks of ${this.config.blockSize} bytes`,
    );
  }

  /**
   * Allocate memory block
   */
  allocate(poolId: string): ArrayBuffer | null {
    let pool = this.pools.get(poolId);

    if (!pool) {
      pool = [];
      this.pools.set(poolId, pool);
      this.allocated.set(poolId, 0);
    }

    // Check if we can allocate more
    const currentAllocated = this.allocated.get(poolId) || 0;
    if (currentAllocated >= this.config.maxBlocks) {
      log.warn(`Memory pool ${poolId} reached max blocks`);
      return null;
    }

    // Try to reuse from pool
    if (pool.length > 0) {
      this.allocated.set(poolId, currentAllocated + 1);
      return pool.pop()!;
    }

    // Allocate new block
    const block = new ArrayBuffer(this.config.blockSize);
    this.allocated.set(poolId, currentAllocated + 1);
    return block;
  }

  /**
   * Free memory block back to pool
   */
  free(poolId: string, block: ArrayBuffer): void {
    const pool = this.pools.get(poolId);
    if (pool) {
      pool.push(block);
      const currentAllocated = this.allocated.get(poolId) || 0;
      this.allocated.set(poolId, Math.max(0, currentAllocated - 1));
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    pools: number;
    totalBlocks: number;
    allocatedBlocks: number;
    freeBlocks: number;
  } {
    let totalBlocks = 0;
    let allocatedBlocks = 0;

    for (const [poolId, pool] of this.pools.entries()) {
      totalBlocks += pool.length;
      allocatedBlocks += this.allocated.get(poolId) || 0;
    }

    return {
      pools: this.pools.size,
      totalBlocks,
      allocatedBlocks,
      freeBlocks: totalBlocks - allocatedBlocks,
    };
  }

  /**
   * Clear all pools
   */
  clear(): void {
    this.pools.clear();
    this.allocated.clear();
    log.info("Memory pools cleared");
  }
}

/**
 * OLB Core Engine
 */
export class OLBCoreEngine {
  private simdEngine: SIMDArrayEngine;
  private memoryPool: MemoryPoolManager;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.simdEngine = new SIMDArrayEngine();
    this.memoryPool = new MemoryPoolManager();
    log.info(`OLBCoreEngine initialized (enabled: ${enabled})`);
  }

  /**
   * Check if OLB is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable/disable OLB
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    log.info(`OLB ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get SIMD engine
   */
  getSIMDEngine(): SIMDArrayEngine {
    return this.simdEngine;
  }

  /**
   * Get memory pool manager
   */
  getMemoryPool(): MemoryPoolManager {
    return this.memoryPool;
  }

  /**
   * Get combined performance metrics
   */
  getMetrics(): {
    simd: PerformanceMetrics;
    memory: ReturnType<MemoryPoolManager["getStats"]>;
    enabled: boolean;
  } {
    return {
      simd: this.simdEngine.getMetrics(),
      memory: this.memoryPool.getStats(),
      enabled: this.enabled,
    };
  }

  /**
   * Benchmark OLB performance
   */
  benchmark(): {
    vectorOps: number;
    memoryAllocation: number;
    overall: number;
  } {
    const startTime = nowMs();

    // Benchmark vector operations
    const vecStart = nowMs();
    const a = this.simdEngine.createVector(new Array(1000).fill(1.0));
    const b = this.simdEngine.createVector(new Array(1000).fill(2.0));
    for (let i = 0; i < 1000; i++) {
      this.simdEngine.operate("add", a, b);
    }
    const vectorOps = nowMs() - vecStart;

    // Benchmark memory allocation
    const memStart = nowMs();
    for (let i = 0; i < 100; i++) {
      const block = this.memoryPool.allocate("benchmark");
      if (block) {
        this.memoryPool.free("benchmark", block);
      }
    }
    const memoryAllocation = nowMs() - memStart;

    const overall = nowMs() - startTime;

    return {
      vectorOps,
      memoryAllocation,
      overall,
    };
  }
}

// Exports
export { SIMDArrayEngine, MemoryPoolManager, OLBCoreEngine };
export default OLBCoreEngine;
