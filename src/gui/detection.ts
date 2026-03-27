/**
 * OpenOxygen - GUI Element Detection Module (26w15aD Phase 7)
 *
 * Hybrid element detection combining:
 * - UIA (UI Automation) - Fast, 100% accurate for standard controls
 * - Computer Vision - Flexible, works with non-standard UIs
 * - LLM Understanding - Semantic understanding when needed
 *
 * Provides unified element detection API for all GUI automation needs
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
import { loadNativeModule } from "../native-bridge.js";
import type { NativeModule } from "../native-bridge.js";

const log = createSubsystemLogger("gui/detection");

// Element types
export type GUIElementType =
  | "button"
  | "input"
  | "text"
  | "image"
  | "container"
  | "link"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "scrollbar"
  | "menu"
  | "menuitem"
  | "tab"
  | "tree"
  | "list"
  | "listitem"
  | "slider"
  | "progress"
  | "unknown";

// GUI element interface
export interface GUIElement {
  id: string;
  type: GUIElementType;
  name?: string;
  automationId?: string;
  className?: string;
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
  enabled: boolean;
  visible: boolean;
  focused: boolean;
  source: "uia" | "vision" | "hybrid";
  children?: GUIElement[];
  parent?: string;
  metadata?: Record<string, unknown>;
}

// Detection options
export interface DetectionOptions {
  // Source preference
  preferUIA?: boolean;      // Prefer UIA when available
  useVision?: boolean;      // Use computer vision
  useLLM?: boolean;         // Use LLM for semantic understanding
  
  // Detection scope
  windowTitle?: string;     // Target specific window
  windowClass?: string;     // Target window class
  boundingBox?: {          // Search within region
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Filtering
  visibleOnly?: boolean;    // Only visible elements
  enabledOnly?: boolean;    // Only enabled elements
  minConfidence?: number;   // Minimum confidence threshold
  
  // Performance
  timeoutMs?: number;       // Detection timeout
  cacheEnabled?: boolean;   // Enable result caching
}

// Default options
const defaultOptions: DetectionOptions = {
  preferUIA: true,
  useVision: true,
  useLLM: false,
  visibleOnly: true,
  enabledOnly: false,
  minConfidence: 0.7,
  timeoutMs: 5000,
  cacheEnabled: true,
};

// Element cache
const elementCache = new Map<string, { elements: GUIElement[]; timestamp: number }>();
const CACHE_TTL = 1000; // 1 second

/**
 * Clear element cache
 */
export function clearElementCache(): void {
  elementCache.clear();
}

/**
 * Get cache key for options
 */
function getCacheKey(options: DetectionOptions): string {
  return JSON.stringify({
    windowTitle: options.windowTitle,
    windowClass: options.windowClass,
    boundingBox: options.boundingBox,
    visibleOnly: options.visibleOnly,
  });
}

/**
 * Convert UIA element to GUIElement
 */
function convertUIAElement(uiaEl: any, parent?: string): GUIElement {
  return {
    id: generateId("gui"),
    type: mapUIAControlType(uiaEl.controlType),
    name: uiaEl.name,
    automationId: uiaEl.automationId,
    className: uiaEl.className,
    bounds: {
      x: uiaEl.x,
      y: uiaEl.y,
      width: uiaEl.width,
      height: uiaEl.height,
    },
    center: {
      x: uiaEl.x + uiaEl.width / 2,
      y: uiaEl.y + uiaEl.height / 2,
    },
    confidence: 1.0, // UIA is 100% accurate
    enabled: uiaEl.isEnabled,
    visible: !uiaEl.isOffscreen,
    focused: uiaEl.hasKeyboardFocus,
    source: "uia",
    parent,
    metadata: {
      nativeControlType: uiaEl.controlType,
    },
  };
}

/**
 * Map UIA control type to GUIElementType
 */
