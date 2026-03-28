/**
 * OpenOxygen Performance Optimization
 * 
 * 性能监控与优化工具
 */

const { EventEmitter } = require("events");
const os = require("os");

const log = {
    info: (...args) => console.log("[Performance]", ...args),
    warn: (...args) => console.warn("[Performance]", ...args),
    error: (...args) => console.error("[Performance]", ...args)
};

/**
 * 性能监控器
 */
class PerformanceMonitor extends EventEmitter {
    constructor() {
        super();
        
        this.metrics = new Map();
        this.benchmarks = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = null;
    }
    
    /**
     * 开始监控
     */
    startMonitoring(intervalMs = 5000) {
        log.info("Starting performance monitoring");
        
        this.isMonitoring = true;
        
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);
        
        this.emit("monitoringStarted");
    }
    
    /**
     * 停止监控
     */
    stopMonitoring() {
        log.info("Stopping performance monitoring");
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.emit("monitoringStopped");
    }
    
    /**
     * 收集指标
     */
    collectMetrics() {
        const metrics = {
            timestamp: Date.now(),
            memory: this.getMemoryMetrics(),
            cpu: this.getCPUMetrics(),
            system: this.getSystemMetrics()
        };
        
        this.emit("metrics", metrics);
    }
    
    /**
     * 获取内存指标
     */
    getMemoryMetrics() {
        const usage = process.memoryUsage();
        const system = os.freemem();
        const total = os.totalmem();
        
        return {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024),
            systemFree: Math.round(system / 1024 / 1024),
            systemTotal: Math.round(total / 1024 / 1024),
            usagePercent: Math.round((usage.heapUsed / usage.heapTotal) * 100)
        };
    }
    
    /**
     * 获取 CPU 指标
     */
    getCPUMetrics() {
        const loadAvg = os.loadavg();
        
        return {
            loadAverage1m: loadAvg[0],
            loadAverage5m: loadAvg[1],
            loadAverage15m: loadAvg[2],
            cpuCount: os.cpus().length
        };
    }
    
    /**
     * 获取系统指标
     */
    getSystemMetrics() {
        return {
            uptime: os.uptime(),
            platform: os.platform(),
            arch: os.arch()
        };
    }
    
    /**
     * 记录操作耗时
     */
    record(operation, durationMs) {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, []);
        }
        
        const metrics = this.metrics.get(operation);
        metrics.push({
            duration: durationMs,
            timestamp: Date.now()
        });
        
        // 只保留最近 1000 条
        if (metrics.length > 1000) {
            metrics.shift();
        }
    }
    
    /**
     * 获取操作统计
     */
    getStats(operation) {
        const metrics = this.metrics.get(operation);
        
        if (!metrics || metrics.length === 0) {
            return null;
        }
        
        const durations = metrics.map(m => m.duration);
        
        return {
            count: durations.length,
            avg: durations.reduce((a, b) => a + b, 0) / durations.length,
            min: Math.min(...durations),
            max: Math.max(...durations),
            p95: this.percentile(durations, 0.95),
            p99: this.percentile(durations, 0.99)
        };
    }
    
    /**
     * 计算百分位数
     */
    percentile(sorted, p) {
        const sortedArr = [...sorted].sort((a, b) => a - b);
        const index = Math.ceil(sortedArr.length * p) - 1;
        return sortedArr[Math.max(0, index)];
    }
    
    /**
     * 生成报告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            operations: {},
            system: this.getSystemMetrics(),
            memory: this.getMemoryMetrics(),
            cpu: this.getCPUMetrics()
        };
        
        for (const [operation, _] of this.metrics) {
            report.operations[operation] = this.getStats(operation);
        }
        
        return report;
    }
}

/**
 * 性能优化器
 */
class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.cacheSize = 1000;
    }
    
    /**
     * 缓存获取
     */
    getFromCache(key) {
        const item = this.cache.get(key);
        
        if (item && Date.now() - item.timestamp < item.ttl) {
            return item.value;
        }
        
        this.cache.delete(key);
        return null;
    }
    
    /**
     * 缓存设置
     */
    setCache(key, value, ttlMs = 60000) {
        // 清理过期项
        if (this.cache.size >= this.cacheSize) {
            this.cleanupCache();
        }
        
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: ttlMs
        });
    }
    
    /**
     * 清理缓存
     */
    cleanupCache() {
        const now = Date.now();
        
        for (const [key, item] of this.cache) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
            }
        }
        
        // 如果仍然太多，删除最旧的
        if (this.cache.size >= this.cacheSize) {
            const oldest = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            
            if (oldest) {
                this.cache.delete(oldest[0]);
            }
        }
    }
    
    /**
     * 批量操作优化
     */
    async batchProcess(items, processor, batchSize = 10) {
        const results = [];
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => processor(item))
            );
            results.push(...batchResults);
        }
        
        return results;
    }
    
    /**
     * 防抖函数
     */
    debounce(fn, delay) {
        let timeoutId;
        
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    }
    
    /**
     * 节流函数
     */
    throttle(fn, limit) {
        let inThrottle;
        
        return (...args) => {
            if (!inThrottle) {
                fn(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * 基准测试
 */
class Benchmark {
    constructor() {
        this.results = [];
    }
    
    /**
     * 运行基准测试
     */
    async run(name, fn, iterations = 100) {
        log.info(`Running benchmark: ${name} (${iterations} iterations)`);
        
        const times = [];
        
        // 预热
        for (let i = 0; i < 10; i++) {
            await fn();
        }
        
        // 正式测试
        for (let i = 0; i < iterations; i++) {
            const start = process.hrtime.bigint();
            await fn();
            const end = process.hrtime.bigint();
            
            times.push(Number(end - start) / 1000000); // 转换为毫秒
        }
        
        const result = {
            name,
            iterations,
            avg: times.reduce((a, b) => a + b, 0) / times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            p95: this.percentile(times, 0.95)
        };
        
        this.results.push(result);
        
        log.info(`Benchmark ${name} completed:`, {
            avg: `${result.avg.toFixed(2)}ms`,
            min: `${result.min.toFixed(2)}ms`,
            max: `${result.max.toFixed(2)}ms`
        });
        
        return result;
    }
    
    percentile(arr, p) {
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }
    
    /**
     * 生成报告
     */
    generateReport() {
        return {
            timestamp: new Date().toISOString(),
            results: this.results
        };
    }
}

module.exports = {
    PerformanceMonitor,
    PerformanceOptimizer,
    Benchmark
};
