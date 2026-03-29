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

import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import type { VisionConfig } from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";
import type {
  InferenceEngine,
  ChatMessage,
} from "../../inference/engine/index.js";

const log = createSubsystemLogger("ouv");

// ─── Types ──────────────────────────────────────────────────────────────────

export type UIElement = {
  id: string;
  type:
    | "button"
    | "input"
    | "text"
    | "image"
    | "link"
    | "menu"
    | "window"
    | "icon"
    | "toolbar"
    | "panel"
    | "checkbox"
    | "list"
    | "tab"
    | "unknown";
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
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
    bounds: { x: number; y: number; width: number; height: number };
  };
  description: string;
  durationMs: number;
  layers: { uia: number; vision: number; llm: number };
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

// ─── Screenshot Manager ────────────────────────────────────────────────────

const SCREENSHOT_DIR = path.join(
  process.env["TEMP"] ?? "C:\\Temp",
  "openoxygen",
  "screenshots",
);

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

// ─── UIA Type Mapping ───────────────────────────────────────────────────────

function mapUiaControlType(controlType: string): UIElement["type"] {
  const mapping: Record<string, UIElement["type"]> = {
    Button: "button",
    SplitButton: "button",
    Edit: "input",
    ComboBox: "input",
    Text: "text",
    Document: "text",
    Image: "image",
    Hyperlink: "link",
    Menu: "menu",
    MenuItem: "menu",
    Window: "window",
    ToolBar: "toolbar",
    Tab: "tab",
    TabItem: "tab",
    CheckBox: "checkbox",
    RadioButton: "checkbox",
    List: "list",
    ListItem: "list",
    DataGrid: "list",
    Pane: "panel",
    Group: "panel",
  };
  return mapping[controlType] ?? "unknown";
}

// ─── OxygenUltraVision Engine ───────────────────────────────────────────────

export class OxygenUltraVision {
  private config: VisionConfig;
  private inferenceEngine?: InferenceEngine;
  private native: import("../../native-bridge.js").NativeModule | null = null;
  private captureInterval: ReturnType<typeof setInterval> | null = null;
  private latestAnalysis: ScreenAnalysis | null = null;

  constructor(config: VisionConfig, inferenceEngine?: InferenceEngine) {
    this.config = config;
    this.inferenceEngine = inferenceEngine;
    this.tryLoadNative();
  }

  private tryLoadNative(): void {
    try {
      const { loadNativeModule } =
        require("../../native-bridge.js") as typeof import("../../native-bridge.js");
      this.native = loadNativeModule();
    } catch {
      log.warn("Native module not available for OUV");
    }
  }

  updateConfig(config: VisionConfig): void {
    this.config = config;
  }

  setInferenceEngine(engine: InferenceEngine): void {
    this.inferenceEngine = engine;
  }

