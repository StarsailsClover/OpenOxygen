/**
 * OpenOxygen Browser (OxygenBrowser)
 * 
 * 基于 WinUI + CDP 的浏览器自动化框架
 */

const { EventEmitter } = require("events");
const CDP = require("chrome-remote-interface");
const WebSocket = require("ws");

const log = {
    info: (...args) => console.log("[OxygenBrowser]", ...args),
    warn: (...args) => console.warn("[OxygenBrowser]", ...args),
    error: (...args) => console.error("[OxygenBrowser]", ...args)
};

/**
 * 浏览器配置
 */
const BrowserConfig = {
    headless: false,
    windowSize: { width: 1280, height: 720 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    defaultTimeout: 30000,
    cdPort: 9222
};

/**
 * OxygenBrowser 类
 */
class OxygenBrowser extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = { ...BrowserConfig, ...options };
        this.client = null;
        this.page = null;
        this.runtime = null;
        this.dom = null;
        this.isConnected = false;
        this.currentUrl = null;
    }
    
    /**
     * 启动浏览器
     */
    async launch() {
        log.info("Launching OxygenBrowser...");
        
        try {
            // 连接到 Chrome DevTools Protocol
            this.client = await CDP({
                port: this.config.cdPort
            });
            
            // 获取域
            const { Page, Runtime, DOM, Network } = this.client;
            this.page = Page;
            this.runtime = Runtime;
            this.dom = DOM;
            this.network = Network;
            
            // 启用域
            await Page.enable();
            await Runtime.enable();
            await DOM.enable();
            await Network.enable();
            
            // 设置事件监听
            this.setupEventListeners();
            
            this.isConnected = true;
            log.info("Browser connected successfully");
            
            this.emit("connected");
            
            return true;
            
        } catch (error) {
            log.error("Failed to launch browser:", error);
            this.emit("error", error);
            return false;
        }
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 页面加载完成
        this.page.on("loadEventFired", () => {
            log.info("Page loaded");
            this.emit("pageLoaded");
        });
        
        // DOM 更新
        this.dom.on("documentUpdated", () => {
            this.emit("domUpdated");
        });
        
        // 网络请求
        this.network.on("requestWillBeSent", (params) => {
            this.emit("request", params);
        });
        
        this.network.on("responseReceived", (params) => {
            this.emit("response", params);
        });
    }
    
    /**
     * 导航到 URL
     */
    async navigate(url) {
        log.info(`Navigating to: ${url}`);
        
        if (!this.isConnected) {
            throw new Error("Browser not connected");
        }
        
        try {
            await this.page.navigate({ url });
            this.currentUrl = url;
            
            // 等待加载完成
            await this.page.loadEventFired();
            
            log.info("Navigation complete");
            return true;
            
        } catch (error) {
            log.error("Navigation failed:", error);
            return false;
        }
    }
    
    /**
     * 获取页面标题
     */
    async getTitle() {
        const result = await this.runtime.evaluate({
            expression: "document.title"
        });
        
        return result.result.value;
    }
    
    /**
     * 获取页面 URL
     */
    async getUrl() {
        const result = await this.runtime.evaluate({
            expression: "window.location.href"
        });
        
        return result.result.value;
    }
    
    /**
     * 执行 JavaScript
     */
    async executeScript(script) {
        log.debug(`Executing script: ${script.substring(0, 50)}...`);
        
        const result = await this.runtime.evaluate({
            expression: script,
            returnByValue: true
        });
        
        return result.result.value;
    }
    
    /**
     * 查找元素 (CSS 选择器)
     */
    async findElement(selector) {
        log.info(`Finding element: ${selector}`);
        
        const script = `
            (function() {
                const el = document.querySelector('${selector}');
                if (!el) return null;
                
                const rect = el.getBoundingClientRect();
                return {
                    tagName: el.tagName,
                    id: el.id,
                    className: el.className,
                    text: el.textContent?.substring(0, 100),
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    centerX: rect.x + rect.width / 2,
                    centerY: rect.y + rect.height / 2,
                    visible: rect.width > 0 && rect.height > 0
                };
            })()
        `;
        
        return await this.executeScript(script);
    }
    
    /**
     * 查找多个元素
     */
    async findElements(selector) {
        const script = `
            (function() {
                const elements = document.querySelectorAll('${selector}');
                return Array.from(elements).map(el => {
                    const rect = el.getBoundingClientRect();
                    return {
                        tagName: el.tagName,
                        id: el.id,
                        text: el.textContent?.substring(0, 50),
                        x: rect.x,
                        y: rect.y,
                        centerX: rect.x + rect.width / 2,
                        centerY: rect.y + rect.height / 2
                    };
                });
            })()
        `;
        
        return await this.executeScript(script);
    }
    
    /**
     * 点击元素
     */
    async clickElement(selector) {
        log.info(`Clicking element: ${selector}`);
        
        const element = await this.findElement(selector);
        
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }
        
        // 使用 CDP Input 域模拟点击
        const { Input } = this.client;
        await Input.enable();
        
        // 移动鼠标
        await Input.dispatchMouseEvent({
            type: "mouseMoved",
            x: element.centerX,
            y: element.centerY
        });
        
        // 按下
        await Input.dispatchMouseEvent({
            type: "mousePressed",
            x: element.centerX,
            y: element.centerY,
            button: "left",
            clickCount: 1
        });
        
        // 释放
        await Input.dispatchMouseEvent({
            type: "mouseReleased",
            x: element.centerX,
            y: element.centerY,
            button: "left",
            clickCount: 1
        });
        
        log.info("Click executed");
        return true;
    }
    
    /**
     * 输入文本
     */
    async typeText(selector, text) {
        log.info(`Typing text into: ${selector}`);
        
        // 先点击元素
        await this.clickElement(selector);
        
        // 输入文本
        const { Input } = this.client;
        await Input.enable();
        
        for (const char of text) {
            await Input.dispatchKeyEvent({
                type: "char",
                text: char
            });
        }
        
        log.info("Text input complete");
        return true;
    }
    
    /**
     * 截图
     */
    async screenshot(outputPath) {
        log.info("Taking screenshot...");
        
        const result = await this.page.captureScreenshot({
            format: "png",
            fromSurface: true
        });
        
        const fs = require("fs");
        fs.writeFileSync(outputPath, Buffer.from(result.data, "base64"));
        
        log.info(`Screenshot saved: ${outputPath}`);
        return outputPath;
    }
    
    /**
     * 等待元素出现
     */
    async waitForElement(selector, timeout = 10000) {
        log.info(`Waiting for element: ${selector}`);
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = await this.findElement(selector);
            
            if (element && element.visible) {
                log.info("Element found");
                return element;
            }
            
            await new Promise(r => setTimeout(r, 100));
        }
        
        throw new Error(`Timeout waiting for element: ${selector}`);
    }
    
    /**
     * 获取页面源代码
     */
    async getPageSource() {
        return await this.executeScript("document.documentElement.outerHTML");
    }
    
    /**
     * 滚动页面
     */
    async scroll(x, y) {
        await this.executeScript(`window.scrollTo(${x}, ${y})`);
    }
    
    /**
     * 关闭浏览器
     */
    async close() {
        log.info("Closing browser...");
        
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
        
        this.isConnected = false;
        log.info("Browser closed");
        
        this.emit("disconnected");
    }
}

module.exports = { OxygenBrowser, BrowserConfig };
