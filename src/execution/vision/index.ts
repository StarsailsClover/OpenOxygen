/**
 * OpenOxygen — OxygenUltraVision 视觉引擎
 *
 * 双路感知管道：Fast (轻量级截图分析) + Precise (重型模型精确定位)。
 * 实现桌面环境理解、UI 元素定位、动态感知与交互闭环。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/index.js";
import type { ToolResult, VisionConfig } from "../../types/index.js";
import { generateId, nowMs, withTimeout } from "../../utils/index.js";
import { screenCapture } from "../windows/index.js";

const log = createSubsystemLogger("execution/vision");

// ─── Vision Types ───────────────────────────────────────────────────────────

export type UIElement = {
  id: string;
  type: "button" | "input" | "text" | "image" | "link" | "menu" | "window" | "icon" | "unknown";
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
  interactable: boolean;
  attributes?: Record<string, string>;
};

export type ScreenAnalysis = {
  id: string;
  timestamp: number;
  screenshotPath: string;
  elements: UIElement[];
  activeWindow?: { title: string; bounds: { x: number; y: number; width: number; height: number } };
  description: string;
  durationMs: number;
};

export type VisionQuery = {
  instruction: string;
  screenshotPath?: string;
  targetElement?: string;
  mode?: "fast" | "precise";
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

const SCREENSHOT_DIR = path.join(process.env["TEMP"] ?? "/tmp", "openoxygen", "screenshots");

async function ensureScreenshotDir(): Promise<void> {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreen(): Promise<string> {
  await ensureScreenshotDir();
  const filename = `screen_${generateId("cap")}.png`;
  const outputPath = path.join(SCREENSHOT_DIR, filename);
  const result = await screenCapture(outputPath);
  if (!result.success) {
    throw new Error(`Screen capture failed: ${result.error}`);
  }
  return outputPath;
}

async function cleanOldScreenshots(maxAgeMs = 300_000): Promise<void> {
  try {
    const files = await fs.readdir(SCREENSHOT_DIR);
    const now = nowMs();
    for (const file of files) {
      const filePath = path.join(SCREENSHOT_DIR, file);
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        await fs.unlink(filePath);
      }
    }
  } catch {
    // Directory may not exist yet
  }
}

// ─── Vision Engine ──────────────────────────────────────────────────────────

export class OxygenUltraVision {
  private config: VisionConfig;
  private captureInterval: ReturnType<typeof setInterval> | null = null;
  private latestAnalysis: ScreenAnalysis | null = null;

  constructor(config: VisionConfig) {
    this.config = config;
  }

  updateConfig(config: VisionConfig): void {
    this.config = config;
  }

  /**
   * Analyze current screen state.
   * Fast mode: lightweight analysis for quick decisions.
   * Precise mode: heavy model for accurate element detection.
   */
  async analyze(query: VisionQuery): Promise<VisionResult> {
    const mode = query.mode ?? "fast";
    const startTime = nowMs();

    // Capture screenshot if not provided
    const screenshotPath = query.screenshotPath ?? (await captureScreen());

    // Read screenshot for analysis
    const imageBuffer = await fs.readFile(screenshotPath);
    const base64Image = imageBuffer.toString("base64");

    // Build analysis based on mode
    const analysis: ScreenAnalysis = {
      id: generateId("vis"),
      timestamp: nowMs(),
      screenshotPath,
      elements: [],
      description: "",
      durationMs: 0,
    };

    if (mode === "fast") {
      // Fast pipeline: use lightweight model or heuristics
      analysis.elements = await this.fastDetect(base64Image);
      analysis.description = `Fast analysis: detected ${analysis.elements.length} UI elements`;
    } else {
      // Precise pipeline: use heavy vision model
      analysis.elements = await this.preciseDetect(base64Image, query.instruction);
      analysis.description = `Precise analysis: detected ${analysis.elements.length} UI elements`;
    }

    analysis.durationMs = nowMs() - startTime;
    this.latestAnalysis = analysis;

    // Find target element if specified
    let targetElement: UIElement | undefined;
    if (query.targetElement) {
      targetElement = this.findElement(analysis.elements, query.targetElement);
    }

    // Suggest action based on instruction
    const suggestedAction = this.suggestAction(query.instruction, targetElement);

    log.info(
      `Vision [${mode}]: ${analysis.elements.length} elements, ${analysis.durationMs}ms`,
    );

    return { analysis, targetElement, suggestedAction };
  }

  /**
   * Fast detection pipeline — heuristic-based + lightweight model.
   */
  private async fastDetect(base64Image: string): Promise<UIElement[]> {
    // TODO: Integrate with ONNX Runtime for local lightweight detection
    // For now, return placeholder — will be connected to actual vision model
    log.debug("Fast detection pipeline (placeholder)");
    return [];
  }

  /**
   * Precise detection pipeline — heavy vision model (GPT-5.1 / Claude / Gemini).
   */
  private async preciseDetect(
    base64Image: string,
    instruction: string,
  ): Promise<UIElement[]> {
    // TODO: Send screenshot to vision-capable model for precise analysis
    // Will use the inference engine with vision-capable model
    log.debug("Precise detection pipeline (placeholder)");
    return [];
  }

  /**
   * Find a UI element matching a description.
   */
  private findElement(elements: UIElement[], description: string): UIElement | undefined {
    const lower = description.toLowerCase();

    // Exact label match
    const exact = elements.find((e) => e.label.toLowerCase() === lower);
    if (exact) return exact;

    // Partial match
    const partial = elements.find((e) => e.label.toLowerCase().includes(lower));
    if (partial) return partial;

    // Type match
    const typeMatch = elements.find((e) => e.type === lower);
    return typeMatch;
  }

  /**
   * Suggest an interaction action based on instruction and target.
   */
  private suggestAction(
    instruction: string,
    target?: UIElement,
  ): VisionResult["suggestedAction"] {
    if (!target) return { type: "none", params: {} };

    const lower = instruction.toLowerCase();

    if (lower.includes("click") || lower.includes("点击") || lower.includes("press")) {
      return {
        type: "click",
        params: {
          x: target.bounds.x + target.bounds.width / 2,
          y: target.bounds.y + target.bounds.height / 2,
        },
      };
    }

    if (lower.includes("type") || lower.includes("输入") || lower.includes("enter")) {
      return {
        type: "type",
        params: {
          x: target.bounds.x + target.bounds.width / 2,
          y: target.bounds.y + target.bounds.height / 2,
          text: instruction.replace(/^(type|输入|enter)\s*/i, ""),
        },
      };
    }

    if (lower.includes("scroll") || lower.includes("滚动")) {
      return { type: "scroll", params: { direction: "down", amount: 3 } };
    }

    return { type: "click", params: { x: target.bounds.x + target.bounds.width / 2, y: target.bounds.y + target.bounds.height / 2 } };
  }

  /**
   * Start continuous screen monitoring.
   */
  startMonitoring(intervalMs?: number): void {
    if (this.captureInterval) return;
    const interval = intervalMs ?? this.config.captureIntervalMs ?? 5000;
    this.captureInterval = setInterval(async () => {
      try {
        await this.analyze({ instruction: "monitor", mode: "fast" });
      } catch (err) {
        log.error("Monitoring capture failed:", err);
      }
    }, interval);
    log.info(`Vision monitoring started (interval: ${interval}ms)`);
  }

  /**
   * Stop continuous screen monitoring.
   */
  stopMonitoring(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
      log.info("Vision monitoring stopped");
    }
  }

  getLatestAnalysis(): ScreenAnalysis | null {
    return this.latestAnalysis;
  }

  async cleanup(): Promise<void> {
    this.stopMonitoring();
    await cleanOldScreenshots(0);
  }
}
