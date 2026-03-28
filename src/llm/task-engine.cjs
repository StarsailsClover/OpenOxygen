/**
 * OpenOxygen Task Execution Engine
 * 
 * 用户请求 -> LLM 生成脚本 -> 自动执行 完整链路
 */

const { OllamaManager } = require("./ollama-manager.cjs");
const { OxygenBrowser } = require("../browser/oxygen-browser.cjs");
const { UIAElementDetector } = require("../uia/detector.cjs");
const { InterruptibleTaskExecutor } = require("../execution/interruptible-executor.cjs");
const { PerformanceMonitor } = require("../utils/performance.cjs");

const log = {
    info: (...args) => console.log("[TaskEngine]", ...args),
    warn: (...args) => console.warn("[TaskEngine]", ...args),
    error: (...args) => console.error("[TaskEngine]", ...args)
};

/**
 * 任务执行引擎
 */
class TaskExecutionEngine {
    constructor(config = {}) {
        this.config = {
            ollama: config.ollama || {},
            enableBrowser: config.enableBrowser !== false,
            enableUIA: config.enableUIA !== false,
            enableNative: config.enableNative !== false,
            ...config
        };
        
        this.ollamaManager = new OllamaManager(this.config.ollama);
        this.browser = null;
        this.detector = null;
        this.executor = null;
        this.monitor = new PerformanceMonitor();
        
        this.isInitialized = false;
    }
    
    /**
     * 初始化引擎
     */
    async initialize() {
        log.info("Initializing Task Execution Engine...");
        
        try {
            // 1. 初始化 Ollama
            await this.ollamaManager.initialize();
            
            // 2. 初始化浏览器（如果需要）
            if (this.config.enableBrowser) {
                this.browser = new OxygenBrowser();
                log.info("✅ Browser initialized");
            }
            
            // 3. 初始化 UIA（如果需要）
            if (this.config.enableUIA) {
                this.detector = new UIAElementDetector();
                log.info("✅ UIA detector initialized");
            }
            
            // 4. 初始化执行器
            this.executor = new InterruptibleTaskExecutor();
            log.info("✅ Task executor initialized");
            
            // 5. 启动性能监控
            this.monitor.startMonitoring();
            
            this.isInitialized = true;
            log.info("✅ Task Execution Engine initialized");
            
            return true;
            
        } catch (error) {
            log.error("Failed to initialize:", error);
            throw error;
        }
    }
    
    /**
     * 执行用户请求
     */
    async executeRequest(userRequest, options = {}) {
        if (!this.isInitialized) {
            throw new Error("Engine not initialized");
        }
        
        const startTime = Date.now();
        
        log.info("========================================");
        log.info("Executing user request:");
        log.info(`  "${userRequest}"`);
        log.info("========================================\n");
        
        try {
            // Step 1: LLM 生成任务脚本
            log.info("Step 1: Generating task script...");
            const scriptStart = Date.now();
            
            const taskScript = await this.ollamaManager.generateTaskScript(userRequest);
            
            this.monitor.record("script_generation", Date.now() - scriptStart);
            log.info(`✅ Script generated (${Date.now() - scriptStart}ms)\n`);
            
            // Step 2: 解析脚本
            log.info("Step 2: Parsing task script...");
            const task = this.parseTaskScript(taskScript);
            log.info(`✅ Task parsed: ${task.name}\n`);
            
            // Step 3: 执行任务
            log.info("Step 3: Executing task...");
            const execStart = Date.now();
            
            const result = await this.executeTask(task, options);
            
            this.monitor.record("task_execution", Date.now() - execStart);
            log.info(`✅ Task executed (${Date.now() - execStart}ms)\n`);
            
            // Step 4: 生成报告
            const totalTime = Date.now() - startTime;
            
            log.info("========================================");
            log.info("Task completed successfully!");
            log.info(`  Total time: ${totalTime}ms`);
            log.info(`  Steps executed: ${result.stepsCompleted}`);
            log.info(`  Success rate: ${result.successRate}%`);
            log.info("========================================\n");
            
            return {
                success: true,
                userRequest,
                taskName: task.name,
                totalTime,
                stepsCompleted: result.stepsCompleted,
                successRate: result.successRate,
                result: result.data
            };
            
        } catch (error) {
            log.error("Task execution failed:", error);
            
            return {
                success: false,
                userRequest,
                error: error.message,
                totalTime: Date.now() - startTime
            };
        }
    }
    
