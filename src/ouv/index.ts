/**
 * OpenOxygen - OUV Core Module
 *
 * Based on 26w15aB-26w15aHRoadmap.md refactoring
 *
 * Core Features:
 * - Hybrid multi-VLM + UIA architecture
 * - Built-in OUV vector database
 * - OSR (OxygenStepRecorder) system
 * - Element selector and reader
 * - OUV deep learning reflection and prediction
 * - OUV memory module
 *
 * Pipeline: Precise Recognition -> Prediction -> Precise Coordinate Acquisition -> Precise Operation -> Precise Reflection
 */

import { createSubsystemLogger } from "../logging/index.js";
import { GlobalMemory } from "../memory/global/index.js";
import { generateId, nowMs } from "../utils/index.js";
import Database from "better-sqlite3";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const log = createSubsystemLogger("ouv/core");

// OUV Configuration
export interface OUVConfig {
  // VLM Configuration
  vlmProviders: VLMProvider[];
  primaryVLM: string;

  // UIA Configuration
  uiaTimeout: number;
  uiaRetryCount: number;

  // OSR Configuration
  osrEnabled: boolean;
  osrAutoRecord: boolean;

  // Vector Database Configuration
  vectorDbPath: string;
  vectorDimension: number;

  // Memory Configuration
  memoryEnabled: boolean;
  reflectionEnabled: boolean;
  predictionEnabled: boolean;
}

