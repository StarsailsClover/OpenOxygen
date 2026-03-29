/**
 * OpenOxygen - Multi-Environment Compatibility Testing (26w15aD Phase 7)
 *
 * Cross-platform testing framework for:
 * - Windows 10/11
 * - macOS 12+
 * - Linux (Ubuntu 20.04+)
 *
 * Tests core functionality across different environments
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import * as os from "node:os";
import * as process from "node:process";

const log = createSubsystemLogger("testing/multi-env");

// Environment types
export type Platform = "win32" | "darwin" | "linux";
export type Architecture = "x64" | "arm64" | "ia32";

// Environment info
export interface EnvironmentInfo {
  platform: Platform;
  arch: Architecture;
  nodeVersion: string;
  osRelease: string;
  cpuCount: number;
  totalMemory: number;
  freeMemory: number;
}

// Test result
export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  platform: Platform;
  timestamp: number;
}

// Test suite
export interface TestSuite {
  name: string;
  tests: TestFunction[];
}

// Test function type
type TestFunction = () => Promise<TestResult>;

/**
 * Get current environment info
 */
export function getEnvironmentInfo(): EnvironmentInfo {
  return {
    platform: process.platform as Platform,
    arch: process.arch as Architecture,
    nodeVersion: process.version,
    osRelease: os.release(),
    cpuCount: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
  };
}

/**
 * Check if running on supported platform
 */
export function isSupportedPlatform(): boolean {
  const supported: Platform[] = ["win32", "darwin", "linux"];
  return supported.includes(process.platform as Platform);
}

/**
 * Multi-environment test runner
 */
export class MultiEnvTestRunner {
  private results: TestResult[] = [];
  private env: EnvironmentInfo;

  constructor() {
    this.env = getEnvironmentInfo();
    log.info(
      `Test runner initialized on ${this.env.platform} (${this.env.arch})`,
    );
  }

  /**
   * Run a single test
   */
  async runTest(
    name: string,
    testFn: () => Promise<void>,
  ): Promise<TestResult> {
    const startTime = nowMs();
    const id = generateId("test");

    try {
      log.info(`Running test: ${name}`);
      await testFn();

      const result: TestResult = {
        id,
        name,
        passed: true,
        durationMs: nowMs() - startTime,
        platform: this.env.platform,
        timestamp: nowMs(),
      };

      this.results.push(result);
      log.info(`✓ Test passed: ${name} (${result.durationMs}ms)`);
      return result;
    } catch (error: any) {
      const result: TestResult = {
        id,
        name,
        passed: false,
        durationMs: nowMs() - startTime,
        error: error.message,
        platform: this.env.platform,
        timestamp: nowMs(),
      };

      this.results.push(result);
      log.error(`✗ Test failed: ${name} - ${error.message}`);
      return result;
    }
  }

  /**
   * Run test suite
   */
  async runSuite(suite: TestSuite): Promise<TestResult[]> {
    log.info(`Running test suite: ${suite.name}`);
    const suiteResults: TestResult[] = [];

    for (const test of suite.tests) {
      const result = await test();
      suiteResults.push(result);
    }

    return suiteResults;
  }

  /**
   * Get all results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Get summary
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    platform: Platform;
  } {
    const passed = this.results.filter((r) => r.passed).length;
    const totalDuration = this.results.reduce(
      (sum, r) => sum + r.durationMs,
      0,
    );

    return {
      total: this.results.length,
      passed,
      failed: this.results.length - passed,
      durationMs: totalDuration,
      platform: this.env.platform,
    };
  }

  /**
   * Generate report
   */
  generateReport(): string {
    const summary = this.getSummary();
    const env = this.env;

    let report = `# Multi-Environment Test Report

## Environment
- Platform: ${env.platform}
- Architecture: ${env.arch}
- Node.js: ${env.nodeVersion}
- OS Release: ${env.osRelease}
- CPUs: ${env.cpuCount}
- Memory: ${Math.round(env.totalMemory / 1024 / 1024 / 1024)}GB total

## Summary
- Total Tests: ${summary.total}
- Passed: ${summary.passed} ✓
- Failed: ${summary.failed} ✗
- Duration: ${summary.durationMs}ms
- Success Rate: ${summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%

## Test Results
`;

    for (const result of this.results) {
      const status = result.passed ? "✓ PASS" : "✗ FAIL";
      report += `\n### ${result.name}\n`;
      report += `- Status: ${status}\n`;
      report += `- Duration: ${result.durationMs}ms\n`;
      if (result.error) {
        report += `- Error: ${result.error}\n`;
      }
    }

    return report;
  }

  /**
   * Clear results
   */
  clear(): void {
    this.results = [];
  }
}

// Platform-specific tests
export const PlatformTests = {
  /**
   * Test Windows-specific features
   */
  async testWindowsFeatures(): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("Not running on Windows");
    }

    // Test PowerShell availability
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    try {
      await execAsync('powershell -Command "Get-Host"');
    } catch {
      throw new Error("PowerShell not available");
    }
  },

  /**
   * Test macOS-specific features
   */
  async testMacOSFeatures(): Promise<void> {
    if (process.platform !== "darwin") {
      throw new Error("Not running on macOS");
    }

    // Test AppleScript availability
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    try {
      await execAsync("osascript -e 'return \"test\"'");
    } catch {
      throw new Error("AppleScript not available");
    }
  },

  /**
   * Test Linux-specific features
   */
  async testLinuxFeatures(): Promise<void> {
    if (process.platform !== "linux") {
      throw new Error("Not running on Linux");
    }

    // Test X11 availability
    const fs = await import("node:fs");
    if (!fs.existsSync("/usr/bin/X11") && !fs.existsSync("/usr/bin/xterm")) {
      throw new Error("X11 not available");
    }
  },
};

// Core functionality tests
export const CoreTests = {
  /**
   * Test file system operations
   */
  async testFileSystem(): Promise<void> {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const os = await import("node:os");

    const testDir = path.join(os.tmpdir(), `openoxygen-test-${Date.now()}`);
    const testFile = path.join(testDir, "test.txt");

    try {
      // Create directory
      fs.mkdirSync(testDir, { recursive: true });

      // Write file
      fs.writeFileSync(testFile, "test content", "utf-8");

      // Read file
      const content = fs.readFileSync(testFile, "utf-8");
      if (content !== "test content") {
        throw new Error("File content mismatch");
      }

      // Clean up
      fs.unlinkSync(testFile);
      fs.rmdirSync(testDir);
    } catch (error: any) {
      throw new Error(`File system test failed: ${error.message}`);
    }
  },

  /**
   * Test network connectivity
   */
  async testNetwork(): Promise<void> {
    try {
      const response = await fetch("https://api.github.com", {
        method: "HEAD",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      throw new Error(`Network test failed: ${error.message}`);
    }
  },

  /**
   * test child process execution
   */
  async testChildProcess(): Promise<void> {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync("node --version");
      if (!stdout.includes("v")) {
        throw new Error("Invalid Node.js version output");
      }
    } catch (error: any) {
      throw new Error(`Child process test failed: ${error.message}`);
    }
  },
};

// Export test utilities
export const MultiEnvTesting = {
  MultiEnvTestRunner,
  getEnvironmentInfo,
  isSupportedPlatform,
  PlatformTests,
  CoreTests,
};

export default MultiEnvTesting;
