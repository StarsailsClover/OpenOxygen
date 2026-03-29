/**
 * OpenOxygen �?OxygenBrowser OUV Integration (26w15aD Phase 4)
 *
 * 视觉辅助定位
 * OUV + UIA 双重定位
 */
import { OxygenUltraVision } from "../execution/vision/index.js";
export interface VisualElement {
    id: string;
    type: string;
    text?: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
    selector?: string;
}
export declare class OUVBrowserIntegration {
    ouv: OxygenUltraVision;
    browserId: string;
    constructor(browserId: string);
    /**
     * Analyze current page
     * Takes screenshot and analyzes with OUV
     */
    analyzePage(): Promise<{
        elements: VisualElement[];
        screenshot: string;
    }>;
    /**
     * Take screenshot
     */
    private takeScreenshot;
    /**
     * Find element by visual description
     * @param description - Visual description (e.g., "blue button with 'Submit' text")
     */
    findElementByVisual(description: string): Promise<VisualElement | null>;
    /**
     * Click element by visual description
     * @param description - Visual description
     */
    clickByVisual(description: string): Promise<boolean>;
    /**
     * Input text to element by visual description
     * @param description - Visual description
     * @param text - Text to input
     */
    inputByVisual(description: string, text: string): Promise<boolean>;
    /**
     * Wait for element to appear visually
     * @param description - Visual description
     * @param timeoutMs - Timeout
     */
    waitForElementVisual(description: string, timeoutMs?: number): Promise<boolean>;
    /**
     * Get element text by visual description
     * @param description - Visual description
     */
    getElementTextVisual(description: string): Promise<string | null>;
}
declare const _default: {
    OUVBrowserIntegration: typeof OUVBrowserIntegration;
};
export default _default;
//# sourceMappingURL=ouv-integration.d.ts.map
