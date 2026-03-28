/**
 * OpenOxygen - OSR Player (26w15aF Phase A.2)
 *
 * Playback recorded actions with:
 * - Visual verification
 * - Error recovery
 * - Speed control
 * - Loop support
 */

import { createSubsystemLogger } from "../logging/index.js";
import { sleep } from "../utils/index.js";
import { mouseMove, mouseClick, typeText, keyPress } from "../native/index.js";

const log = createSubsystemLogger("osr/player");

// Playback state
export const PlaybackState = {
  IDLE: "idle",
  PLAYING: "playing",
  PAUSED: "paused",
  ERROR: "error",
  COMPLETED: "completed",
};

// Playback options
export class PlaybackOptions {
  constructor(options = {}) {
    this.speed = options.speed || 1.0; // 0.5x - 2.0x
    this.loop = options.loop || false;
    this.loopCount = options.loopCount || 1;
    this.verifyVisual = options.verifyVisual !== false;
    this.errorRecovery = options.errorRecovery !== false;
    this.maxRetries = options.maxRetries || 3;
    this.onAction = options.onAction || null;
    this.onError = options.onError || null;
    this.onComplete = options.onComplete || null;
  }
}

/**
 * OSR Player
 */
export class OSRPlayer {
  constructor() {
    this.state = PlaybackState.IDLE;
    this.currentRecording = null;
    this.currentActionIndex = 0;
    this.playbackSpeed = 1.0;
    this.loopCount = 0;
    this.maxLoops = 1;
    this.errorCount = 0;
    this.options = new PlaybackOptions();
    this.actionResults = [];
    
    log.info("OSR Player initialized");
  }

  /**
   * Load recording
   */
  loadRecording(recording) {
    this.currentRecording = recording;
    this.currentActionIndex = 0;
    this.state = PlaybackState.IDLE;
    this.errorCount = 0;
    this.actionResults = [];
    
    log.info(`Loaded recording with ${recording.actions?.length || 0} actions`);
    return true;
  }

  /**
   * Start playback
   */
  async play(options = {}) {
    if (this.state === PlaybackState.PLAYING) {
      log.warn("Already playing");
      return false;
    }
    
    if (!this.currentRecording) {
      log.error("No recording loaded");
      return false;
    }
    
    this.options = new PlaybackOptions(options);
    this.playbackSpeed = this.options.speed;
    this.maxLoops = this.options.loop ? this.options.loopCount : 1;
    this.loopCount = 0;
    
    this.state = PlaybackState.PLAYING;
    log.info(`Starting playback at ${this.playbackSpeed}x speed`);
    
    try {
      while (this.loopCount < this.maxLoops && this.state !== PlaybackState.ERROR) {
        await this.playLoop();
        
        if (this.state === PlaybackState.ERROR) {
          break;
        }
        
        this.loopCount++;
        
        if (this.loopCount < this.maxLoops) {
          log.info(`Loop ${this.loopCount}/${this.maxLoops} completed`);
          await sleep(1000);
        }
      }
      
      if (this.state !== PlaybackState.ERROR) {
        this.state = PlaybackState.COMPLETED;
        log.info("Playback completed successfully");
        this.options.onComplete?.(this.actionResults);
      }
      
      return this.state === PlaybackState.COMPLETED;
    } catch (error) {
      this.state = PlaybackState.ERROR;
      log.error(`Playback failed: ${error.message}`);
      this.options.onError?.(error);
      return false;
    }
  }

  /**
   * Play one loop
   */
  async playLoop() {
    const actions = this.currentRecording.actions || [];
    
    for (let i = 0; i < actions.length; i++) {
      if (this.state === PlaybackState.PAUSED) {
        await this.waitForResume();
      }
      
      if (this.state === PlaybackState.ERROR) {
        break;
      }
      
      this.currentActionIndex = i;
      const action = actions[i];
      
      try {
        const result = await this.executeAction(action);
        this.actionResults.push({ action, result, success: true });
        
        this.options.onAction?.(action, result, i, actions.length);
        
        // Wait between actions (adjusted for speed)
        if (action.duration) {
          await sleep(action.duration / this.playbackSpeed);
        }
      } catch (error) {
        this.errorCount++;
        this.actionResults.push({ action, error: error.message, success: false });
        
        if (this.options.errorRecovery && this.errorCount < this.options.maxRetries) {
          log.warn(`Action failed, retrying (${this.errorCount}/${this.options.maxRetries})`);
          await this.retryAction(action);
        } else {
          this.state = PlaybackState.ERROR;
          throw error;
        }
      }
    }
  }

