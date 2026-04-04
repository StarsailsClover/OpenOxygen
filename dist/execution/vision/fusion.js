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
<<<<<<< HEAD
        const mode = params.mode ?? "fast";
        // 1. 获取截图
        const screenshotPath = params.screenshotPath ?? (await this.captureScreenshot());
        // 2. 获取 UI 元素（UIA）
        const uiaElements = this.getUIAElements();
        // 3. 压缩图像
        const compressed = this.compressImage(screenshotPath);
        // 4. 构建多模态提示
        const prompt = this.buildMultimodalPrompt(params.instruction, uiaElements, compressed);
        // 5. 调用视觉模型
        const response = await this.callVisionModel(prompt, mode);
        // 6. 解析视觉定位结果
        const grounding = this.parseGrounding(response.content, uiaElements);
        // 7. 构建结果
        const result = {
            id: generateId("vlf"),
            timestamp: nowMs(),
            description: response.content,
            elements: grounding,
            suggestedAction: this.inferAction(params.instruction, grounding),
            rawResponse: response.content,
            latencyMs: nowMs() - startTime,
        };
        log.info(`Vision-Language fusion completed in ${result.latencyMs}ms, found ${grounding.length} elements`);
        return result;
    }
    /**
     * 捕获屏幕截图
     */
    async captureScreenshot() {
        if (!this.native) {
            throw new Error("Native module required for screenshot");
        }
        const fs = await import("node:fs");
        const path = await import("node:path");
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
        const filename = `fusion_${Date.now()}.png`;
        const filepath = path.join(this.screenshotDir, filename);
        const result = this.native.captureScreen(filepath);
        if (!result.success) {
            throw new Error(`Screenshot failed: ${result.error}`);
        }
        return filepath;
    }
    /**
     * 获取 UI Automation 元素
     */
    getUIAElements() {
        if (!this.native)
            return [];
=======
        const mode = options.mode || "balanced";
        log.info(`Analyzing screenshot: mode=${mode}`);
        // Build prompt based on mode
        const prompt = this.buildPrompt(mode, options.instruction, options.previousActions);
>>>>>>> dev
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
<<<<<<< HEAD
        // 用户指令
        parts.push(`\nInstruction: ${instruction}`);
        parts.push("\nRespond with: 1) Description of what you see, 2) Target element ID if applicable");
        return parts.join("\n");
    }
    /**
     * 调用视觉模型
     */
    async callVisionModel(prompt, mode) {
        const messages = [
            {
                role: "user",
                content: prompt,
            },
        ];
        return this.inferenceEngine.infer({
            messages,
            model: { provider: "ollama", model: "qwen3-vl:4b" },
            mode: mode === "full" ? "deep" : mode === "precise" ? "balanced" : "fast",
        });
    }
    /**
     * 解析视觉定位结果
     */
    parseGrounding(response, elements) {
        const results = [];
        // 简单启发式：查找元素 ID 或标签匹配
        for (const elem of elements) {
            const labelLower = elem.label.toLowerCase();
            const responseLower = response.toLowerCase();
            // 检查响应中是否提到该元素
            if (responseLower.includes(labelLower) ||
                responseLower.includes(elem.id.toLowerCase())) {
                results.push({
                    elementId: elem.id,
                    elementType: elem.type,
                    label: elem.label,
                    bounds: elem.bounds,
                    confidence: elem.confidence,
                    clickCoordinates: {
                        x: elem.bounds.x + elem.bounds.width / 2,
                        y: elem.bounds.y + elem.bounds.height / 2,
                    },
                });
            }
        }
        return results;
    }
    /**
     * 推断建议动作
     */
    inferAction(instruction, grounding) {
        const lower = instruction.toLowerCase();
        // 点击操作
        if (/click|press|tap|点击/.test(lower)) {
            const target = grounding[0];
            if (target) {
                return {
                    type: "click",
                    target,
                    params: {
                        x: target.clickCoordinates.x,
                        y: target.clickCoordinates.y,
                    },
                };
            }
        }
        // 输入操作
        if (/type|input|enter|输入/.test(lower)) {
            const target = grounding.find((g) => g.elementType === "Edit" || g.elementType === "input");
            if (target) {
                return {
                    type: "type",
                    target,
                    params: {
                        x: target.clickCoordinates.x,
                        y: target.clickCoordinates.y,
                        text: instruction.replace(/type|input|enter|输入/gi, "").trim(),
                    },
                };
            }
        }
        // 滚动操作
        if (/scroll|滚动/.test(lower)) {
            return {
                type: "scroll",
                params: {
                    direction: lower.includes("down") || lower.includes("下") ? "down" : "up",
                    amount: 3,
=======
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
>>>>>>> dev
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
