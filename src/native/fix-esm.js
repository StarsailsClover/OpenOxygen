/**
 * OpenOxygen - Native Module ESM Fix (26w15aF Phase A.3)
 *
 * Phase A.3: Complete ESM compatibility for native modules
 * - Proper ESM exports
 * - Named exports support
 * - Type definitions
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create require for ESM
const require = createRequire(import.meta.url);

/**
 * Native module wrapper with full ESM support
 */
class NativeModuleWrapper {
  constructor() {
    this.module = null;
    this.loaded = false;
    this.exports = {};
  }

  /**
   * Load native module with proper ESM wrapper
   */
  async load() {
    if (this.loaded) return this.module;

    try {
      // Try to load the native module
      const nativePath = path.join(__dirname, 'core-native.win32-x64-msvc.node');
      
      // Use createRequire to load .node file
      this.module = require(nativePath);
      this.loaded = true;
      
      // Wrap all exports
      this.wrapExports();
      
      console.log('Native module loaded successfully');
      return this.module;
    } catch (error) {
      console.error('Failed to load native module:', error.message);
      return null;
    }
  }

  /**
   * Wrap native exports with ESM compatibility
   */
  wrapExports() {
    if (!this.module) return;

    // Mouse functions
    this.exports.mouseMove = async (x, y) => {
      return this.module.mouseMove?.(x, y) ?? { success: false };
    };

    this.exports.mouseClick = async (button) => {
      return this.module.mouseClick?.(0, 0, button) ?? { success: false };
    };

    this.exports.mouseDrag = async (startX, startY, endX, endY, button) => {
      return this.module.mouseDrag?.(startX, startY, endX, endY, button) ?? { success: false };
    };

    this.exports.mouseScroll = async (delta) => {
      return this.module.mouseScroll?.(delta) ?? { success: false };
    };

    this.exports.getMousePosition = () => {
      return this.module.getMousePosition?.() ?? { x: 0, y: 0 };
    };

    // Keyboard functions
    this.exports.keyPress = async (keyCode) => {
      return this.module.keyPress?.(keyCode) ?? { success: false };
    };

    this.exports.keyCombination = async (keys) => {
      return this.module.keyCombination?.(keys) ?? { success: false };
    };

    this.exports.typeText = async (text) => {
      return this.module.typeText?.(text) ?? { success: false };
    };

    // Screen functions
    this.exports.captureScreen = (outputPath) => {
      return this.module.captureScreen?.(outputPath) ?? { success: false };
    };

    this.exports.getScreenSize = () => {
      return this.module.getScreenSize?.() ?? { width: 1920, height: 1080 };
    };

    // Window functions
    this.exports.getForegroundWindow = () => {
      return this.module.getForegroundWindow?.() ?? null;
    };

    this.exports.getWindowRect = (hwnd) => {
      return this.module.getWindowRect?.(hwnd) ?? { x: 0, y: 0, width: 0, height: 0 };
    };

    // System functions
    this.exports.getSystemInfo = () => {
      return this.module.getSystemInfo?.() ?? { platform: 'win32', arch: 'x64' };
    };

    this.exports.isElevated = () => {
      return this.module.isElevated?.() ?? false;
    };
  }

  /**
   * Get wrapped exports
   */
  getExports() {
    return this.exports;
  }
}

// Singleton instance
const nativeWrapper = new NativeModuleWrapper();

// Initialize on load
await nativeWrapper.load();

// Export wrapped functions
export const {
  mouseMove,
  mouseClick,
  mouseDrag,
  mouseScroll,
  getMousePosition,
  keyPress,
  keyCombination,
  typeText,
  captureScreen,
  getScreenSize,
  getForegroundWindow,
  getWindowRect,
  getSystemInfo,
  isElevated,
} = nativeWrapper.getExports();

// Export wrapper class for advanced usage
export { NativeModuleWrapper, nativeWrapper };

// Default export
export default nativeWrapper.getExports();
