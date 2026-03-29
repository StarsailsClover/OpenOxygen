/**
 * OpenOxygen UIA Element Detector
 *
 * 基于 Windows UIA (UI Automation) 的元素定�?
 */

import { createSubsystemLogger } from "../logging/index.js";

const log = createSubsystemLogger("uia/detector");

// 加载原生模块
let native: any;
try {
  native = require("../../native/build/Release/openoxygen_native.node");
  log.info("UIA native module loaded");
} catch (e) {
  log.warn("Failed to load native module:", e);
}

export interface UIAElement {
  automationId: string;
  name: string;
  controlType: string;
  className: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center: {
    x: number;
    y: number;
  };
  isEnabled: boolean;
  isOffscreen: boolean;
  hasKeyboardFocus: boolean;
}

export interface ElementSelector {
  type:
    | "automationId"
    | "name"
    | "className"
    | "controlType"
    | "text"
    | "xpath";
  value: string;
  partial?: boolean;
}

export class UIAElementDetector {
  /**
   * 查找元素
   */
  async findElement(selector: ElementSelector): Promise<UIAElement | null> {
    log.info(`Finding element by ${selector.type}: ${selector.value}`);

    // TODO: 调用 C++ UIA API
    // 临时返回模拟数据
    const mockElement: UIAElement = {
      automationId: selector.value,
      name: "Mock Element",
      controlType: "Button",
      className: "WindowsForms10.BUTTON.app.0.141b42a_r8_ad1",
      bounds: { x: 100, y: 200, width: 80, height: 30 },
      center: { x: 140, y: 215 },
      isEnabled: true,
      isOffscreen: false,
      hasKeyboardFocus: false,
    };

    return mockElement;
  }

  /**
   * 查找多个元素
   */
  async findElements(selector: ElementSelector): Promise<UIAElement[]> {
    log.info(`Finding elements by ${selector.type}: ${selector.value}`);

    // 返回模拟数据
    return [
      {
        automationId: "btn1",
        name: "Button 1",
        controlType: "Button",
        className: "Button",
        bounds: { x: 100, y: 200, width: 80, height: 30 },
        center: { x: 140, y: 215 },
        isEnabled: true,
        isOffscreen: false,
        hasKeyboardFocus: false,
      },
      {
        automationId: "btn2",
        name: "Button 2",
        controlType: "Button",
        className: "Button",
        bounds: { x: 200, y: 200, width: 80, height: 30 },
        center: { x: 240, y: 215 },
        isEnabled: true,
        isOffscreen: false,
        hasKeyboardFocus: false,
      },
    ];
  }

  /**
   * 获取焦点元素
   */
  async getFocusedElement(): Promise<UIAElement | null> {
    log.info("Getting focused element");

    return {
      automationId: "focused",
      name: "Focused Element",
      controlType: "Edit",
      className: "Edit",
      bounds: { x: 300, y: 400, width: 200, height: 25 },
      center: { x: 400, y: 412 },
      isEnabled: true,
      isOffscreen: false,
      hasKeyboardFocus: true,
    };
  }

  /**
   * 获取元素文本
   */
  async getElementText(element: UIAElement): Promise<string> {
    log.info(`Getting text for element: ${element.name}`);
    return element.name;
  }

  /**
   * 点击元素
   */
  async clickElement(element: UIAElement): Promise<boolean> {
    log.info(
      `Clicking element: ${element.name} at (${element.center.x}, ${element.center.y})`,
    );

    if (native?.mouseMove && native?.mouseClick) {
      native.mouseMove(element.center.x, element.center.y);
      native.mouseClick(0); // 左键
      return true;
    }

    return false;
  }

  /**
   * 输入文本到元�?
   */
  async typeText(element: UIAElement, text: string): Promise<boolean> {
    log.info(`Typing text to element: ${element.name}`);

    // 先点击元素获取焦�?
    await this.clickElement(element);

    if (native?.typeText) {
      native.typeText(text);
      return true;
    }

    return false;
  }

  /**
   * 滚动到元�?
   */
  async scrollToElement(element: UIAElement): Promise<boolean> {
    log.info(`Scrolling to element: ${element.name}`);
    // TODO: 实现滚动逻辑
    return true;
  }

  /**
   * 等待元素出现
   */
  async waitForElement(
    selector: ElementSelector,
    timeoutMs: number = 5000,
  ): Promise<UIAElement | null> {
    log.info(
      `Waiting for element: ${selector.value} (timeout: ${timeoutMs}ms)`,
    );

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const element = await this.findElement(selector);
      if (element) {
        return element;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return null;
  }
}

export default UIAElementDetector;
