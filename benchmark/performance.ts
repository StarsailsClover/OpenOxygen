/**
 * OpenOxygen Performance Benchmark
 * 
 * 对比 Rust vs C++ vs TypeScript 实现
 */

import { performance } from "perf_hooks";
import { NativeAPI, PerformanceMonitor } from "../native-bridge-v3.js";

const ITERATIONS = 100;

export async function runBenchmarks() {
  console.log("=== OpenOxygen Performance Benchmark ===\n");
  
  // 1. 截图性能测试
  console.log("1. Screen Capture Performance:");
  await benchmarkCapture();
  
  // 2. 向量搜索性能测试
  console.log("\n2. Vector Search Performance:");
  await benchmarkVectorSearch();
  
  // 3. 鼠标移动性能测试
  console.log("\n3. Mouse Movement Performance:");
  await benchmarkMouse();
  
  // 4. 打印统计
  console.log("\n=== Performance Summary ===");
  printStats();
}

async function benchmarkCapture() {
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    await NativeAPI.captureScreen(`./temp/capture_${i}.png`);
    const duration = performance.now() - start;
    PerformanceMonitor.record("capture", duration);
  }
}

async function benchmarkVectorSearch() {
  const dimension = 384; // CLIP embedding dimension
  const vectorCount = 10000;
  
  // 生成测试数据
  const vectors = Array(vectorCount).fill(0).map(() => 
    Array(dimension).fill(0).map(() => Math.random())
  );
  const query = Array(dimension).fill(0).map(() => Math.random());
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    NativeAPI.vectorSearch(query, vectors, 10);
    const duration = performance.now() - start;
    PerformanceMonitor.record("vector_search", duration);
  }
}

async function benchmarkMouse() {
  for (let i = 0; i < ITERATIONS; i++) {
    const x = Math.floor(Math.random() * 1920);
    const y = Math.floor(Math.random() * 1080);
    
    const start = performance.now();
    NativeAPI.mouseMove(x, y);
    const duration = performance.now() - start;
    PerformanceMonitor.record("mouse_move", duration);
  }
}

function printStats() {
  const operations = ["capture", "vector_search", "mouse_move"];
  
  operations.forEach(op => {
    const stats = PerformanceMonitor.getStats(op);
    if (stats) {
      console.log(`${op}:`);
      console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
      console.log(`  Min: ${stats.min.toFixed(2)}ms`);
      console.log(`  Max: ${stats.max.toFixed(2)}ms`);
      console.log(`  Count: ${stats.count}`);
    }
  });
}

// 运行基准测试
if (require.main === module) {
  runBenchmarks().catch(console.error);
}
