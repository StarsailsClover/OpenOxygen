/**
 * OpenOxygen - Native Module ESM Adapter (26w15aF Phase A.2)
 *
 * Provides ESM/CJS dual-mode support for native modules
 * - Dynamic import fallback
 * - require() polyfill for ESM
 * - Cross-platform compatibility
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create require function for ESM
const require = createRequire(import.meta.url);

/**
 * Load native module with ESM/CJS compatibility
 */
export async function loadNativeModuleESM() {
  try {
    // Try ESM dynamic import first
    const nativeModule = await import('./core-native.win32-x64-msvc.node');
    return nativeModule.default || nativeModule;
  } catch (esmError) {
    console.warn('ESM import failed, trying CJS require:', esmError.message);
    
    try {
      // Fallback to CJS require
      const nativeModule = require('./core-native.win32-x64-msvc.node');
      return nativeModule;
    } catch (cjsError) {
      console.error('Failed to load native module:', cjsError.message);
      return null;
    }
  }
}

/**
 * Safe native function caller
 */
export async function callNativeFunction(moduleName, functionName, ...args) {
  const nativeModule = await loadNativeModuleESM();
  
  if (!nativeModule || !nativeModule[functionName]) {
    console.warn(`Native function ${functionName} not available`);
    return null;
  }
  
  try {
    return nativeModule[functionName](...args);
  } catch (error) {
    console.error(`Native function ${functionName} failed:`, error.message);
    return null;
  }
}

// Export adapter utilities
export const NativeESMAdapter = {
  loadNativeModuleESM,
  callNativeFunction,
};

export default NativeESMAdapter;
