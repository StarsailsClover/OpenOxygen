/**
 * OpenOxygen - Ollama Auto-Launcher Module (26w15aD Phase 7)
 *
 * Automatically detects and launches Ollama if not running
 * - Checks if Ollama is already running
 * - Attempts to start Ollama if available
 * - Waits for Ollama to be ready
 * - Provides status feedback
 */

import { createSubsystemLogger } from "../logging/index.js";
import { sleep } from "../utils/index.js";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

const log = createSubsystemLogger("ollama/launcher");
const execAsync = promisify(exec);

// Ollama configuration
const OLLAMA_DEFAULT_PORT = 11434;
const OLLAMA_HOST = process.env.OLLAMA_HOST || `http://localhost:${OLLAMA_DEFAULT_PORT}`;
const OLLAMA_STARTUP_TIMEOUT = 30000; // 30 seconds
const OLLAMA_STARTUP_CHECK_INTERVAL = 1000; // 1 second

/**
 * Check if Ollama is already running
 */
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Find Ollama executable path
 */
export async function findOllamaExecutable(): Promise<string | null> {
  const possiblePaths = [
    // Windows
    "C:\\Program Files\\Ollama\\ollama.exe",
    "C:\\Program Files (x86)\\Ollama\\ollama.exe",
    `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe`,
    `${process.env.USERPROFILE}\\AppData\\Local\\Programs\\Ollama\\ollama.exe`,
    // macOS
    "/usr/local/bin/ollama",
    "/opt/homebrew/bin/ollama",
    "~/ollama",
    // Linux
    "/usr/bin/ollama",
    "/usr/local/bin/ollama",
    "/snap/bin/ollama",
  ];

  // Check environment variable
  if (process.env.OLLAMA_PATH) {
    possiblePaths.unshift(process.env.OLLAMA_PATH);
  }

  // Check PATH
  try {
    const { stdout } = await execAsync("where ollama 2>nul || which ollama 2>/dev/null");
    const pathFromEnv = stdout.trim().split("\n")[0];
    if (pathFromEnv) {
      possiblePaths.unshift(pathFromEnv);
    }
  } catch {
    // Ignore error
  }

  // Check each path
  for (const exePath of possiblePaths) {
    const expandedPath = exePath.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");
    if (fs.existsSync(expandedPath)) {
      log.info(`Found Ollama at: ${expandedPath}`);
      return expandedPath;
    }
  }

  return null;
}

/**
 * Start Ollama server
 */
export async function startOllama(executablePath?: string): Promise<boolean> {
  const exePath = executablePath || (await findOllamaExecutable());
  
  if (!exePath) {
    log.error("Ollama executable not found. Please install Ollama from https://ollama.com");
    return false;
  }

  log.info(`Starting Ollama from: ${exePath}`);

  try {
    // Spawn Ollama process
    const ollamaProcess = spawn(exePath, ["serve"], {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
    });

    // Unref so it doesn't block Node.js exit
    ollamaProcess.unref();

    log.info(`Ollama process started with PID: ${ollamaProcess.pid}`);
    return true;
  } catch (error: any) {
    log.error(`Failed to start Ollama: ${error.message}`);
    return false;
  }
}

/**
 * Wait for Ollama to be ready
 */
export async function waitForOllama(
  timeoutMs: number = OLLAMA_STARTUP_TIMEOUT,
  checkIntervalMs: number = OLLAMA_STARTUP_CHECK_INTERVAL
): Promise<boolean> {
  const startTime = Date.now();
  
  log.info("Waiting for Ollama to be ready...");

  while (Date.now() - startTime < timeoutMs) {
    if (await isOllamaRunning()) {
      log.info("Ollama is ready!");
      return true;
    }
    
    await sleep(checkIntervalMs);
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed % 5 === 0) {
      log.debug(`Still waiting for Ollama... (${elapsed}s elapsed)`);
    }
  }

  log.error(`Ollama failed to start within ${timeoutMs}ms`);
  return false;
}

/**
 * Ensure Ollama is running (check and start if needed)
 */
export async function ensureOllamaRunning(): Promise<boolean> {
  // First check if already running
  if (await isOllamaRunning()) {
    log.debug("Ollama is already running");
    return true;
  }

  log.info("Ollama is not running, attempting to start...");

  // Try to start Ollama
  const started = await startOllama();
  if (!started) {
    return false;
  }

  // Wait for it to be ready
  return await waitForOllama();
}

/**
 * Get Ollama status and available models
 */
export async function getOllamaStatus(): Promise<{
  running: boolean;
  version?: string;
  models: string[];
  error?: string;
}> {
  const running = await isOllamaRunning();
  
  if (!running) {
    return { running: false, models: [], error: "Ollama is not running" };
  }

  try {
    // Get version
    const versionResponse = await fetch(`${OLLAMA_HOST}/api/version`, {
      signal: AbortSignal.timeout(5000),
    });
    const versionData = await versionResponse.json() as { version: string };

    // Get models
    const tagsResponse = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    const tagsData = await tagsResponse.json() as { models: Array<{ name: string }> };

    return {
      running: true,
      version: versionData.version,
      models: tagsData.models?.map(m => m.name) || [],
    };
  } catch (error: any) {
    return {
      running: true,
      models: [],
      error: `Failed to get Ollama status: ${error.message}`,
    };
  }
}

/**
 * Check if specific model is available
 */
export async function isModelAvailable(modelName: string): Promise<boolean> {
  const status = await getOllamaStatus();
  
  if (!status.running) {
    return false;
  }

  // Check exact match or partial match
  return status.models.some(model => 
    model === modelName || 
    model.startsWith(modelName + ":") ||
    modelName.startsWith(model.split(":")[0])
  );
}

/**
 * Pull a model if not available
 */
export async function pullModel(modelName: string): Promise<boolean> {
  if (await isModelAvailable(modelName)) {
    log.info(`Model ${modelName} is already available`);
    return true;
  }

  log.info(`Pulling model: ${modelName}`);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: modelName, stream: false }),
      signal: AbortSignal.timeout(300000), // 5 minute timeout
    });

    if (response.ok) {
      log.info(`Model ${modelName} pulled successfully`);
      return true;
    } else {
      log.error(`Failed to pull model: ${response.statusText}`);
      return false;
    }
  } catch (error: any) {
    log.error(`Failed to pull model: ${error.message}`);
    return false;
  }
}

// Export launcher utilities
export const OllamaLauncher = {
  isOllamaRunning,
  findOllamaExecutable,
  startOllama,
  waitForOllama,
  ensureOllamaRunning,
  getOllamaStatus,
  isModelAvailable,
  pullModel,
};

export default OllamaLauncher;
