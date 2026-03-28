/**
 * OpenOxygen Ollama Manager
 * 
 * 自动检测、连接和管理 Ollama LLM
 */

const http = require("http");
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const log = {
    info: (...args) => console.log("[OllamaManager]", ...args),
    warn: (...args) => console.warn("[OllamaManager]", ...args),
    error: (...args) => console.error("[OllamaManager]", ...args)
};

/**
 * Ollama 管理器
 */
class OllamaManager {
    constructor(config = {}) {
        this.config = {
            defaultEndpoint: config.endpoint || "http://localhost:11434",
            defaultModel: config.model || "qwen3:4b",
            fallbackModels: config.fallbackModels || ["qwen3:1.8b", "llama3:8b"],
            autoStart: config.autoStart !== false,
            autoPull: config.autoPull !== false,
            ...config
        };
        
        this.endpoint = null;
        this.currentModel = null;
        this.availableModels = [];
        this.isConnected = false;
    }
    
    /**
     * 自动检测 Ollama
     */
    async autoDetect() {
        log.info("Auto-detecting Ollama...");
        
        // 尝试的端口列表
        const ports = [11434, 11435, 11436, 3000, 8080];
        const hosts = ["localhost", "127.0.0.1"];
        
        for (const host of hosts) {
            for (const port of ports) {
                const endpoint = `http://${host}:${port}`;
                
                if (await this.testEndpoint(endpoint)) {
                    this.endpoint = endpoint;
                    this.isConnected = true;
                    log.info(`✅ Ollama found at: ${endpoint}`);
                    return true;
                }
            }
        }
        
        log.warn("❌ Ollama not found on any port");
        return false;
    }
    