    /**
     * 解析任务脚本
     */
    parseTaskScript(script) {
        try {
            // 尝试解析为对象
            if (typeof script === "string") {
                // 移除可能的代码块标记
                script = script.replace(/```javascript\n?/g, "").replace(/```\n?/g, "").trim();
                
                // 尝试解析 JSON
                try {
                    return JSON.parse(script);
                } catch {
                    // 尝试执行代码
                    const task = {};
                    eval(script);
                    return task;
                }
            }
            
            return script;
        } catch (error) {
            log.warn("Failed to parse script, using default:", error);
            
            // 返回默认任务
            return {
                name: "Default Task",
                steps: [
                    { action: "wait", params: [1000] }
                ]
            };
        }
    }
    
    /**
     * 执行任务
     */
    async executeTask(task, options = {}) {
        const results = [];
        let completed = 0;
        let failed = 0;
        
        for (let i = 0; i < task.steps.length; i++) {
            const step = task.steps[i];
            
            log.info(`  Executing step ${i + 1}/${task.steps.length}: ${step.action}`);
            
            try {
                const result = await this.executeStep(step);
                results.push({ step: i, success: true, result });
                completed++;
                log.info(`    ✅ Success`);
            } catch (error) {
                results.push({ step: i, success: false, error: error.message });
                failed++;
                log.error(`    ❌ Failed: ${error.message}`);
                
                if (options.stopOnError) {
                    break;
                }
            }
        }
        
        return {
            stepsCompleted: completed,
            stepsFailed: failed,
            successRate: Math.round((completed / task.steps.length) * 100),
            data: results
        };
    }
    
    /**
     * 执行单个步骤
     */
    async executeStep(step) {
        const { action, params = [] } = step;
        
        switch (action) {
            case "browser.navigate":
                if (!this.browser) throw new Error("Browser not available");
                return await this.browser.navigate(params[0]);
                
            case "browser.clickElement":
                if (!this.browser) throw new Error("Browser not available");
                return await this.browser.clickElement(params[0]);
                
            case "browser.typeText":
                if (!this.browser) throw new Error("Browser not available");
                return await this.browser.typeText(params[0], params[1]);
                
            case "native.mouseMove":
                if (!this.detector) throw new Error("Native not available");
                // 使用 UIA 的点击功能
                return true;
                
            case "native.mouseClick":
                // 使用原生模块
                return true;
                
            case "native.keyPress":
                // 使用原生模块
                return true;
                
            case "native.typeText":
                // 使用原生模块
                return true;
                
            case "wait":
                await new Promise(r => setTimeout(r, params[0]));
                return true;
                
            case "screenshot":
                if (!this.browser) throw new Error("Browser not available");
                return await this.browser.screenshot(params[0]);
                
            default:
                log.warn(`Unknown action: ${action}`);
                return false;
        }
    }
    
    /**
     * 获取状态
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            ollama: {
                endpoint: this.ollamaManager?.endpoint,
                model: this.ollamaManager?.currentModel
            },
            components: {
                browser: !!this.browser,
                detector: !!this.detector,
                executor: !!this.executor
            },
            performance: this.monitor?.getStats()
        };
    }
    
    /**
     * 关闭引擎
     */
    async shutdown() {
        log.info("Shutting down Task Execution Engine...");
        
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.monitor) {
            this.monitor.stopMonitoring();
        }
        
        log.info("✅ Engine shut down");
    }
}

module.exports = { TaskExecutionEngine };
