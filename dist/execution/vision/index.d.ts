/**
 * OpenOxygen — OxygenUltraVision v2
 *
 * 三层视觉感知架构：
 * 1. UI Automation (精确层) — Rust native Win32 UIA，标准控件 100% 准确
 * 2. 图像处理 (快速层) — Rust native Sobel/连通域/模板匹配
 * 3. 视觉大模型 (理解层) — 通过推理引擎调用 LLM，语义级屏幕理解
 *
 * 三层结果融合为统一的 ScreenAnalysis，供 Agent 决策使用。
 */
import type { VisionConfig } from "../../types/index.js";
import type { InferenceEngine } from "../../inference/engine/index.js";
export type UIElement = {
    id: string;
    type: "button" | "input" | "text" | "image" | "link" | "menu" | "window" | "icon" | "toolbar" | "panel" | "checkbox" | "list" | "tab" | "unknown";
    label: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
    interactable: boolean;
    source: "uia" | "vision" | "llm";
    attributes?: Record<string, string>;
};
export type ScreenAnalysis = {
    id: string;
    timestamp: number;
    screenshotPath: string;
    elements: UIElement[];
    activeWindow?: {
        title: string;
        className: string;
        bounds: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
    description: string;
    durationMs: number;
    layers: {
        uia: number;
        vision: number;
        llm: number;
    };
};
export type VisionQuery = {
    instruction: string;
    screenshotPath?: string;
    targetElement?: string;
    mode?: "fast" | "precise" | "full";
};
export type VisionResult = {
    analysis: ScreenAnalysis;
    targetElement?: UIElement;
    suggestedAction?: {
        type: "click" | "type" | "scroll" | "drag" | "wait" | "none";
        params: Record<string, unknown>;
    };
};
export declare class OxygenUltraVision {
    private config;
    private inferenceEngine?;
    private native;
    private captureInterval;
    private latestAnalysis;
    constructor(config: VisionConfig, inferenceEngine?: InferenceEngine);
    private tryLoadNative;
    updateConfig(config: VisionConfig): void;
    setInferenceEngine(engine: InferenceEngine): void;
    /**
     * 核心分析方法 — 三层融合。
     *
     * mode:
     *   "fast"    → UIA only (< 50ms)
     *   "precise" → UIA + 图像处理 (< 200ms)
     *   "full"    → UIA + 图像处理 + LLM (取决于模型)
     */
    analyze(query: VisionQuery): Promise<VisionResult>;
    private getUiaElements;
    private runImageProcessing;
    private runLlmAnalysis;
    private captureScreen;
    private findElement;
    private suggestAction;
    startMonitoring(intervalMs?: number): void;
    stopMonitoring(): void;
    getLatestAnalysis(): ScreenAnalysis | null;
}
//# sourceMappingURL=index.d.ts.map