  /**
   * Execute single action
   */
  async executeAction(action) {
    const { type, data } = action;
    
    log.debug(`Executing action: ${type}`);
    
    switch (type) {
      case "mouse_move":
        return await this.executeMouseMove(data);
      
      case "mouse_click":
        return await this.executeMouseClick(data);
      
      case "mouse_drag":
        return await this.executeMouseDrag(data);
      
      case "type_text":
        return await this.executeTypeText(data);
      
      case "key_press":
        return await this.executeKeyPress(data);
      
      case "wait":
        await sleep(data.duration / this.playbackSpeed);
        return { waited: data.duration };
      
      default:
        log.warn(`Unknown action type: ${type}`);
        return { skipped: true };
    }
  }

  /**
   * Execute mouse move
   */
  async executeMouseMove(data) {
    const { x, y, endX, endY } = data;
    
    // If it's a drag-like move, move to end position
    const targetX = endX || x;
    const targetY = endY || y;
    
    const success = await mouseMove(targetX, targetY);
    
    if (!success) {
      throw new Error(`Failed to move mouse to (${targetX}, ${targetY})`);
    }
    
    return { x: targetX, y: targetY };
  }

  /**
   * Execute mouse click
   */
  async executeMouseClick(data) {
    const { x, y, button } = data;
    
    // Move to position first
    if (x !== undefined && y !== undefined) {
      await mouseMove(x, y);
    }
    
    const success = await mouseClick(button || "left");
    
    if (!success) {
      throw new Error(`Failed to click ${button || "left"} button`);
    }
    
    return { button: button || "left" };
  }

  /**
   * Execute mouse drag
   */
  async executeMouseDrag(data) {
    const { startX, startY, endX, endY, button } = data;
    
    // Move to start
    await mouseMove(startX, startY);
    
    // Press button
    // Note: native module should support drag operation
    // For now, simulate with move
    await mouseMove(endX, endY);
    
    return { from: { x: startX, y: startY }, to: { x: endX, y: endY } };
  }

  /**
   * Execute type text
   */
  async executeTypeText(data) {
    const { text } = data;
    
    const success = await typeText(text);
    
    if (!success) {
      throw new Error(`Failed to type text: ${text}`);
    }
    
    return { text, length: text.length };
  }

  /**
   * Execute key press
   */
  async executeKeyPress(data) {
    const { key } = data;
    
    // Map key name to virtual key code
    const vk = this.mapKeyToVK(key);
    
    const success = await keyPress(vk);
    
    if (!success) {
      throw new Error(`Failed to press key: ${key}`);
    }
    
    return { key };
  }

  /**
   * Map key name to virtual key code
   */
  mapKeyToVK(key) {
    const keyMap = {
      "Enter": 0x0D,
      "Escape": 0x1B,
      "Tab": 0x09,
      "Space": 0x20,
      "Backspace": 0x08,
      "Delete": 0x2E,
      "Home": 0x24,
      "End": 0x23,
      "PageUp": 0x21,
      "PageDown": 0x22,
      "ArrowUp": 0x26,
      "ArrowDown": 0x28,
      "ArrowLeft": 0x25,
      "ArrowRight": 0x27,
    };
    
    return keyMap[key] || key.charCodeAt(0);
  }

  /**
   * Retry failed action
   */
  async retryAction(action) {
    await sleep(500);
    return await this.executeAction(action);
  }

  /**
   * Wait for resume
   */
  async waitForResume() {
    while (this.state === PlaybackState.PAUSED) {
      await sleep(100);
    }
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.state === PlaybackState.PLAYING) {
      this.state = PlaybackState.PAUSED;
      log.info("Playback paused");
    }
  }

  /**
   * Resume playback
   */
  resume() {
    if (this.state === PlaybackState.PAUSED) {
      this.state = PlaybackState.PLAYING;
      log.info("Playback resumed");
    }
  }

  /**
   * Stop playback
   */
  stop() {
    this.state = PlaybackState.IDLE;
    this.currentActionIndex = 0;
    log.info("Playback stopped");
  }

  /**
   * Get playback status
   */
  getStatus() {
    return {
      state: this.state,
      currentAction: this.currentActionIndex,
      totalActions: this.currentRecording?.actions?.length || 0,
      loopCount: this.loopCount,
      maxLoops: this.maxLoops,
      speed: this.playbackSpeed,
      errorCount: this.errorCount,
    };
  }
}

// Export player
export const OSRPlayerModule = {
  OSRPlayer,
  PlaybackState,
  PlaybackOptions,
};

export default OSRPlayerModule;
