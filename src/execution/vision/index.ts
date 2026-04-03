/**
 * OpenOxygen - OxygenUltraVision v2
 *
 * 三层视觉感知架构：
 * 1. UI Automation (精确层) - Windows UIA，标准控件 100% 准确
 * 2. 图像处理 (快速层) - 边缘检测/连通域/模板匹配
 * 3. 视觉大模型 (理解层) - 通过推理引擎调用 LLM，语义级屏幕理解
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
