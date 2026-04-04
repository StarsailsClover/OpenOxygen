/**
 * OpenOxygen - Vision-Language Fusion Pipeline
 *
 * 整合 OxygenUltraVision + qwen3-vl:4b 的完整视觉理解管线
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("vision/fusion");
// === Vision-Language Fusion Engine ===
export class VisionLanguageFusion {
    inferenceEngine;
    screenshotDir;
    constructor(inferenceEngine, screenshotDir = "./.state/screenshots") {
        this.inferenceEngine = inferenceEngine;
        this.screenshotDir = screenshotDir;
        log.info("VisionLanguageFusion initialized");
    }
    /**
     * Analyze screenshot with VLM
     */
    async analyze(screenshotBase64, options = {}) {
        const startTime = nowMs();
        const mode = options.mode || "balanced";
        log.info(`Analyzing screenshot: mode=${mode}`);
        // Build prompt based on mode
        const prompt = this.buildPrompt(mode, options.instruction, options.previousActions);
        try {
            // Call VLM via inference engine
            const response = await this.inferenceEngine.infer({
                messages: [
                    {
                        role: "system",
                        content: "You are a UI automation assistant. Analyze the screenshot and provide structured output.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                mode: mode === "fast" ? "fast" : "balanced",
            });
            // Parse VLM response
            const parsed = this.parseResponse(response.content);
            return {
                id: generateId("vlm"),
                timestamp: nowMs(),
                description: parsed.description,
                elements: parsed.elements,
                suggestedAction: parsed.suggestedAction,
                rawResponse: response.content,
                latencyMs: nowMs() - startTime,
            };
        }
        catch (error) {
            log.error(`Vision analysis failed: ${error}`);
            throw error;
        }
    }
    /**
     * Build analysis prompt
     */
    buildPrompt(mode, instruction, previousActions) {
        let prompt = "Analyze this screenshot and provide a structured response.\n\n";
        if (instruction) {
            prompt += `User instruction: ${instruction}\n\n`;
        }
        if (previousActions && previousActions.length > 0) {
            prompt += `Previous actions:\n${previousActions.map(a => `- ${a}`).join("\n")}\n\n`;
        }
        prompt += "Provide output in this JSON format:\n";
        prompt += JSON.stringify({
            description: "Brief description of the current screen state",
            elements: [
                {
                    elementId: "unique-id",
                    elementType: "button|input|link|text|image|other",
                    label: "Visible text or description",
                    bounds: { x: 0, y: 0, width: 100, height: 30 },
                    confidence: 0.95,
                    clickCoordinates: { x: 50, y: 15 },
                },
            ],
            suggestedAction: {
                type: "click|type|scroll|wait",
                target: { elementId: "target-id" },
                params: { text: "if typing" },
            },
        }, null, 2);
        if (mode === "precise" || mode === "full") {
            prompt += "\n\nBe precise with coordinates. Include all interactive elements.";
        }
        return prompt;
    }
    /**
     * Parse VLM response
     */
    parseResponse(content) {
        try {
            // Try to extract JSON from response
            const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ||
                content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                return {
                    description: parsed.description || "No description provided",
                    elements: (parsed.elements || []).map((e) => ({
                        elementId: e.elementId || generateId("elem"),
                        elementType: e.elementType || "unknown",
                        label: e.label || "",
                        bounds: e.bounds || { x: 0, y: 0, width: 0, height: 0 },
                        confidence: e.confidence || 0.5,
                        clickCoordinates: e.clickCoordinates || {
                            x: (e.bounds?.x || 0) + (e.bounds?.width || 0) / 2,
                            y: (e.bounds?.y || 0) + (e.bounds?.height || 0) / 2,
                        },
                    })),
                    suggestedAction: parsed.suggestedAction,
                };
            }
        }
        catch (error) {
            log.warn(`Failed to parse JSON response: ${error}`);
        }
        // Fallback: return raw content as description
        return {
            description: content.slice(0, 500),
            elements: [],
        };
    }
    /**
     * Find element by description
     */
    async findElement(screenshotBase64, description) {
        const analysis = await this.analyze(screenshotBase64, {
            instruction: `Find the element: ${description}`,
            mode: "precise",
        });
        // Find best matching element
        const match = analysis.elements.find(e => e.label.toLowerCase().includes(description.toLowerCase()) ||
            description.toLowerCase().includes(e.label.toLowerCase()));
        return match || null;
    }
    /**
     * Wait for element to appear
     */
    async waitForElement(screenshotProvider, description, options = {}) {
        const timeout = options.timeout || 30000;
        const interval = options.interval || 1000;
        const startTime = nowMs();
        while (nowMs() - startTime < timeout) {
            const screenshot = await screenshotProvider();
            const element = await this.findElement(screenshot, description);
            if (element) {
                return element;
            }
            await new Promise(r => setTimeout(r, interval));
        }
        return null;
    }
}
// === Factory ===
export function createVisionLanguageFusion(inferenceEngine, screenshotDir) {
    return new VisionLanguageFusion(inferenceEngine, screenshotDir);
}
// === Exports ===
export default VisionLanguageFusion;