function mapUIAControlType(controlType: string): GUIElementType {
  const typeMap: Record<string, GUIElementType> = {
    "Button": "button",
    "Edit": "input",
    "Text": "text",
    "Image": "image",
    "Pane": "container",
    "Window": "container",
    "Hyperlink": "link",
    "CheckBox": "checkbox",
    "RadioButton": "radio",
    "ComboBox": "dropdown",
    "ScrollBar": "scrollbar",
    "Menu": "menu",
    "MenuItem": "menuitem",
    "Tab": "tab",
    "Tree": "tree",
    "List": "list",
    "ListItem": "listitem",
    "Slider": "slider",
    "ProgressBar": "progress",
  };
  
  return typeMap[controlType] || "unknown";
}

/**
 * Detect elements using UIA
 */
async function detectWithUIA(
  native: NativeModule,
  options: DetectionOptions
): Promise<GUIElement[]> {
  log.debug("Detecting elements with UIA");
  
  try {
    // Get UI elements from native module
    const uiaElements = native.getUiElements(null);
    
    if (!Array.isArray(uiaElements)) {
      return [];
    }
    
    // Convert and filter
    const elements: GUIElement[] = [];
    
    for (const uiaEl of uiaElements) {
      // Apply filters
      if (options.visibleOnly && uiaEl.isOffscreen) continue;
      if (options.enabledOnly && !uiaEl.isEnabled) continue;
      
      // Check bounding box if specified
      if (options.boundingBox) {
        const bb = options.boundingBox;
        if (
          uiaEl.x < bb.x ||
          uiaEl.y < bb.y ||
          uiaEl.x + uiaEl.width > bb.x + bb.width ||
          uiaEl.y + uiaEl.height > bb.y + bb.height
        ) {
          continue;
        }
      }
      
      elements.push(convertUIAElement(uiaEl));
    }
    
    log.debug(`UIA detected ${elements.length} elements`);
    return elements;
  } catch (error: any) {
    log.error(`UIA detection failed: ${error.message}`);
    return [];
  }
}

/**
 * Detect elements using Computer Vision
 */
async function detectWithVision(
  options: DetectionOptions
): Promise<GUIElement[]> {
  log.debug("Detecting elements with Computer Vision");
  
  // Placeholder for vision-based detection
  // In production, this would use OUV or similar vision system
  log.warn("Vision-based detection not yet implemented");
  return [];
}

/**
 * Merge elements from multiple sources
 */
function mergeElements(
  uiaElements: GUIElement[],
  visionElements: GUIElement[]
): GUIElement[] {
  // Start with UIA elements (more accurate)
  const merged = [...uiaElements];
  const mergedBounds = new Set(uiaElements.map(e => 
    `${Math.round(e.bounds.x)},${Math.round(e.bounds.y)}`
  ));
  
  // Add vision elements that don't overlap with UIA
  for (const visionEl of visionElements) {
    const key = `${Math.round(visionEl.bounds.x)},${Math.round(visionEl.bounds.y)}`;
    if (!mergedBounds.has(key)) {
      merged.push(visionEl);
    }
  }
  
  return merged;
}

/**
 * Detect all GUI elements
 */
export async function detectElements(
  options: DetectionOptions = {}
): Promise<GUIElement[]> {
  const opts = { ...defaultOptions, ...options };
  const startTime = nowMs();
  
  log.info("Starting GUI element detection");
  
  // Check cache
  if (opts.cacheEnabled) {
    const cacheKey = getCacheKey(opts);
    const cached = elementCache.get(cacheKey);
    if (cached && nowMs() - cached.timestamp < CACHE_TTL) {
      log.debug("Returning cached elements");
      return cached.elements;
    }
  }
  
  const native = loadNativeModule();
  const elements: GUIElement[] = [];
  
  // Try UIA first if preferred
  if (opts.preferUIA && native) {
    const uiaElements = await detectWithUIA(native, opts);
    elements.push(...uiaElements);
  }
  
  // Supplement with vision if enabled
  if (opts.useVision && elements.length === 0) {
    const visionElements = await detectWithVision(opts);
    if (opts.preferUIA) {
      elements.push(...mergeElements(elements, visionElements));
    } else {
      elements.push(...visionElements);
    }
  }
  
  // Filter by confidence
  const filtered = elements.filter(e => e.confidence >= (opts.minConfidence || 0));
  
  // Cache results
  if (opts.cacheEnabled) {
    const cacheKey = getCacheKey(opts);
    elementCache.set(cacheKey, { elements: filtered, timestamp: nowMs() });
  }
  
  const duration = nowMs() - startTime;
  log.info(`Detected ${filtered.length} elements in ${duration}ms`);
  
  return filtered;
}

