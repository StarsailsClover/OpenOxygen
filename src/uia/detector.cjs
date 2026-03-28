/**
 * OpenOxygen UIA Element Detector
 * 
 * 基于 Windows UIA (UI Automation) 的元素定位
 */

// 简化的日志实现
const log = {
    info: (...args) => console.log("[UIA]", ...args),
    warn: (...args) => console.warn("[UIA]", ...args),
    error: (...args) => console.error("[UIA]", ...args),
    debug: (...args) => console.debug("[UIA]", ...args)
};

// 加载原生模块
let native;
try {
    native = require("../native/build/Release/openoxygen_native.node");
    log.info("UIA native module loaded");
} catch (e) {
    log.warn("Failed to load native module:", e.message);
}

class UIAElementDetector {
    async findElement(selector) {
        log.info(`Finding element by ${selector.type}: ${selector.value}`);
        
        return {
            automationId: selector.value,
            name: "Mock Element",
            controlType: "Button",
            className: "WindowsForms10.BUTTON",
            bounds: { x: 100, y: 200, width: 80, height: 30 },
            center: { x: 140, y: 215 },
            isEnabled: true,
            isOffscreen: false,
            hasKeyboardFocus: false
        };
    }
    
    async clickElement(element) {
        log.info(`Clicking element: ${element.name}`);
        if (native?.mouseMove && native?.mouseClick) {
            native.mouseMove(element.center.x, element.center.y);
            native.mouseClick(0);
            return true;
        }
        return false;
    }
}

module.exports = { UIAElementDetector };