    /**
     * 测试端点
     */
    async testEndpoint(endpoint) {
        try {
            const response = await this.fetch(`${endpoint}/api/tags`, {
                method: "GET",
                timeout: 2000
            });
            
            return response && response.models !== undefined;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 启动 Ollama
     */
    async startOllama() {
        log.info("Starting Ollama...");
        
        return new Promise((resolve, reject) => {
            // 检测平台
            const isWindows = process.platform === "win32";
            const ollamaCmd = isWindows ? "ollama.exe" : "ollama";
            
            // 启动 Ollama
            const child = spawn(ollamaCmd, ["serve"], {
                detached: true,
                stdio: "ignore",
                windowsHide: true
            });
            
            child.unref();
            
            // 等待启动
            setTimeout(async () => {
                if (await this.autoDetect()) {
                    log.info("✅ Ollama started successfully");
                    resolve(true);
                } else {
                    reject(new Error("Failed to start Ollama"));
                }
            }, 5000);
        });
    }
    
    /**
     * 获取可用模型
     */
    async getAvailableModels() {
        if (!this.endpoint) {
            throw new Error("Ollama not connected");
        }
        
        try {
            const response = await this.fetch(`${this.endpoint}/api/tags`);
            this.availableModels = response.models || [];
            
            log.info(`Found ${this.availableModels.length} models:`);
            this.availableModels.forEach(m => {
                log.info(`  - ${m.name} (${Math.round(m.size / 1024 / 1024)}MB)`);
            });
            
            return this.availableModels;
        } catch (error) {
            log.error("Failed to get models:", error);
            return [];
        }
    }
    
    /**
     * 拉取模型
     */
    async pullModel(modelName) {
        log.info(`Pulling model: ${modelName}`);
        
        return new Promise((resolve, reject) => {
            const isWindows = process.platform === "win32";
            const ollamaCmd = isWindows ? "ollama.exe" : "ollama";
            
            const child = spawn(ollamaCmd, ["pull", modelName], {
                stdio: "pipe"
            });
            
            let output = "";
            
            child.stdout.on("data", (data) => {
                output += data.toString();
                process.stdout.write(data);
            });
            
            child.stderr.on("data", (data) => {
                process.stderr.write(data);
            });
            
            child.on("close", (code) => {
                if (code === 0) {
                    log.info(`✅ Model ${modelName} pulled successfully`);
                    resolve(true);
                } else {
                    reject(new Error(`Failed to pull model: ${modelName}`));
                }
            });
        });
    }
    
    /**
     * 确保模型可用
     */
    async ensureModel(modelName = null) {
        const targetModel = modelName || this.config.defaultModel;
        
        log.info(`Ensuring model available: ${targetModel}`);
        
        // 获取当前模型
        await this.getAvailableModels();
        
        // 检查目标模型是否存在
        const exists = this.availableModels.some(m => m.name === targetModel);
        
        if (exists) {
            this.currentModel = targetModel;
            log.info(`✅ Model ${targetModel} is available`);
            return true;
        }
        
        // 尝试拉取
        if (this.config.autoPull) {
            try {
                await this.pullModel(targetModel);
                this.currentModel = targetModel;
                return true;
            } catch (error) {
                log.warn(`Failed to pull ${targetModel}, trying fallback models`);
                
                // 尝试备用模型
                for (const fallback of this.config.fallbackModels) {
                    try {
                        await this.pullModel(fallback);
                        this.currentModel = fallback;
                        log.info(`✅ Using fallback model: ${fallback}`);
                        return true;
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
        
        throw new Error(`No suitable model available`);
    }
    
    /**
     * 生成任务脚本
     */
    async generateTaskScript(userRequest) {
        log.info("Generating task script for:", userRequest);
        
        if (!this.currentModel) {
            throw new Error("No model available");
        }
        
        const prompt = this.buildTaskPrompt(userRequest);
        
        try {
            const response = await this.fetch(`${this.endpoint}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: this.currentModel,
                    prompt: prompt,
                    stream: false
                })
            });
            
            const script = this.parseTaskScript(response.response);
            log.info("✅ Task script generated");
            
            return script;
            
        } catch (error) {
            log.error("Failed to generate script:", error);
            throw error;
        }
    }
    
    /**
     * 构建任务提示词
     */
    buildTaskPrompt(userRequest) {
        return `你是一个任务规划专家。请将用户的自然语言请求转换为可执行的任务脚本。

用户请求: "${userRequest}"

可用操作:
1. browser.navigate(url) - 导航到网页
2. browser.clickElement(selector) - 点击元素
3. browser.typeText(selector, text) - 输入文本
4. native.mouseMove(x, y) - 移动鼠标
5. native.mouseClick(button) - 点击鼠标
6. native.keyPress(keyCode) - 按键
7. native.typeText(text) - 输入文本
8. wait(ms) - 等待
9. screenshot(path) - 截图

请生成 JavaScript 代码，格式如下:

\`\`\`javascript
const task = {
    name: "任务名称",
    steps: [
        { action: "browser.navigate", params: ["https://..."] },
        { action: "wait", params: [3000] },
        // ...
    ]
};
\`\`\`

只输出代码，不要解释。`;
    }
    
    /**
     * 解析任务脚本
     */
    parseTaskScript(response) {
        // 提取代码块
        const match = response.match(/```javascript\n([\s\S]*?)```/);
        if (match) {
            return match[1].trim();
        }
        
        // 如果没有代码块，返回整个响应
        return response.trim();
    }
    
    /**
     * 执行 HTTP 请求
     */
    fetch(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            
            const req = http.request({
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
                method: options.method || "GET",
                headers: options.headers || {},
                timeout: options.timeout || 10000
            }, (res) => {
                let data = "";
                
                res.on("data", (chunk) => {
                    data += chunk;
                });
                
                res.on("end", () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve(data);
                    }
                });
            });
            
            req.on("error", reject);
            req.on("timeout", () => reject(new Error("Request timeout")));
            
            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }
    
    /**
     * 完整初始化流程
     */
    async initialize() {
        log.info("Initializing Ollama Manager...");
        
        // 1. 检测 Ollama
        let detected = await this.autoDetect();
        
        // 2. 如未检测到，尝试启动
        if (!detected && this.config.autoStart) {
            try {
                await this.startOllama();
                detected = true;
            } catch (error) {
                log.error("Failed to auto-start Ollama:", error);
            }
        }
        
        if (!detected) {
            throw new Error("Ollama not available. Please install and start Ollama.");
        }
        
        // 3. 确保模型可用
        await this.ensureModel();
        
        log.info("✅ Ollama Manager initialized successfully");
        log.info(`  Endpoint: ${this.endpoint}`);
        log.info(`  Model: ${this.currentModel}`);
        
        return true;
    }
}

module.exports = { OllamaManager };