// VLM Provider Interface
export interface VLMProvider {
  name: string;
  endpoint: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// UI Element Interface
export interface UIElement {
  id: string;
  type: string;
  name?: string;
  description?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  source: "vlm" | "uia" | "memory" | "hybrid";
  metadata?: Record<string, unknown>;
}

// OUV State
interface OUVState {
  db: Database.Database | null;
  config: OUVConfig;
  initialized: boolean;
}

// Global state
const state: OUVState = {
  db: null,
  config: {
    vlmProviders: [],
    primaryVLM: "qwen3-vl:4b",
    uiaTimeout: 5000,
    uiaRetryCount: 3,
    osrEnabled: true,
    osrAutoRecord: false,
    vectorDbPath: "./.state/ouv.db",
    vectorDimension: 1536,
    memoryEnabled: true,
    reflectionEnabled: true,
    predictionEnabled: true,
  },
  initialized: false,
};

// === Initialization ===

/**
 * Initialize OUV system
 */
export async function initializeOUV(config?: Partial<OUVConfig>): Promise<void> {
  if (state.initialized) {
    log.warn("OUV already initialized");
    return;
  }

  // Merge config
  state.config = { ...state.config, ...config };

  // Initialize vector database
  await initializeVectorDB();

  // Initialize memory
  if (state.config.memoryEnabled) {
    await initializeMemory();
  }

  state.initialized = true;
  log.info("OUV initialized successfully");
}

/**
 * Initialize vector database
 */
async function initializeVectorDB(): Promise<void> {
  const dbPath = state.config.vectorDbPath;
  const dir = join(dbPath, "..");
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  state.db = new Database(dbPath);
  
  // Create tables
  state.db.exec(`
    CREATE TABLE IF NOT EXISTS elements (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT,
      description TEXT,
      bounds_x INTEGER,
      bounds_y INTEGER,
      bounds_width INTEGER,
      bounds_height INTEGER,
      confidence REAL,
      source TEXT,
      metadata TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS element_vectors (
      element_id TEXT PRIMARY KEY,
      vector BLOB,
      FOREIGN KEY (element_id) REFERENCES elements(id)
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      element_id TEXT,
      action TEXT,
      result TEXT,
      timestamp INTEGER,
      FOREIGN KEY (element_id) REFERENCES elements(id)
    );

    CREATE INDEX IF NOT EXISTS idx_elements_type ON elements(type);
    CREATE INDEX IF NOT EXISTS idx_elements_name ON elements(name);
    CREATE INDEX IF NOT EXISTS idx_interactions_time ON interactions(timestamp);
  `);

  log.info("Vector database initialized");
}

/**
 * Initialize memory system
 */
async function initializeMemory(): Promise<void> {
  // Memory system is already initialized via GlobalMemory
  log.info("Memory system initialized");
}

// === Element Detection ===

/**
 * Detect UI elements using hybrid approach
 */
export async function detectElements(
  screenshotBase64: string,
  options: {
    useVLM?: boolean;
    useUIA?: boolean;
    useMemory?: boolean;
  } = {},
): Promise<UIElement[]> {
  const { useVLM = true, useUIA = true, useMemory = true } = options;
  const elements: UIElement[] = [];
  const elementMap = new Map<string, UIElement>();

  // VLM detection
  if (useVLM) {
    try {
      const vlmElements = await detectWithVLM(screenshotBase64);
      for (const elem of vlmElements) {
        elementMap.set(elem.id, elem);
      }
    } catch (error) {
      log.error(`VLM detection failed: ${error}`);
    }
  }

  // UIA detection
  if (useUIA) {
    try {
      const uiaElements = await detectWithUIA();
      for (const elem of uiaElements) {
        const existing = elementMap.get(elem.id);
        if (existing) {
          // Merge with existing
          mergeElements(existing, elem);
        } else {
          elementMap.set(elem.id, elem);
        }
      }
    } catch (error) {
      log.error(`UIA detection failed: ${error}`);
    }
  }

  // Memory lookup
  if (useMemory) {
    try {
      const memoryElements = await lookupInMemory(screenshotBase64);
      for (const elem of memoryElements) {
        const existing = elementMap.get(elem.id);
        if (existing) {
          mergeElements(existing, elem);
        } else {
          elementMap.set(elem.id, elem);
        }
      }
    } catch (error) {
      log.error(`Memory lookup failed: ${error}`);
    }
  }

  return Array.from(elementMap.values());
}

/**
 * Detect elements using VLM
 */
async function detectWithVLM(screenshotBase64: string): Promise<UIElement[]> {
  // TODO: Implement VLM-based detection
  // This would call the inference engine with a vision model
  log.debug("VLM detection not yet implemented");
  return [];
}

/**
 * Detect elements using UIA
 */
async function detectWithUIA(): Promise<UIElement[]> {
  // TODO: Implement UIA-based detection
  // This would use the native UIA module
  log.debug("UIA detection not yet implemented");
  return [];
}

/**
 * Lookup elements in memory
 */
async function lookupInMemory(screenshotBase64: string): Promise<UIElement[]> {
  // TODO: Implement memory-based lookup
  log.debug("Memory lookup not yet implemented");
  return [];
}

/**
 * Merge element data from multiple sources
 */
function mergeElements(base: UIElement, other: UIElement): void {
  // Take higher confidence
  if (other.confidence > base.confidence) {
    base.confidence = other.confidence;
    base.bounds = other.bounds;
  }
  
  // Merge metadata
  base.metadata = { ...base.metadata, ...other.metadata };
  
  // Update source to hybrid
  if (base.source !== other.source) {
    base.source = "hybrid";
  }
}

// === Element Interaction ===

/**
 * Find element by description
 */
export async function findElement(
  description: string,
  screenshotBase64?: string,
): Promise<UIElement | null> {
  // First try exact match from memory
  if (state.db) {
    const row = state.db.prepare(
      "SELECT * FROM elements WHERE name = ? OR description = ? LIMIT 1"
    ).get(description, description) as any;

    if (row) {
      return rowToElement(row);
    }
  }

  // Then try detection
  if (screenshotBase64) {
    const elements = await detectElements(screenshotBase64);
    
    // Find best match
    const match = elements.find(e =>
      e.name?.toLowerCase().includes(description.toLowerCase()) ||
      e.description?.toLowerCase().includes(description.toLowerCase()),
    );

    return match || null;
  }

  return null;
}

/**
 * Click element
 */
export async function clickElement(element: UIElement): Promise<boolean> {
  const centerX = element.bounds.x + element.bounds.width / 2;
  const centerY = element.bounds.y + element.bounds.height / 2;

  log.info(`Clicking element at (${centerX}, ${centerY})`);

  // TODO: Implement actual click via native module
  // await native.mouseMove(centerX, centerY);
  // await native.mouseClick(0);

  // Record interaction
  await recordInteraction(element.id, "click", "success");

  return true;
}

/**
 * Type text into element
 */
export async function typeIntoElement(
  element: UIElement,
  text: string,
): Promise<boolean> {
  // First click to focus
  await clickElement(element);

  log.info(`Typing text into element: ${text.substring(0, 50)}...`);

  // TODO: Implement actual typing via native module
  // await native.typeText(text);

  // Record interaction
  await recordInteraction(element.id, "type", "success");

  return true;
}

// === Reflection and Prediction ===

/**
 * Record interaction for reflection
 */
async function recordInteraction(
  elementId: string,
  action: string,
  result: string,
): Promise<void> {
  if (!state.db) return;

  state.db.prepare(
    `INSERT INTO interactions (id, element_id, action, result, timestamp)
     VALUES (?, ?, ?, ?, ?)`
  ).run(generateId("int"), elementId, action, result, nowMs());

  log.debug(`Recorded interaction: ${action} on ${elementId}`);
}

/**
 * Reflect on past interactions
 */
export async function reflect(
  elementId?: string,
): Promise<{
  success: boolean;
  insights: string[];
}> {
  if (!state.db) {
    return { success: false, insights: [] };
  }

  const query = elementId
    ? "SELECT * FROM interactions WHERE element_id = ? ORDER BY timestamp DESC LIMIT 100"
    : "SELECT * FROM interactions ORDER BY timestamp DESC LIMIT 100";

  const params = elementId ? [elementId] : [];
  const interactions = state.db.prepare(query).all(...params) as any[];

  // Analyze patterns
  const insights: string[] = [];
  const actionCounts = new Map<string, number>();
  
  for (const int of interactions) {
    actionCounts.set(int.action, (actionCounts.get(int.action) || 0) + 1);
  }

  // Generate insights
  for (const [action, count] of actionCounts.entries()) {
    insights.push(`Action "${action}" performed ${count} times`);
  }

  return { success: true, insights };
}

/**
 * Predict next action
 */
export async function predict(
  context: {
    currentScreen?: string;
    recentActions?: string[];
  },
): Promise<{
  predictedAction?: string;
  confidence: number;
  alternatives: string[];
}> {
  // TODO: Implement prediction based on learned patterns
  log.debug("Prediction not yet implemented");
  
  return {
    confidence: 0,
    alternatives: [],
  };
}

// === Utilities ===

function rowToElement(row: any): UIElement {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    bounds: {
      x: row.bounds_x,
      y: row.bounds_y,
      width: row.bounds_width,
      height: row.bounds_height,
    },
    confidence: row.confidence,
    source: row.source,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

// === Exports ===

export {
  initializeOUV,
  detectElements,
  findElement,
  clickElement,
  typeIntoElement,
  reflect,
  predict,
};

export default {
  initialize: initializeOUV,
  detectElements,
  findElement,
  clickElement,
  typeIntoElement,
  reflect,
  predict,
};
