/**
 * OpenOxygen - OUV Visual Understanding System (26w15aD Phase 7)
 *
 * P-1: OUV 视觉理解系统
 * - 屏幕内容语义理解
 * - UI 元素识别与分�?
 * - 视觉状态追�?
 * - 跨平台视觉分�?
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import type { InferenceEngine } from "../inference/engine/index.js";

const log = createSubsystemLogger("ouv/visual-understanding");

// Visual element types
export type VisualElementType =
  | "button"
  | "input"
  | "text"
  | "image"
  | "icon"
  | "container"
  | "menu"
  | "dialog"
  | "scrollbar"
  | "tab"
  | "list"
  | "unknown";

// Visual state
export type VisualState =
  | "visible"
  | "hidden"
  | "disabled"
  | "focused"
  | "hovered";

// Visual element
export interface VisualElement {
  id: string;
  type: VisualElementType;
  text?: string;
  description: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center: {
    x: number;
    y: number;
  };
  confidence: number;
  state: VisualState;
  parent?: string;
  children: string[];
  metadata: Record<string, any>;
}

// Screen understanding
export interface ScreenUnderstanding {
  timestamp: number;
  screenshot: string;
  description: string;
  elements: VisualElement[];
  layout: LayoutAnalysis;
  interactions: PossibleInteraction[];
  context: ScreenContext;
}

// Layout analysis
export interface LayoutAnalysis {
  type: "form" | "list" | "dashboard" | "dialog" | "unknown";
  regions: Region[];
  hierarchy: ElementHierarchy;
}

// Region
export interface Region {
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  elements: string[];
  purpose: string;
}

// Element hierarchy
export interface ElementHierarchy {
  root: string;
  levels: number;
  maxWidth: number;
  maxDepth: number;
}

// Possible interaction
export interface PossibleInteraction {
  elementId: string;
  action: "click" | "type" | "scroll" | "drag" | "wait";
  description: string;
  confidence: number;
}

// Screen context
export interface ScreenContext {
  application?: string;
  windowTitle?: string;
  url?: string;
  pageType?: string;
  taskRelevance: number;
}

// Visual change
export interface VisualChange {
  timestamp: number;
  type: "added" | "removed" | "modified" | "moved";
  elementId: string;
  before?: Partial<VisualElement>;
  after?: Partial<VisualElement>;
}

// Understanding options
export interface UnderstandingOptions {
  includeScreenshot?: boolean;
  detectHierarchy?: boolean;
  analyzeLayout?: boolean;
  trackChanges?: boolean;
  confidenceThreshold?: number;
}

/**
 * OUV Visual Understanding Controller
 */
export class OUVVisualUnderstandingController {
  private inferenceEngine: InferenceEngine;
  private elementCache: Map<string, VisualElement> = new Map();
  private changeHistory: VisualChange[] = [];
  private lastUnderstanding?: ScreenUnderstanding;

  constructor(inferenceEngine: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
    log.info("OUV Visual Understanding Controller initialized");
  }

  /**
   * Understand screen from screenshot
   */
  async understandScreen(
    screenshot: string,
    options: UnderstandingOptions = {},
  ): Promise<ScreenUnderstanding> {
    const timestamp = nowMs();
    log.info("Analyzing screen content...");

    const opts = {
      includeScreenshot: true,
      detectHierarchy: true,
      analyzeLayout: true,
      trackChanges: true,
      confidenceThreshold: 0.7,
      ...options,
    };

    // Detect elements
    const elements = await this.detectElements(
      screenshot,
      opts.confidenceThreshold,
    );

    // Analyze layout
    const layout = opts.analyzeLayout
      ? await this.analyzeLayout(elements)
      : {
          type: "unknown",
          regions: [],
          hierarchy: { root: "", levels: 0, maxWidth: 0, maxDepth: 0 },
        };

    // Build hierarchy
    if (opts.detectHierarchy) {
      this.buildHierarchy(elements);
    }

    // Generate description
    const description = await this.generateDescription(elements, layout);

    // Identify possible interactions
    const interactions = this.identifyInteractions(elements);

    // Detect context
    const context = await this.detectContext(screenshot, elements);

    // Track changes
    if (opts.trackChanges && this.lastUnderstanding) {
      this.trackChanges(this.lastUnderstanding.elements, elements);
    }

    // @ts-ignore
    const understanding: ScreenUnderstanding = {
      timestamp,
      screenshot: opts.includeScreenshot ? screenshot : "",
      description,
      elements,
      layout,
      interactions,
      context,
    };

    this.lastUnderstanding = understanding;

    // Update cache
    for (const element of elements) {
      this.elementCache.set(element.id, element);
    }

    log.info(`Screen understood: ${elements.length} elements detected`);
    // @ts-ignore
    return understanding as ScreenUnderstanding;
  }