  /**
   * 核心分析方法 — 三层融合。
   *
   * mode:
   *   "fast"    → UIA only (< 50ms)
   *   "precise" → UIA + 图像处理 (< 200ms)
   *   "full"    → UIA + 图像处理 + LLM (取决于模型)
   */
  async analyze(query: VisionQuery): Promise<VisionResult> {
    const mode = query.mode ?? "fast";
    const startTime = nowMs();

    const analysis: ScreenAnalysis = {
      id: generateId("ouv"),
      timestamp: nowMs(),
      screenshotPath: "",
      elements: [],
      description: "",
      durationMs: 0,
      layers: { uia: 0, vision: 0, llm: 0 },
    };

    // ── Layer 1: UI Automation (always) ─────────────────────────
    const uiaStart = nowMs();
    const uiaElements = this.getUiaElements();
    analysis.layers.uia = uiaElements.length;
    analysis.elements.push(...uiaElements);

    // 获取前台窗口信息
    if (this.native) {
      const fg = this.native.getForegroundWindowInfo();
      if (fg) {
        analysis.activeWindow = {
          title: fg.title,
          className: fg.className,
          bounds: { x: fg.x, y: fg.y, width: fg.width, height: fg.height },
        };
      }
    }

    log.debug(`UIA: ${uiaElements.length} elements in ${nowMs() - uiaStart}ms`);

    // ── Layer 2: Image Processing (precise/full) ────────────────
    if (mode === "precise" || mode === "full") {
      const screenshotPath =
        query.screenshotPath ?? (await this.captureScreen());
      analysis.screenshotPath = screenshotPath;

      const visionStart = nowMs();
      const visionElements = await this.runImageProcessing(screenshotPath);
      analysis.layers.vision = visionElements.length;

      // 去重：如果 UIA 已经检测到同位置元素，跳过视觉检测结果
      for (const ve of visionElements) {
        const isDuplicate = analysis.elements.some(
          (e) =>
            Math.abs(e.bounds.x - ve.bounds.x) < 20 &&
            Math.abs(e.bounds.y - ve.bounds.y) < 20 &&
            Math.abs(e.bounds.width - ve.bounds.width) < 30,
        );
        if (!isDuplicate) {
          analysis.elements.push(ve);
        }
      }

      log.debug(
        `Vision: ${visionElements.length} regions in ${nowMs() - visionStart}ms`,
      );
    }

    // ── Layer 3: LLM Understanding (full only) ──────────────────
    if (mode === "full" && this.inferenceEngine) {
      if (!analysis.screenshotPath) {
        analysis.screenshotPath =
          query.screenshotPath ?? (await this.captureScreen());
      }

      const llmStart = nowMs();
      const llmDescription = await this.runLlmAnalysis(
        query.instruction,
        analysis.elements,
        analysis.activeWindow,
      );
      analysis.description = llmDescription;
      analysis.layers.llm = 1;

      log.debug(`LLM: description generated in ${nowMs() - llmStart}ms`);
    } else {
      analysis.description = `Screen analysis: ${analysis.elements.length} elements detected (${analysis.layers.uia} UIA, ${analysis.layers.vision} vision)`;
    }

    analysis.durationMs = nowMs() - startTime;
    this.latestAnalysis = analysis;

    // ── 查找目标元素 ────────────────────────────────────────────
    let targetElement: UIElement | undefined;
    if (query.targetElement) {
      targetElement = this.findElement(analysis.elements, query.targetElement);
    }

    const suggestedAction = this.suggestAction(
      query.instruction,
      targetElement,
    );

    log.info(
      `OUV [${mode}]: ${analysis.elements.length} elements, ${analysis.durationMs}ms`,
    );

    return { analysis, targetElement, suggestedAction };
  }

  // ─── Layer 1: UI Automation ───────────────────────────────────────────────

  private getUiaElements(): UIElement[] {
    if (!this.native) return [];

    try {
      const raw = this.native.getUiElements(null);
      return raw
        .filter(
          (e) =>
            e.name.length > 0 && !e.isOffscreen && e.width > 0 && e.height > 0,
        )
        .map((e) => ({
          id: generateId("uia"),
          type: mapUiaControlType(e.controlType),
          label: e.name,
          bounds: { x: e.x, y: e.y, width: e.width, height: e.height },
          confidence: 1.0,
          interactable: e.isEnabled && !e.isOffscreen,
          source: "uia" as const,
          attributes: {
            automationId: e.automationId,
            controlType: e.controlType,
            className: e.className,
          },
        }));
    } catch (err) {
      log.error("UIA failed:", err);
      return [];
    }
  }

  // ─── Layer 2: Image Processing ────────────────────────────────────────────

  private async runImageProcessing(
    screenshotPath: string,
  ): Promise<UIElement[]> {
    if (!this.native) return [];

    try {
      const edgePath = screenshotPath.replace(/\.png$/, "_edges.png");
      this.native.detectEdges(screenshotPath, edgePath);

      const regions = this.native.detectConnectedRegions(edgePath, 300, 80);

      // 清理临时边缘图
      fs.unlink(edgePath).catch(() => {});

      return regions.map((r) => ({
        id: generateId("vis"),
        type: (r.label as UIElement["type"]) || "unknown",
        label: `${r.label} (${r.width}×${r.height})`,
        bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
        confidence: 0.7,
        interactable:
          r.label === "button" || r.label === "input" || r.label === "icon",
        source: "vision" as const,
      }));
    } catch (err) {
      log.error("Image processing failed:", err);
      return [];
    }
  }