/**
 * Find element by text/content
 */
export async function findElementByText(
  text: string,
  options: DetectionOptions = {}
): Promise<GUIElement | null> {
  log.info(`Finding element by text: ${text}`);
  
  const elements = await detectElements(options);
  
  // Exact match first
  const exactMatch = elements.find(e => 
    e.name?.toLowerCase() === text.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // Partial match
  const partialMatch = elements.find(e =>
    e.name?.toLowerCase().includes(text.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // Fuzzy match (contains words)
  const words = text.toLowerCase().split(/\s+/);
  const fuzzyMatch = elements.find(e => {
    const name = e.name?.toLowerCase() || "";
    return words.every(word => name.includes(word));
  });
  
  return fuzzyMatch || null;
}

/**
 * Find element by type
 */
export async function findElementsByType(
  type: GUIElementType,
  options: DetectionOptions = {}
): Promise<GUIElement[]> {
  log.info(`Finding elements by type: ${type}`);
  
  const elements = await detectElements(options);
  return elements.filter(e => e.type === type);
}

/**
 * Find element at position
 */
export async function findElementAtPosition(
  x: number,
  y: number,
  options: DetectionOptions = {}
): Promise<GUIElement | null> {
  log.debug(`Finding element at position (${x}, ${y})`);
  
  const elements = await detectElements(options);
  
  // Find smallest element containing the point
  const containing = elements.filter(e =>
    x >= e.bounds.x &&
    x <= e.bounds.x + e.bounds.width &&
    y >= e.bounds.y &&
    y <= e.bounds.y + e.bounds.height
  );
  
  // Return smallest by area
  return containing.sort((a, b) =>
    (a.bounds.width * a.bounds.height) - (b.bounds.width * b.bounds.height)
  )[0] || null;
}

/**
 * Wait for element to appear
 */
export async function waitForElement(
  predicate: (element: GUIElement) => boolean,
  options: DetectionOptions & { timeoutMs?: number; intervalMs?: number } = {}
): Promise<GUIElement | null> {
  const timeout = options.timeoutMs || 10000;
  const interval = options.intervalMs || 500;
  const startTime = nowMs();
  
  log.info("Waiting for element");
  
  while (nowMs() - startTime < timeout) {
    const elements = await detectElements(options);
    const found = elements.find(predicate);
    
    if (found) {
      log.info("Element found");
      return found;
    }
    
    await sleep(interval);
  }
  
  log.warn("Timeout waiting for element");
  return null;
}

/**
 * Get element hierarchy
 */
export async function getElementHierarchy(
  options: DetectionOptions = {}
): Promise<GUIElement[]> {
  const elements = await detectElements(options);
  
  // Build parent-child relationships
  const elementMap = new Map(elements.map(e => [e.id, e]));
  const roots: GUIElement[] = [];
  
  for (const element of elements) {
    // Find parent (element that contains this element)
    let parent: GUIElement | undefined;
    
    for (const other of elements) {
      if (other.id === element.id) continue;
      
      // Check if other contains element
      if (
        other.bounds.x <= element.bounds.x &&
        other.bounds.y <= element.bounds.y &&
        other.bounds.x + other.bounds.width >= element.bounds.x + element.bounds.width &&
        other.bounds.y + other.bounds.height >= element.bounds.y + element.bounds.height
      ) {
        // Prefer smaller parent (closer in hierarchy)
        if (!parent || 
            (parent.bounds.width * parent.bounds.height) > 
            (other.bounds.width * other.bounds.height)) {
          parent = other;
        }
      }
    }
    
    if (parent) {
      element.parent = parent.id;
      if (!parent.children) parent.children = [];
      parent.children.push(element);
    } else {
      roots.push(element);
    }
  }
  
  return roots;
}

// Export detection utilities
export const GUIDetection = {
  detectElements,
  findElementByText,
  findElementsByType,
  findElementAtPosition,
  waitForElement,
  getElementHierarchy,
  clearElementCache,
};

export default GUIDetection;
