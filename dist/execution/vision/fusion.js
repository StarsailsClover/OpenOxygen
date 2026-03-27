/**
 * OpenOxygen — Vision-Language Fusion Pipeline (26w11aE_P3)
 *
 * 整合 OxygenUltraVision + qwen3-vl:4b 的完整视觉理解管道
 */
import { createSubsystemLogger } from "../../logging/index.js";
import { generateId, nowMs } from "../../utils/index.js";
const log = createSubsystemLogger("vision/fusion");
// ═══════════════════════════════════════════════════════════════════════════
// Vision-Language Fusion Engine
// ═══════════════════════════════════════════════════════════════════════════
export class VisionLanguageFusion {
    inferenceEngine;
    native = null;
    screenshotDir;
    constructor(inferenceEngine, screenshotDir = "D:\\Coding\\OpenOxygen\\.state\\screenshots") {
        this.inferenceEngine = inferenceEngine;
        this.screenshotDir = screenshotDir;
        this.loadNative();
    }
    loadNative() {
        try {
            const { loadNativeModule } = require("../../native-bridge.js");
            this.native = loadNativeModule();
        }
        catch {
            log.warn("Native module not available for vision fusion");
        }
    }
    /**
     * 执行视觉-语言融合分析
     */
    async analyze(params) {
        const startTime = nowMs();
        const mode = params.mode ?? "fast";
        // 1. 获取截图
        const screenshotPath = params.screenshotPath ?? await this.captureScreenshot();
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
        try {
            const elements = this.native.getUiElements(null);
            return elements
                .filter((e) => e.name && !e.isOffscreen)
                .map((e, idx) => ({
                id: e.automationId || `elem_${idx}`,
                type: e.controlType,
                label: e.name,
                bounds: { x: e.x, y: e.y, width: e.width, height: e.height },
                confidence: e.isEnabled ? 1.0 : 0.5,
            }));
        }
        catch {
            return [];
        }
    }
    /**
     * 压缩图像
     */
    compressImage(screenshotPath) {
        if (!this.native) {
            return { base64: "", width: 0, height: 0 };
        }
        try {
            const compressed = this.native.compressScreenshot(screenshotPath, 896, 85);
            const base64 = this.native.imageToBase64(compressed.data);
            return {
                base64,
                width: compressed.compressedWidth,
                height: compressed.compressedHeight,
            };
        }
        catch {
            return { base64: "", width: 0, height: 0 };
        }
    }
    /**
     * 构建多模态提示
     */
    buildMultimodalPrompt(instruction, elements, compressed) {
        const parts = [];
        // 图像标记
        if (compressed.base64) {
            parts.push(`[IMAGE: ${compressed.width}x${compressed.height}]`);
        }
        // UI 元素列表
        if (elements.length > 0) {
            parts.push("\nUI Elements:");
            for (const elem of elements.slice(0, 30)) {
                parts.push(`  [${elem.type}] "${elem.label}" at (${elem.bounds.x},${elem.bounds.y})`);
            }
        }
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
            if (responseLower.includes(labelLower) || responseLower.includes(elem.id.toLowerCase())) {
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
            const target = grounding.find(g => g.elementType === "Edit" || g.elementType === "input");
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
                },
            };
        }
        return undefined;
    }
}
//# sourceMappingURL=fusion.js.map