  // ─── Layer 3: LLM Analysis ────────────────────────────────────────────────

  private async runLlmAnalysis(
    instruction: string,
    elements: UIElement[],
    activeWindow?: ScreenAnalysis["activeWindow"],
  ): Promise<string> {
    if (!this.inferenceEngine) return "";

    const elementSummary = elements
      .slice(0, 50)
      .map(
        (e) =>
          `[${e.type}] "${e.label}" @ (${e.bounds.x},${e.bounds.y},${e.bounds.width}x${e.bounds.height}) ${e.interactable ? "✓" : "✗"}`,
      )
      .join("\n");

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `You are analyzing a Windows desktop screen.

Active window: ${activeWindow ? `"${activeWindow.title}" (${activeWindow.className})` : "unknown"}

Detected UI elements (${elements.length} total, showing top 50):
${elementSummary}

User instruction: ${instruction}

Describe what you see and suggest the best action to fulfill the instruction. Be concise.`,
      },
    ];

    try {
      const response = await this.inferenceEngine.infer({
        messages,
        mode: "fast",
        systemPrompt:
          "You are OxygenUltraVision, a screen analysis engine. Describe UI state concisely and suggest precise actions with coordinates.",
        temperature: 0.3,
      });
      return response.content;
    } catch (err) {
      log.error("LLM analysis failed:", err);
      return "";
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async captureScreen(): Promise<string> {
    await ensureDir(SCREENSHOT_DIR);
    const filename = `ouv_${Date.now()}.png`;
    const outputPath = path.join(SCREENSHOT_DIR, filename);

    if (this.native) {
      const result = this.native.captureScreen(outputPath);
      if (!result.success) throw new Error(`Capture failed: ${result.error}`);
    }
    return outputPath;
  }

  private findElement(
    elements: UIElement[],
    description: string,
  ): UIElement | undefined {
    const lower = description.toLowerCase();
    return (
      elements.find((e) => e.label.toLowerCase() === lower) ??
      elements.find((e) => e.label.toLowerCase().includes(lower)) ??
      elements.find((e) => e.type === lower)
    );
  }

  private suggestAction(
    instruction: string,
    target?: UIElement,
  ): VisionResult["suggestedAction"] {
    if (!target) return { type: "none", params: {} };
    const cx = target.bounds.x + target.bounds.width / 2;
    const cy = target.bounds.y + target.bounds.height / 2;
    const lower = instruction.toLowerCase();

    if (/click|点击|press|按/.test(lower)) {
      return { type: "click", params: { x: cx, y: cy } };
    }
    if (/type|输入|enter|填/.test(lower)) {
      return {
        type: "type",
        params: {
          x: cx,
          y: cy,
          text: instruction.replace(/^(type|输入|enter|填写?)\s*/i, ""),
        },
      };
    }
    if (/scroll|滚动/.test(lower)) {
      return { type: "scroll", params: { direction: "down", amount: 3 } };
    }
    return { type: "click", params: { x: cx, y: cy } };
  }

  // ─── Monitoring ───────────────────────────────────────────────────────────

  startMonitoring(intervalMs?: number): void {
    if (this.captureInterval) return;
    const interval = intervalMs ?? this.config.captureIntervalMs ?? 5000;
    this.captureInterval = setInterval(async () => {
      try {
        await this.analyze({ instruction: "monitor", mode: "fast" });
      } catch {}
    }, interval);
    log.info(`OUV monitoring started (${interval}ms)`);
  }

  stopMonitoring(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
      log.info("OUV monitoring stopped");
    }
  }

  getLatestAnalysis(): ScreenAnalysis | null {
    return this.latestAnalysis;
  }
}
