/**
 * OpenOxygen - OSR Enhanced Recorder (26w15aF Phase A.2)
 *
 * Enhanced recording system with:
 * - Smart action grouping
 * - Pattern recognition
 * - Cross-application compatibility
 * - Visual verification
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";

const log = createSubsystemLogger("osr/enhanced-recorder");

// Action types
export const ActionType = {
  MOUSE_MOVE: "mouse_move",
  MOUSE_CLICK: "mouse_click",
  MOUSE_DRAG: "mouse_drag",
  MOUSE_SCROLL: "mouse_scroll",
  KEY_PRESS: "key_press",
  KEY_COMBINATION: "key_combination",
  TYPE_TEXT: "type_text",
  WAIT: "wait",
  SCREENSHOT: "screenshot",
  WINDOW_FOCUS: "window_focus",
};

// Enhanced action
export class EnhancedAction {
  constructor(type, data, options = {}) {
    this.id = generateId("action");
    this.type = type;
    this.data = data;
    this.timestamp = nowMs();
    this.duration = options.duration || 0;
    this.screenshot = options.screenshot || null;
    this.windowInfo = options.windowInfo || null;
    this.confidence = options.confidence || 1.0;
  }
}

// Action pattern
export class ActionPattern {
  constructor(name, actions) {
    this.id = generateId("pattern");
    this.name = name;
    this.actions = actions;
    this.frequency = 1;
    this.lastUsed = nowMs();
  }
}

/**
 * Enhanced OSR Recorder
 */
export class EnhancedOSRRecorder {
  constructor() {
    this.recording = false;
    this.actions = [];
    this.patterns = new Map();
    this.startTime = 0;
    this.lastAction = null;
    this.windowHistory = [];
    
    log.info("Enhanced OSR Recorder initialized");
  }

  /**
   * Start recording
   */
  startRecording(options = {}) {
    if (this.recording) {
      log.warn("Recording already in progress");
      return false;
    }
    
    this.recording = true;
    this.actions = [];
    this.startTime = nowMs();
    this.lastAction = null;
    
    log.info("Recording started");
    return true;
  }

  /**
   * Stop recording
   */
  stopRecording() {
    if (!this.recording) {
      log.warn("No recording in progress");
      return null;
    }
    
    this.recording = false;
    const duration = nowMs() - this.startTime;
    
    // Optimize actions
    const optimized = this.optimizeActions(this.actions);
    
    const recording = {
      id: generateId("recording"),
      actions: optimized,
      duration,
      actionCount: optimized.length,
      patterns: Array.from(this.patterns.values()),
      timestamp: nowMs(),
    };
    
    log.info(`Recording stopped: ${optimized.length} actions in ${duration}ms`);
    return recording;
  }

  /**
   * Record action
   */
  recordAction(type, data, options = {}) {
    if (!this.recording) {
      return null;
    }
    
    const action = new EnhancedAction(type, data, options);
    
    // Skip duplicate actions
    if (this.isDuplicate(action)) {
      return null;
    }
    
    // Group similar actions
    if (this.shouldGroup(action)) {
      this.groupWithLast(action);
    } else {
      this.actions.push(action);
      this.lastAction = action;
    }
    
    // Learn patterns
    this.learnPattern(action);
    
    return action;
  }

  /**
   * Check if action is duplicate
   */
  isDuplicate(action) {
    if (!this.lastAction) return false;
    
    const timeDiff = action.timestamp - this.lastAction.timestamp;
    if (timeDiff > 100) return false; // Allow actions after 100ms
    
    // Check same type and similar data
    if (action.type !== this.lastAction.type) return false;
    
    const dataDiff = this.calculateDataDiff(action.data, this.lastAction.data);
    return dataDiff < 5; // Less than 5 pixels difference
  }

  /**
   * Calculate data difference
   */
  calculateDataDiff(data1, data2) {
    if (typeof data1 !== typeof data2) return Infinity;
    
    if (typeof data1 === "number") {
      return Math.abs(data1 - data2);
    }
    
    if (typeof data1 === "object") {
      let diff = 0;
      for (const key of Object.keys(data1)) {
        if (data2[key] !== undefined) {
          diff += this.calculateDataDiff(data1[key], data2[key]);
        }
      }
      return diff;
    }
    
    return data1 === data2 ? 0 : Infinity;
  }

  /**
   * Check if should group with last action
   */
  shouldGroup(action) {
    if (!this.lastAction) return false;
    
    // Group mouse moves
    if (action.type === ActionType.MOUSE_MOVE && 
        this.lastAction.type === ActionType.MOUSE_MOVE) {
      return true;
    }
    
    // Group scrolls
    if (action.type === ActionType.MOUSE_SCROLL && 
        this.lastAction.type === ActionType.MOUSE_SCROLL) {
      return true;
    }
    
    return false;
  }

