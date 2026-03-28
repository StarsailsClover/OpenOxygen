/**
 * OpenOxygen Global Hotkey Manager
 * 
 * 系统级全局快捷键管理
 */

const { GlobalKeyboardListener } = require("node-global-key-listener");
const { EventEmitter } = require("events");

const log = {
    info: (...args) => console.log("[Hotkey]", ...args),
    warn: (...args) => console.warn("[Hotkey]", ...args),
    error: (...args) => console.error("[Hotkey]", ...args)
};

/**
 * 快捷键管理器
 */
class GlobalHotkeyManager extends EventEmitter {
    constructor() {
        super();
        
        this.keyboardListener = null;
        this.hotkeys = new Map();
        this.isListening = false;
        
        // 修饰键状态
        this.modifiers = {
            ctrl: false,
            alt: false,
            shift: false,
            meta: false
        };
    }
    
    /**
     * 初始化
     */
    initialize() {
        log.info("Initializing global hotkey manager");
        
        try {
            this.keyboardListener = new GlobalKeyboardListener();
            
            // 监听按键
            this.keyboardListener.addListener((e, down) => {
                this.handleKeyEvent(e, down);
            });
            
            this.isListening = true;
            log.info("Global hotkey manager initialized");
            
        } catch (error) {
            log.error("Failed to initialize hotkey manager:", error);
            throw error;
        }
    }
    
    /**
     * 处理按键事件
     */
    handleKeyEvent(e, down) {
        // 更新修饰键状态
        if (e.name === "LEFT CTRL" || e.name === "RIGHT CTRL") {
            this.modifiers.ctrl = down;
        }
        if (e.name === "LEFT ALT" || e.name === "RIGHT ALT") {
            this.modifiers.alt = down;
        }
        if (e.name === "LEFT SHIFT" || e.name === "RIGHT SHIFT") {
            this.modifiers.shift = down;
        }
        if (e.name === "LEFT META" || e.name === "RIGHT META") {
            this.modifiers.meta = down;
        }
        
        // 检查快捷键
        if (down) {
            this.checkHotkeys(e);
        }
    }
    
    /**
     * 检查快捷键
     */
    checkHotkeys(e) {
        const keyCombo = this.buildKeyCombo(e);
        
        for (const [id, hotkey] of this.hotkeys) {
            if (this.matchesHotkey(keyCombo, hotkey.combo)) {
                log.info(`Hotkey triggered: ${hotkey.name} (${keyCombo})`);
                
                this.emit("hotkey", id, hotkey);
                
                if (hotkey.callback) {
                    try {
                        hotkey.callback();
                    } catch (error) {
                        log.error(`Hotkey callback error: ${hotkey.name}`, error);
                    }
                }
                
                break;
            }
        }
    }
    
    /**
     * 构建按键组合字符串
     */
    buildKeyCombo(e) {
        const parts = [];
        
        if (this.modifiers.ctrl) parts.push("Ctrl");
        if (this.modifiers.alt) parts.push("Alt");
        if (this.modifiers.shift) parts.push("Shift");
        if (this.modifiers.meta) parts.push("Win");
        
        // 转换键名
        let keyName = e.name;
        if (keyName.startsWith("LEFT ") || keyName.startsWith("RIGHT ")) {
            keyName = keyName.substring(5);
        }
        
        parts.push(keyName);
        
        return parts.join("+");
    }
    
    /**
     * 匹配快捷键
     */
    matchesHotkey(pressed, registered) {
        // 简化匹配
        return pressed.toLowerCase() === registered.toLowerCase();
    }
    
    /**
     * 注册快捷键
     */
    register(id, combo, callback, options = {}) {
        log.info(`Registering hotkey: ${id} -> ${combo}`);
        
        this.hotkeys.set(id, {
            id,
            name: options.name || id,
            combo,
            callback,
            description: options.description || "",
            enabled: options.enabled !== false
        });
        
        this.emit("hotkeyRegistered", id, combo);
        
        return true;
    }
    
    /**
     * 注销快捷键
     */
    unregister(id) {
        log.info(`Unregistering hotkey: ${id}`);
        
        const deleted = this.hotkeys.delete(id);
        
        if (deleted) {
            this.emit("hotkeyUnregistered", id);
        }
        
        return deleted;
    }
    
    /**
     * 启用快捷键
     */
    enable(id) {
        const hotkey = this.hotkeys.get(id);
        if (hotkey) {
            hotkey.enabled = true;
            log.info(`Hotkey enabled: ${id}`);
        }
    }
    
    /**
     * 禁用快捷键
     */
    disable(id) {
        const hotkey = this.hotkeys.get(id);
        if (hotkey) {
            hotkey.enabled = false;
            log.info(`Hotkey disabled: ${id}`);
        }
    }
    
    /**
     * 注册默认快捷键
     */
    registerDefaults() {
        log.info("Registering default hotkeys");
        
        // 显示/隐藏主窗口
        this.register("toggle-window", "Ctrl+Alt+O", () => {
            this.emit("toggleWindow");
        }, {
            name: "Toggle Window",
            description: "显示或隐藏主窗口"
        });
        
        // 开始/停止录制
        this.register("toggle-recording", "Ctrl+Alt+R", () => {
            this.emit("toggleRecording");
        }, {
            name: "Toggle Recording",
            description: "开始或停止录制"
        });
        
        // 执行最后一个任务
        this.register("repeat-last", "Ctrl+Alt+L", () => {
            this.emit("repeatLastTask");
        }, {
            name: "Repeat Last Task",
            description: "重复执行最后一个任务"
        });
        
        // 紧急停止
        this.register("emergency-stop", "Ctrl+Alt+Escape", () => {
            this.emit("emergencyStop");
        }, {
            name: "Emergency Stop",
            description: "紧急停止所有任务"
        });
        
        // 截图
        this.register("capture-screen", "Ctrl+Alt+S", () => {
            this.emit("captureScreen");
        }, {
            name: "Capture Screen",
            description: "截取屏幕"
        });
    }
    
    /**
     * 获取所有快捷键
     */
    getAllHotkeys() {
        return Array.from(this.hotkeys.values());
    }
    
    /**
     * 销毁
     */
    destroy() {
        log.info("Destroying hotkey manager");
        
        if (this.keyboardListener) {
            this.keyboardListener.kill();
        }
        
        this.hotkeys.clear();
        this.isListening = false;
        
        this.removeAllListeners();
    }
}

module.exports = { GlobalHotkeyManager };
