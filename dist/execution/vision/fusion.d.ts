/**
 * OpenOxygen �?Vision-Language Fusion Pipeline (26w11aE_P3)
 *
 * 整合 OxygenUltraVision + qwen3-vl:4b 的完整视觉理解管�? */
import type { InferenceEngine } from "../../inference/engine/index.js";
export type FusionMode = "fast" | "precise" | "full";
export type VisualGroundingResult = {
    elementId: string;
    elementType: string;
    label: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
    clickCoordinates: {
        x: number;
        y: number;
    };
};
export type VisionLanguageResult = {
    id: string;
    timestamp: number;
    description: string;
    elements: VisualGroundingResult[];
    suggestedAction?: {
        type: "click" | "type" | "scroll" | "wait";
        target?: VisualGroundingResult;
        params: Record<string, unknown>;
    };
    rawResponse: string;
    latencyMs: number;
};
export declare class VisionLanguageFusion {
    private inferenceEngine;
    private native;
    private screenshotDir;
    constructor(inferenceEngine: InferenceEngine, screenshotDir?: string);
    private loadNative;
    /**
     * 执行视觉-语言融合分析
     */
    analyze(params: {
        instruction: string;
        mode?: FusionMode;
        screenshotPath?: string;
        context?: string;
    }): Promise<VisionLanguageResult>;
    /**
     * 捕获屏幕截图
     */
    private captureScreenshot;
    /**
     * 获取 UI Automation 元素
     */
    private getUIAElements;
    /**
     * 压缩图像
     */
    private compressImage;
    /**
     * 构建多模态提�?     */
    private buildMultimodalPrompt;
    /**
     * 调用视觉模型
     */
    private callVisionModel;
    /**
     * 解析视觉定位结果
     */
    private parseGrounding;
    /**
     * 推断建议动作
     */
    private inferAction;
}
//# sourceMappingURL=fusion.d.ts.map
