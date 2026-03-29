/**
 * OpenOxygen — OxygenBrowser OUV Integration (26w15aD Phase 4)
 *
 * 视觉辅助定位
 * OUV + UIA 双重定位
 */

import { createSubsystemLogger } from "../logging/index.js";
import { OxygenUltraVision } from "../execution/vision/index.js";
import { takeScreenshotCDP, executeScriptCDP } from "./cdp.js";

const log = createSubsystemLogger("oxygen-browser/ouv");

// Visual element info
export interface VisualElement {
  id: string;
  type: string;
  text?: string;
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
  selector?: string; // CSS selector if available
}

// OUV Browser integration
export class OUVBrowserIntegration {
  ouv: OxygenUltraVision;
  browserId: string;

  constructor(browserId: string) {
    this.browserId = browserId;
    this.ouv = new OxygenUltraVision();
  }

  /**
   * Analyze current page
   * Takes screenshot and analyzes with OUV
   */
  async analyzePage(): Promise<{
    elements: VisualElement[];
    screenshot: string;
  }> {
    log.info("Analyzing page with OUV");

    // Take screenshot
    const screenshot = await this.takeScreenshot();

    // Analyze with OUV
    const analysis = await this.ouv.analyzeScreen({
      instruction: "Identify all interactive elements on the page",
    });

    // Convert OUV elements to VisualElement format
    const elements: VisualElement[] = (analysis.elements || []).map(
      (el: any) => ({
        id: el.id || `el_${Math.random().toString(36).substr(2, 9)}`,
        type: el.type || "unknown",
        text: el.text,
        bounds: el.bounds || { x: 0, y: 0, width: 0, height: 0 },
        confidence: el.confidence || 0.5,
      }),
    );

    log.info(`Found ${elements.length} visual elements`);

    return { elements, screenshot };
  }

  /**
   * Take screenshot
   */
  private async takeScreenshot(): Promise<string> {
    // Use CDP to take screenshot
    // This is a simplified implementation
    return ""; // Placeholder
  }

  /**
   * Find element by visual description
   * @param description - Visual description (e.g., "blue button with 'Submit' text")
   */
  async findElementByVisual(
    description: string,
  ): Promise<VisualElement | null> {
    log.info(`Finding element by visual: ${description}`);

    const { elements } = await this.analyzePage();

    // Use OUV to match description
    const match = await this.ouv.analyzeScreen({
      instruction: `Find element matching: ${description}`,
    });

    if (match.elements && match.elements.length > 0) {
      const bestMatch = match.elements[0];
      return {
        id: bestMatch.id,
        type: bestMatch.type,
        text: bestMatch.text,
        bounds: bestMatch.bounds,
        confidence: bestMatch.confidence,
      };
    }

    return null;
  }

  /**
   * Click element by visual description
   * @param description - Visual description
   */
  async clickByVisual(description: string): Promise<boolean> {
    log.info(`Clicking by visual: ${description}`);

    const element = await this.findElementByVisual(description);
    if (!element) {
      log.warn(`Element not found: ${description}`);
      return false;
    }

    // Calculate click position (center of element)
    const x = element.bounds.x + element.bounds.width / 2;
    const y = element.bounds.y + element.bounds.height / 2;

    // Use native mouse control
    const { mouseMove, mouseClick } = require("../native/mouse.js");

    mouseMove(x, y);
    await sleep(50);
    mouseClick("LEFT");

    log.info(`Clicked at (${x}, ${y})`);
    return true;
  }

  /**
   * Input text to element by visual description
   * @param description - Visual description
   * @param text - Text to input
   */
  async inputByVisual(description: string, text: string): Promise<boolean> {
    log.info(`Inputting text to: ${description}`);

    // Click element first
    const clicked = await this.clickByVisual(description);
    if (!clicked) {
      return false;
    }

    await sleep(100);

    // Type text
    const { typeText } = require("../native/keyboard.js");
    typeText(text);

    return true;
  }

  /**
   * Wait for element to appear visually
   * @param description - Visual description
   * @param timeoutMs - Timeout
   */
  async waitForElementVisual(
    description: string,
    timeoutMs: number = 5000,
  ): Promise<boolean> {
    log.info(`Waiting for element: ${description}`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const element = await this.findElementByVisual(description);
      if (element) {
        log.info(`Element appeared: ${description}`);
        return true;
      }

      await sleep(500);
    }

    log.warn(`Element did not appear: ${description}`);
    return false;
  }

  /**
   * Get element text by visual description
   * @param description - Visual description
   */
  async getElementTextVisual(description: string): Promise<string | null> {
    const element = await this.findElementByVisual(description);
    return element?.text || null;
  }
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export
export default {
  OUVBrowserIntegration,
};
