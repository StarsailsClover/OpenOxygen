/**
<<<<<<< HEAD
 * OpenOxygen �?OxygenUltraVision v2
 *
 * 三层视觉感知架构�?
 * 1. UI Automation (精确�? �?Rust native Win32 UIA，标准控�?100% 准确
 * 2. 图像处理 (快速层) �?Rust native Sobel/连通域/模板匹配
 * 3. 视觉大模�?(理解�? �?通过推理引擎调用 LLM，语义级屏幕理解
=======
 * OpenOxygen - OxygenUltraVision v2
 *
 * 三层视觉感知架构：
 * 1. UI Automation (精确层) - Windows UIA，标准控件 100% 准确
 * 2. 图像处理 (快速层) - 边缘检测/连通域/模板匹配
 * 3. 视觉大模型 (理解层) - 通过推理引擎调用 LLM，语义级屏幕理解
>>>>>>> dev
 *
 * 三层结果融合为统一�?ScreenAnalysis，供 Agent 决策使用�?
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

// === Types ===

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
  success: boolean;
  analysis?: ScreenAnalysis;
  targetElement?: UIElement;
  suggestedAction?: {
    type: "click" | "type" | "scroll" | "wait" | "none";
    target?: UIElement;
    params?: Record<string, unknown>;
  };
  error?: string;
};

// === Configuration ===

let config: VisionConfig = {
  enabled: true,
  primaryModel: "qwen3-vl:4b",
  uiaFallback: true,
};

let inferenceEngine: InferenceEngine | null = null;

export function initializeVision(
  visionConfig: VisionConfig,
  engine?: InferenceEngine,
): void {
  config = { ...config, ...visionConfig };
  inferenceEngine = engine || null;
  log.info("OxygenUltraVision initialized");
}

// === Layer 1: UI Automation (Precise Layer) ===

async function analyzeWithUIA(): Promise<UIElement[]> {
  log.debug("Analyzing with UIA layer");

  try {
    const { getForegroundWindow, findElements } = await import("../uia/detector.js");
    
    // Get foreground window
    const windowResult = await getForegroundWindow();
    if (!windowResult.success) {
      log.warn("Failed to get foreground window");
      return [];
    }

    // Find all elements in the window
    const elementsResult = await findElements(
      { type: "controlType", value: "Button", scope: "descendants" },
      windowResult.data.handle,
    );

    if (!elementsResult.success) {
      return [];
    }

    const uiaElements = (elementsResult.data as { elements: any[] }).elements;
    
    return uiaElements.map((el, index) => ({
      id: `uia-${index}`,
      type: mapControlType(el.controlType),
      label: el.name,
      bounds: el.bounds,
      confidence: 0.95,
      interactable: el.isEnabled && !el.isOffscreen,
      source: "uia",
      attributes: {
        automationId: el.automationId,
        className: el.className,
        hasKeyboardFocus: String(el.hasKeyboardFocus),
      },
    }));
  } catch (error) {
    log.error(`UIA analysis failed: ${error}`);
    return [];
  }
}

function mapControlType(controlType: string): UIElement["type"] {
  const typeMap: Record<string, UIElement["type"]> = {
    "ControlType.Button": "button",
    "ControlType.Edit": "input",
    "ControlType.Text": "text",
    "ControlType.Image": "image",
    "ControlType.Hyperlink": "link",
    "ControlType.Menu": "menu",
    "ControlType.Window": "window",
    "ControlType.ToolBar": "toolbar",
    "ControlType.Pane": "panel",
    "ControlType.CheckBox": "checkbox",
    "ControlType.List": "list",
    "ControlType.Tab": "tab",
  };

  return typeMap[controlType] || "unknown";
}

// === Layer 2: Image Processing (Fast Layer) ===

async function analyzeWithVision(screenshotPath: string): Promise<UIElement[]> {
  log.debug("Analyzing with Vision layer (image processing)");

  // This would use native image processing (Rust)
  // For now, return empty - will be implemented with native module
  return [];
}

// === Layer 3: LLM Vision (Understanding Layer) ===

async function analyzeWithLLM(
  screenshotPath: string,
  instruction?: string,
): Promise<{ elements: UIElement[]; description: string }> {
  log.debug("Analyzing with LLM layer");

  if (!inferenceEngine) {
    log.warn("No inference engine available for LLM vision");
    return { elements: [], description: "" };
  }

  try {
    // Read screenshot as base64
    const screenshotData = await fs.readFile(screenshotPath);
    const base64Image = screenshotData.toString("base64");

    // Build prompt
    const prompt = instruction
      ? `Analyze this screenshot and help me: ${instruction}`
      : "Analyze this screenshot and identify all interactive UI elements.";

<<<<<<< HEAD
  /**
   * 核心分析方法 �?三层融合�?
   *
   * mode:
   *   "fast"    �?UIA only (< 50ms)
   *   "precise" �?UIA + 图像处理 (< 200ms)
   *   "full"    �?UIA + 图像处理 + LLM (取决于模�?
   */
  async analyze(query: VisionQuery): Promise<VisionResult> {
    const mode = query.mode ?? "fast";
    const startTime = nowMs();
=======
    // Call vision model
    const response = await inferenceEngine.infer({
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nDescribe what you see and identify any buttons, input fields, menus, or other interactive elements with their approximate positions.`,
        },
      ],
      mode: "balanced",
    });

    // Parse response to extract elements
    // This is a simplified version - real implementation would use structured output
    const elements: UIElement[] = [];
    const description = response.content;

    return { elements, description };
  } catch (error) {
    log.error(`LLM analysis failed: ${error}`);
    return { elements: [], description: "" };
  }
}

// === Fusion & Analysis ===

export async function analyzeScreen(
  options: {
    screenshotPath?: string;
    mode?: "fast" | "precise" | "full";
    instruction?: string;
  } = {},
): Promise<VisionResult> {
  const startTime = nowMs();
  const mode = options.mode || "precise";

  log.info(`Starting screen analysis: mode=${mode}`);

  try {
    // Ensure screenshot exists
    let screenshotPath = options.screenshotPath;
    if (!screenshotPath) {
      screenshotPath = await captureScreenshot();
    }

    // Run layers based on mode
    const layerPromises: Promise<UIElement[]>[] = [];

    // Layer 1: UIA (always in precise/full mode)
    if (mode !== "fast") {
      layerPromises.push(analyzeWithUIA());
    } else {
      layerPromises.push(Promise.resolve([]));
    }

    // Layer 2: Vision (in full mode)
    if (mode === "full" && screenshotPath) {
      layerPromises.push(analyzeWithVision(screenshotPath));
    } else {
      layerPromises.push(Promise.resolve([]));
    }

    // Layer 3: LLM (in full mode or when instruction provided)
    let llmDescription = "";
    if ((mode === "full" || options.instruction) && screenshotPath) {
      const llmResult = await analyzeWithLLM(screenshotPath, options.instruction);
      layerPromises.push(Promise.resolve(llmResult.elements));
      llmDescription = llmResult.description;
    } else {
      layerPromises.push(Promise.resolve([]));
    }

    // Wait for all layers
    const [uiaElements, visionElements, llmElements] = await Promise.all(
      layerPromises,
    );

    // Merge elements
    const mergedElements = mergeElements([
      ...uiaElements,
      ...visionElements,
      ...llmElements,
    ]);

    // Get active window info
    const { getForegroundWindow } = await import("../uia/detector.js");
    const windowResult = await getForegroundWindow();
>>>>>>> dev

    const analysis: ScreenAnalysis = {
      id: generateId("analysis"),
      timestamp: nowMs(),
      screenshotPath,
      elements: mergedElements,
      activeWindow: windowResult.success
        ? {
            title: windowResult.data.title,
            className: windowResult.data.className,
            bounds: windowResult.data.bounds,
          }
        : undefined,
      description: llmDescription || generateDescription(mergedElements),
      durationMs: nowMs() - startTime,
      layers: {
        uia: uiaElements.length,
        vision: visionElements.length,
        llm: llmElements.length,
      },
    };

    log.info(`Screen analysis complete: ${mergedElements.length} elements in ${analysis.durationMs}ms`);

<<<<<<< HEAD
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

      // 去重：如�?UIA 已经检测到同位置元素，跳过视觉检测结�?
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

      // 清理临时边缘�?
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
          `[${e.type}] "${e.label}" @ (${e.bounds.x},${e.bounds.y},${e.bounds.width}x${e.bounds.height}) ${e.interactable ? "�? : "�?}`,
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

    if (/click|点击|press|�?.test(lower)) {
      return { type: "click", params: { x: cx, y: cy } };
    }
    if (/type|输入|enter|�?.test(lower)) {
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
=======
    return {
      success: true,
      analysis,
    };
  } catch (error) {
    log.error(`Screen analysis failed: ${error}`);
    return {
      success: false,
      error: `Screen analysis failed: ${error}`,
    };
>>>>>>> dev
  }
}

function mergeElements(elements: UIElement[]): UIElement[] {
  // Deduplicate elements based on position overlap
  const merged: UIElement[] = [];
  const threshold = 10; // Pixel threshold for considering same element

  for (const element of elements) {
    const duplicate = merged.find(
      (e) =>
        Math.abs(e.bounds.x - element.bounds.x) < threshold &&
        Math.abs(e.bounds.y - element.bounds.y) < threshold,
    );

    if (duplicate) {
      // Merge - keep higher confidence
      if (element.confidence > duplicate.confidence) {
        Object.assign(duplicate, element);
      }
    } else {
      merged.push(element);
    }
  }

  return merged;
}

function generateDescription(elements: UIElement[]): string {
  const interactable = elements.filter((e) => e.interactable);
  const byType = interactable.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const parts: string[] = [];
  for (const [type, count] of Object.entries(byType)) {
    parts.push(`${count} ${type}${count > 1 ? "s" : ""}`);
  }

  return `Screen contains ${parts.join(", ") || "no interactive elements"}.`;
}

// === Screenshot ===

async function captureScreenshot(): Promise<string> {
  const screenshotDir = "./.state/screenshots";
  const screenshotPath = path.join(screenshotDir, `screenshot-${nowMs()}.png`);

  // Ensure directory exists
  await fs.mkdir(screenshotDir, { recursive: true });

  // Use PowerShell to capture screenshot
  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    
    $bitmap.Save("${screenshotPath.replace(/\\/g, "\\\\")}")
    $graphics.Dispose()
    $bitmap.Dispose()
  `;

  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  await execAsync(`powershell -Command "${script.replace(/"/g, '`"')}"`, {
    timeout: 10000,
  });

  return screenshotPath;
}

// === Element Query ===

export async function findElementOnScreen(
  query: VisionQuery,
): Promise<VisionResult> {
  const analysisResult = await analyzeScreen({
    screenshotPath: query.screenshotPath,
    mode: query.mode,
    instruction: query.instruction,
  });

  if (!analysisResult.success || !analysisResult.analysis) {
    return analysisResult;
  }

  const { analysis } = analysisResult;

  // Find target element
  let targetElement: UIElement | undefined;

  if (query.targetElement) {
    // Search by label/name
    const query_lower = query.targetElement.toLowerCase();
    targetElement = analysis.elements.find(
      (e) =>
        e.label.toLowerCase().includes(query_lower) ||
        query_lower.includes(e.label.toLowerCase()),
    );
  }

  // Determine suggested action
  let suggestedAction: VisionResult["suggestedAction"];

  if (targetElement) {
    if (targetElement.type === "button" || targetElement.type === "link") {
      suggestedAction = { type: "click", target: targetElement };
    } else if (targetElement.type === "input") {
      suggestedAction = { type: "type", target: targetElement };
    }
  }

  return {
    success: true,
    analysis,
    targetElement,
    suggestedAction,
  };
}

// === Exports ===

export {
  initializeVision,
  analyzeScreen,
  findElementOnScreen,
  captureScreenshot,
};

export const OxygenUltraVision = {
  initialize: initializeVision,
  analyze: analyzeScreen,
  findElement: findElementOnScreen,
  captureScreenshot,
};

export default OxygenUltraVision;