  /**
   * Detect visual elements
   */
  private async detectElements(
    screenshot: string,
    confidenceThreshold: number,
  ): Promise<VisualElement[]> {
    // Use LLM for element detection
    const prompt = `Analyze this screenshot and identify all UI elements.

For each element, provide:
1. Type (button, input, text, image, icon, container, menu, dialog, scrollbar, tab, list)
2. Text content (if any)
3. Description
4. Bounding box (x, y, width, height as percentages 0-100)
5. Current state (visible, hidden, disabled, focused, hovered)

Respond in JSON format:
[
  {
    "type": "button",
    "text": "Submit",
    "description": "Submit button",
    "bounds": { "x": 45, "y": 80, "width": 10, "height": 5 },
    "state": "visible"
  }
]`;

    try {
      const response = await this.inferenceEngine.infer({
        messages: [
          { role: "system", content: "You are a UI analysis expert." },
          {
            role: "user",
            content: `${prompt}\n\nScreenshot: data:image/png;base64,${screenshot}`,
          },
        ],
        mode: "balanced",
      });

      const detected = JSON.parse(response.content);
      const elements: VisualElement[] = [];

      for (const item of detected) {
        const confidence = item.confidence || 0.8;
        if (confidence >= confidenceThreshold) {
          const element: VisualElement = {
            id: generateId("ouv"),
            type: item.type || "unknown",
            text: item.text,
            description: item.description || "",
            bounds: {
              x: item.bounds?.x || 0,
              y: item.bounds?.y || 0,
              width: item.bounds?.width || 0,
              height: item.bounds?.height || 0,
            },
            center: {
              x: (item.bounds?.x || 0) + (item.bounds?.width || 0) / 2,
              y: (item.bounds?.y || 0) + (item.bounds?.height || 0) / 2,
            },
            confidence,
            state: item.state || "visible",
            children: [],
            metadata: item.metadata || {},
          };
          elements.push(element);
        }
      }

      return elements;
    } catch (error: any) {
      log.error(`Element detection failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze layout
   */
  private async analyzeLayout(
    elements: VisualElement[],
  ): Promise<LayoutAnalysis> {
    // Determine layout type based on element distribution
    const buttons = elements.filter((e) => e.type === "button").length;
    const inputs = elements.filter((e) => e.type === "input").length;
    const lists = elements.filter((e) => e.type === "list").length;

    let type: any = "unknown";
    if (inputs > 2 && buttons > 0) {
      type = "form";
    } else if (lists > 0) {
      type = "list";
    } else if (elements.length > 10) {
      type = "dashboard";
    } else if (elements.length < 5) {
      type = "dialog";
    }

    // Identify regions
    const regions = this.identifyRegions(elements);

    // Calculate hierarchy stats
    const hierarchy: ElementHierarchy = {
      root: elements[0]?.id || "",
      levels: this.calculateHierarchyLevels(elements),
      maxWidth: Math.max(...elements.map((e) => e.bounds.width)),
      maxDepth: Math.max(...elements.map((e) => e.bounds.height)),
    };

    return { type, regions, hierarchy };
  }

  /**
   * Identify layout regions
   */
  private identifyRegions(elements: VisualElement[]): Region[] {
    const regions: Region[] = [];

    // Simple region detection based on element clustering
    const header = elements.filter((e) => e.bounds.y < 20);
    const sidebar = elements.filter((e) => e.bounds.x < 20);
    const main = elements.filter((e) => e.bounds.x >= 20 && e.bounds.y >= 20);
    const footer = elements.filter((e) => e.bounds.y > 80);

    if (header.length > 0) {
      regions.push({
        name: "header",
        bounds: { x: 0, y: 0, width: 100, height: 20 },
        elements: header.map((e) => e.id),
        purpose: "Navigation and branding",
      });
    }

    if (sidebar.length > 0) {
      regions.push({
        name: "sidebar",
        bounds: { x: 0, y: 20, width: 20, height: 60 },
        elements: sidebar.map((e) => e.id),
        purpose: "Menu and tools",
      });
    }

    if (main.length > 0) {
      regions.push({
        name: "main",
        bounds: { x: 20, y: 20, width: 80, height: 60 },
        elements: main.map((e) => e.id),
        purpose: "Main content",
      });
    }

    if (footer.length > 0) {
      regions.push({
        name: "footer",
        bounds: { x: 0, y: 80, width: 100, height: 20 },
        elements: footer.map((e) => e.id),
        purpose: "Footer information",
      });
    }

    return regions;
  }

  /**
   * Calculate hierarchy levels
   */
  private calculateHierarchyLevels(elements: VisualElement[]): number {
    // Simplified: count unique y positions
    const yPositions = new Set(
      elements.map((e) => Math.round(e.bounds.y / 10) * 10),
    );
    return yPositions.size;
  }

  /**
   * Build element hierarchy
   */
  private buildHierarchy(elements: VisualElement[]): void {
    for (const element of elements) {
      // Find parent (element that contains this one)
      for (const other of elements) {
        if (other.id === element.id) continue;

        if (
          other.bounds.x <= element.bounds.x &&
          other.bounds.y <= element.bounds.y &&
          other.bounds.x + other.bounds.width >=
            element.bounds.x + element.bounds.width &&
          other.bounds.y + other.bounds.height >=
            element.bounds.y + element.bounds.height
        ) {
          element.parent = other.id;
          other.children.push(element.id);
          break;
        }
      }
    }
  }

  /**
   * Generate screen description
   */
  private async generateDescription(
    elements: VisualElement[],
    layout: LayoutAnalysis,
  ): Promise<string> {
    const prompt = `Generate a concise description of this UI based on the following information:

Layout type: ${layout.type}
Elements: ${elements.length} total
- Buttons: ${elements.filter((e) => e.type === "button").length}
- Inputs: ${elements.filter((e) => e.type === "input").length}
- Text: ${elements.filter((e) => e.type === "text").length}

Key elements:
${elements
  .slice(0, 5)
  .map((e) => `- ${e.type}: "${e.text || e.description}"`)
  .join("\n")}

Provide a 1-2 sentence description.`;

    try {
      const response = await this.inferenceEngine.infer({
        messages: [{ role: "user", content: prompt }],
        mode: "balanced",
      });

      return response.content;
    } catch {
      return `A ${layout.type} interface with ${elements.length} elements.`;
    }
  }

  /**
   * Identify possible interactions
   */
  private identifyInteractions(
    elements: VisualElement[],
  ): PossibleInteraction[] {
    const interactions: PossibleInteraction[] = [];

    for (const element of elements) {
      if (element.state === "disabled" || element.state === "hidden") continue;

      switch (element.type) {
        case "button":
          interactions.push({
            elementId: element.id,
            action: "click",
            description: `Click ${element.text || "button"}`,
            confidence: 0.9,
          });
          break;
        case "input":
          interactions.push({
            elementId: element.id,
            action: "type",
            description: `Type into ${element.text || "input field"}`,
            confidence: 0.85,
          });
          break;
        case "list":
        case "container":
          interactions.push({
            elementId: element.id,
            action: "scroll",
            description: `Scroll ${element.type}`,
            confidence: 0.7,
          });
          break;
      }
    }

    return interactions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect screen context
   */
  private async detectContext(
    screenshot: string,
    elements: VisualElement[],
  ): Promise<ScreenContext> {
    // Try to identify application from elements
    const context: ScreenContext = {
      taskRelevance: 0.5,
    };

    // Look for URL bar or title
    const urlElement = elements.find(
      (e) => e.type === "input" && e.description.toLowerCase().includes("url"),
    );
    if (urlElement) {
      context.url = urlElement.text;
    }

    // Look for window title
    const titleElement = elements.find(
      (e) => e.type === "text" && e.bounds.y < 10,
    );
    if (titleElement) {
      context.windowTitle = titleElement.text;
    }

    return context;
  }

  /**
   * Track visual changes
   */
  private trackChanges(
    previous: VisualElement[],
    current: VisualElement[],
  ): void {
    const timestamp = nowMs();
    const previousIds = new Set(previous.map((e) => e.id));
    const currentIds = new Set(current.map((e) => e.id));

    // Detect removed elements
    for (const element of previous) {
      if (!currentIds.has(element.id)) {
        this.changeHistory.push({
          timestamp,
          type: "removed",
          elementId: element.id,
          before: element,
        });
      }
    }

    // Detect added elements
    for (const element of current) {
      if (!previousIds.has(element.id)) {
        this.changeHistory.push({
          timestamp,
          type: "added",
          elementId: element.id,
          after: element,
        });
      }
    }

    // Detect modified elements
    for (const curr of current) {
      const prev = previous.find((e) => e.id === curr.id);
      if (prev) {
        const changed =
          prev.text !== curr.text ||
          prev.state !== curr.state ||
          prev.bounds.x !== curr.bounds.x ||
          prev.bounds.y !== curr.bounds.y;

        if (changed) {
          this.changeHistory.push({
            timestamp,
            type: "modified",
            elementId: curr.id,
            before: prev,
            after: curr,
          });
        }
      }
    }
  }

  /**
   * Get element by ID
   */
  getElement(id: string): VisualElement | undefined {
    return this.elementCache.get(id);
  }

  /**
   * Get change history
   */
  getChangeHistory(): VisualChange[] {
    return [...this.changeHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.changeHistory = [];
  }
}

// Export OUV visual understanding utilities
export const OUVVisualUnderstanding = {
  OUVVisualUnderstandingController,
};

export default OUVVisualUnderstanding;
