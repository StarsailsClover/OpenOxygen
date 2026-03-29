/**
 * OpenOxygen - OUV (OxygenUltraVision) Core Module
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

// OUV Task Interface
export interface OUVTask {
  id: string;
  instruction: string;
  targetElement?: string;
  action: "click" | "type" | "scroll" | "drag" | "read" | "wait";
  parameters?: Record<string, unknown>;
  context?: {
    screenshot?: string;
    appName?: string;
    windowTitle?: string;
  };
}

// OUV Result Interface
export interface OUVResult {
  taskId: string;
  success: boolean;
  action: string;
  targetElement?: UIElement;
  executionTime: number;
  reflection?: ReflectionResult;
  error?: string;
}

// Reflection Result
export interface ReflectionResult {
  success: boolean;
  confidence: number;
  observations: string[];
  suggestions: string[];
  learnedPattern?: string;
}

// OSR Record
export interface OSRRecord {
  id: string;
  timestamp: number;
  screenshotPath: string;
  elements: UIElement[];
  action: string;
  result: "success" | "failure" | "partial";
  vlmDescription?: string;
  reflection?: string;
  appName?: string;
}

// Vector Memory Entry
export interface VectorMemoryEntry {
  id: string;
  elementId: string;
  appName: string;
  elementType: string;
  embedding: number[];
  position: { x: number; y: number };
  successCount: number;
  failureCount: number;
  lastAccessed: number;
}

// OUV Core Class
export class OxygenUltraVision {
  private config: OUVConfig;
  private memory: GlobalMemory;
  private vectorDb: Database.Database;
  private osrRecords: OSRRecord[] = [];
  private elementCache: Map<string, UIElement> = new Map();

  constructor(config: OUVConfig) {
    this.config = config;
    this.memory = new GlobalMemory(config.vectorDbPath);
    this.vectorDb = this.initializeVectorDatabase(config.vectorDbPath);

    log.info("OUV initialized with config:", {
      primaryVLM: config.primaryVLM,
      vlmProviders: config.vlmProviders.length,
      osrEnabled: config.osrEnabled,
      vectorDimension: config.vectorDimension,
    });
  }

  private initializeVectorDatabase(dbPath: string): Database.Database {
    const dir = join(dbPath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const db = new Database(dbPath);

    // Create vector memory table
    db.exec(`
      CREATE TABLE IF NOT EXISTS vector_memory (
        id TEXT PRIMARY KEY,
        element_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        element_type TEXT NOT NULL,
        embedding BLOB NOT NULL,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        last_accessed INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
      
      CREATE INDEX IF NOT EXISTS idx_element_app ON vector_memory(app_name);
      CREATE INDEX IF NOT EXISTS idx_element_type ON vector_memory(element_type);
      
      CREATE TABLE IF NOT EXISTS osr_records (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        screenshot_path TEXT,
        elements_json TEXT,
        action TEXT NOT NULL,
        result TEXT NOT NULL,
        vlm_description TEXT,
        reflection TEXT,
        app_name TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_osr_app ON osr_records(app_name);
      CREATE INDEX IF NOT EXISTS idx_osr_timestamp ON osr_records(timestamp);
    `);

    return db;
  }

  /**
   * Core Pipeline: Precise Recognition -> Prediction -> Operation -> Reflection
   */
  async executeTask(task: OUVTask): Promise<OUVResult> {
    const startTime = nowMs();

    try {
      // Step 1: Precise Recognition
      log.info(`Step 1: Detecting elements for task: ${task.instruction}`);
      const elements = await this.detectElements(task);

      if (elements.length === 0) {
        return {
          taskId: task.id,
          success: false,
          action: task.action,
          executionTime: nowMs() - startTime,
          error: "No elements detected",
        };
      }

      // Step 2: Prediction (if enabled)
      let targetElement = elements[0];
      if (this.config.predictionEnabled) {
        log.info("Step 2: Predicting optimal element");
        targetElement = await this.predictOptimalElement(elements, task);
      }

      // Step 3: Precise Operation
      log.info(
        `Step 3: Executing ${task.action} on element: ${targetElement.name || targetElement.id}`,
      );
      const operationResult = await this.executeOperation(targetElement, task);

      // Step 4: Reflection (if enabled)
      let reflection: ReflectionResult | undefined;
      if (this.config.reflectionEnabled) {
        log.info("Step 4: Reflecting on operation");
        reflection = await this.reflectOnOperation(
          task,
          targetElement,
          operationResult,
        );

        // Update memory with reflection results
        if (reflection.success) {
          await this.updateMemory(targetElement, true);
        } else {
          await this.updateMemory(targetElement, false);
        }
      }

      // Record OSR if enabled
      if (this.config.osrEnabled) {
        await this.recordOSR(
          task,
          elements,
          operationResult.success ? "success" : "failure",
        );
      }

      return {
        taskId: task.id,
        success: operationResult.success,
        action: task.action,
        targetElement,
        executionTime: nowMs() - startTime,
        reflection,
      };
    } catch (error) {
      log.error("OUV task execution failed:", error);
      return {
        taskId: task.id,
        success: false,
        action: task.action,
        executionTime: nowMs() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Step 1: Detect UI Elements using hybrid VLM + UIA approach
   */
  private async detectElements(task: OUVTask): Promise<UIElement[]> {
    const elements: UIElement[] = [];

    // Try UIA first (faster, more precise)
    try {
      const uiaElements = await this.detectWithUIA(task);
      elements.push(...uiaElements);
      log.info(`UIA detected ${uiaElements.length} elements`);
    } catch (error) {
      log.warn("UIA detection failed:", error);
    }

    // Try VLM for elements UIA missed
    try {
      const vlmElements = await this.detectWithVLM(task);
      // Merge with UIA results, avoiding duplicates
      for (const vlmEl of vlmElements) {
        const isDuplicate = elements.some((el) =>
          this.isSameElement(el, vlmEl),
        );
        if (!isDuplicate) {
          elements.push(vlmEl);
        }
      }
      log.info(`VLM detected ${vlmElements.length} unique elements`);
    } catch (error) {
      log.warn("VLM detection failed:", error);
    }

    // Try memory-based detection
    if (this.config.memoryEnabled && task.context?.appName) {
      try {
        const memoryElements = await this.detectFromMemory(task);
        for (const memEl of memoryElements) {
          const isDuplicate = elements.some((el) =>
            this.isSameElement(el, memEl),
          );
          if (!isDuplicate) {
            elements.push(memEl);
          }
        }
        log.info(`Memory provided ${memoryElements.length} elements`);
      } catch (error) {
        log.warn("Memory detection failed:", error);
      }
    }

    // Sort by confidence
    return elements.sort((a, b) => b.confidence - a.confidence);
  }

  private async detectWithUIA(task: OUVTask): Promise<UIElement[]> {
    // TODO: Integrate with actual UIA detector
    // This is a placeholder implementation
    log.info("Detecting elements with UIA...");

    // Simulate UIA detection
    return [
      {
        id: generateId("uia-el"),
        type: "button",
        name: "Search",
        bounds: { x: 100, y: 200, width: 80, height: 30 },
        confidence: 0.95,
        source: "uia",
      },
    ];
  }

  private async detectWithVLM(task: OUVTask): Promise<UIElement[]> {
    const provider = this.config.vlmProviders.find(
      (p) => p.name === this.config.primaryVLM,
    );
    if (!provider) {
      throw new Error(`VLM provider not found: ${this.config.primaryVLM}`);
    }

    log.info(`Detecting elements with VLM: ${provider.model}`);

    // TODO: Integrate with actual VLM API
    // This is a placeholder implementation
    return [
      {
        id: generateId("vlm-el"),
        type: "input",
        name: "search-input",
        description: "Search text input field",
        bounds: { x: 120, y: 205, width: 200, height: 25 },
        confidence: 0.88,
        source: "vlm",
      },
    ];
  }

  private async detectFromMemory(task: OUVTask): Promise<UIElement[]> {
    if (!task.context?.appName) return [];

    const stmt = this.vectorDb.prepare(`
      SELECT * FROM vector_memory 
      WHERE app_name = ? 
      ORDER BY success_count DESC, last_accessed DESC
      LIMIT 10
    `);

    const rows = stmt.all(task.context.appName) as any[];

    return rows.map((row) => ({
      id: row.element_id,
      type: row.element_type,
      bounds: { x: row.position_x, y: row.position_y, width: 100, height: 30 },
      confidence: 0.7, // Memory-based elements have lower confidence
      source: "memory",
      metadata: {
        successCount: row.success_count,
        failureCount: row.failure_count,
      },
    }));
  }

  private isSameElement(a: UIElement, b: UIElement): boolean {
    // Check if two elements are the same based on position overlap
    const overlapX = Math.abs(a.bounds.x - b.bounds.x) < 10;
    const overlapY = Math.abs(a.bounds.y - b.bounds.y) < 10;
    return overlapX && overlapY;
  }

  /**
   * Step 2: Predict optimal element based on task and history
   */
  private async predictOptimalElement(
    elements: UIElement[],
    task: OUVTask,
  ): Promise<UIElement> {
    // Simple scoring based on element type and task action
    const scoredElements = elements.map((el) => {
      let score = el.confidence;

      // Boost score based on element type matching task action
      if (task.action === "click" && ["button", "link"].includes(el.type)) {
        score += 0.1;
      }
      if (task.action === "type" && ["input", "textarea"].includes(el.type)) {
        score += 0.1;
      }

      // Boost based on memory success
      if (el.metadata?.successCount) {
        score += Math.min((el.metadata.successCount as number) * 0.02, 0.1);
      }

      return { element: el, score };
    });

    scoredElements.sort((a, b) => b.score - a.score);
    return scoredElements[0].element;
  }

  /**
   * Step 3: Execute operation on target element
   */
  private async executeOperation(
    element: UIElement,
    task: OUVTask,
  ): Promise<{ success: boolean }> {
    // TODO: Integrate with native input module
    log.info(
      `Executing ${task.action} at (${element.bounds.x}, ${element.bounds.y})`,
    );

    // Simulate operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    return { success: true };
  }

  /**
   * Step 4: Reflect on operation and learn
   */
  private async reflectOnOperation(
    task: OUVTask,
    element: UIElement,
    result: { success: boolean },
  ): Promise<ReflectionResult> {
    const observations: string[] = [];
    const suggestions: string[] = [];

    if (result.success) {
      observations.push(
        `Successfully executed ${task.action} on ${element.type}`,
      );
      observations.push(
        `Element located at (${element.bounds.x}, ${element.bounds.y})`,
      );

      if (element.source === "memory") {
        observations.push("Memory-based prediction was accurate");
      }
    } else {
      observations.push(`Failed to execute ${task.action}`);
      suggestions.push("Consider retrying with adjusted coordinates");
      suggestions.push("Try alternative element detection method");
    }

    return {
      success: result.success,
      confidence: element.confidence,
      observations,
      suggestions,
      learnedPattern: result.success
        ? `${task.action}:${element.type}:${element.bounds.x},${element.bounds.y}`
        : undefined,
    };
  }

  /**
   * Update memory with operation result
   */
  private async updateMemory(
    element: UIElement,
    success: boolean,
  ): Promise<void> {
    const stmt = this.vectorDb.prepare(`
      INSERT INTO vector_memory (
        id, element_id, app_name, element_type, embedding,
        position_x, position_y, success_count, failure_count, last_accessed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(element_id) DO UPDATE SET
        success_count = success_count + ?,
        failure_count = failure_count + ?,
        last_accessed = ?
    `);

    const embedding = new Array(this.config.vectorDimension)
      .fill(0)
      .map(() => Math.random());

    stmt.run(
      generateId("mem"),
      element.id,
      "unknown", // TODO: Get actual app name
      element.type,
      Buffer.from(new Float32Array(embedding).buffer),
      element.bounds.x,
      element.bounds.y,
      success ? 1 : 0,
      success ? 0 : 1,
      nowMs(),
      success ? 1 : 0,
      success ? 0 : 1,
      nowMs(),
    );
  }

  /**
   * Record OSR (OxygenStepRecorder) entry
   */
  private async recordOSR(
    task: OUVTask,
    elements: UIElement[],
    result: "success" | "failure" | "partial",
  ): Promise<void> {
    const record: OSRRecord = {
      id: generateId("osr"),
      timestamp: nowMs(),
      screenshotPath: task.context?.screenshot || "",
      elements,
      action: task.action,
      result,
      appName: task.context?.appName,
    };

    this.osrRecords.push(record);

    // Persist to database
    const stmt = this.vectorDb.prepare(`
      INSERT INTO osr_records (id, timestamp, screenshot_path, elements_json, action, result, app_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.timestamp,
      record.screenshotPath,
      JSON.stringify(elements),
      record.action,
      record.result,
      record.appName,
    );

    log.info(`OSR recorded: ${record.id}`);
  }

  /**
   * Get learning statistics
   */
  getStats(): {
    memoryEntries: number;
    osrRecords: number;
    elementCacheSize: number;
  } {
    const memCount = this.vectorDb
      .prepare("SELECT COUNT(*) as count FROM vector_memory")
      .get() as { count: number };
    const osrCount = this.vectorDb
      .prepare("SELECT COUNT(*) as count FROM osr_records")
      .get() as { count: number };

    return {
      memoryEntries: memCount.count,
      osrRecords: osrCount.count,
      elementCacheSize: this.elementCache.size,
    };
  }

  /**
   * Close and cleanup
   */
  close(): void {
    this.vectorDb.close();
    log.info("OUV closed");
  }
}

export default OxygenUltraVision;