  /**
   * Group with last action
   */
  groupWithLast(action) {
    if (action.type === ActionType.MOUSE_MOVE) {
      // Update last move to end position
      this.lastAction.data.endX = action.data.x;
      this.lastAction.data.endY = action.data.y;
      this.lastAction.duration = action.timestamp - this.lastAction.timestamp;
    } else if (action.type === ActionType.MOUSE_SCROLL) {
      // Accumulate scroll delta
      this.lastAction.data.delta += action.data.delta;
      this.lastAction.duration = action.timestamp - this.lastAction.timestamp;
    }
  }

  /**
   * Learn action patterns
   */
  learnPattern(action) {
    // Look for common sequences
    if (this.actions.length < 3) return;
    
    const last3 = this.actions.slice(-3);
    const patternKey = last3.map(a => a.type).join("-");
    
    if (this.patterns.has(patternKey)) {
      const pattern = this.patterns.get(patternKey);
      pattern.frequency++;
      pattern.lastUsed = nowMs();
    } else {
      this.patterns.set(patternKey, new ActionPattern(patternKey, last3));
    }
  }

  /**
   * Optimize actions
   */
  optimizeActions(actions) {
    const optimized = [];
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      // Remove redundant waits
      if (action.type === ActionType.WAIT && optimized.length > 0) {
        const last = optimized[optimized.length - 1];
        if (last.type === ActionType.WAIT) {
          last.duration += action.duration;
          continue;
        }
      }
      
      // Convert move+click to click at position
      if (action.type === ActionType.MOUSE_CLICK && i > 0) {
        const prev = actions[i - 1];
        if (prev.type === ActionType.MOUSE_MOVE) {
          action.data.x = prev.data.endX || prev.data.x;
          action.data.y = prev.data.endY || prev.data.y;
          optimized.pop(); // Remove the move
        }
      }
      
      optimized.push(action);
    }
    
    return optimized;
  }

  /**
   * Record mouse move
   */
  recordMouseMove(x, y, options = {}) {
    return this.recordAction(ActionType.MOUSE_MOVE, { x, y }, options);
  }

  /**
   * Record mouse click
   */
  recordMouseClick(x, y, button, options = {}) {
    return this.recordAction(ActionType.MOUSE_CLICK, { x, y, button }, options);
  }

  /**
   * Record key press
   */
  recordKeyPress(key, options = {}) {
    return this.recordAction(ActionType.KEY_PRESS, { key }, options);
  }

  /**
   * Record type text
   */
  recordTypeText(text, options = {}) {
    return this.recordAction(ActionType.TYPE_TEXT, { text }, options);
  }

  /**
   * Record wait
   */
  recordWait(duration, options = {}) {
    return this.recordAction(ActionType.WAIT, { duration }, { duration, ...options });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      recording: this.recording,
      actionCount: this.actions.length,
      patternCount: this.patterns.size,
      duration: this.recording ? nowMs() - this.startTime : 0,
    };
  }

  /**
   * Clear patterns
   */
  clearPatterns() {
    this.patterns.clear();
    log.info("Patterns cleared");
  }

  /**
   * Export recording
   */
  exportRecording(format = "json") {
    if (format === "json") {
      return JSON.stringify({
        actions: this.actions,
        patterns: Array.from(this.patterns.values()),
        timestamp: nowMs(),
      }, null, 2);
    }
    
    if (format === "javascript") {
      // Generate executable JavaScript
      let code = "// Auto-generated OSR script\n\n";
      code += "async function run() {\n";
      
      for (const action of this.actions) {
        switch (action.type) {
          case ActionType.MOUSE_MOVE:
            code += `  await mouseMove(${action.data.x}, ${action.data.y});\n`;
            break;
          case ActionType.MOUSE_CLICK:
            code += `  await mouseClick('${action.data.button}');\n`;
            break;
          case ActionType.TYPE_TEXT:
            code += `  await typeText('${action.data.text}');\n`;
            break;
          case ActionType.WAIT:
            code += `  await sleep(${action.duration});\n`;
            break;
        }
      }
      
      code += "}\n\nrun();\n";
      return code;
    }
    
    return null;
  }
}

// Export enhanced recorder
export const EnhancedOSR = {
  EnhancedOSRRecorder,
  ActionType,
  EnhancedAction,
  ActionPattern,
};

export default EnhancedOSR;
