/**
 * OpenOxygen - OSR Visual Verification (26w15aF Phase A.3)
 *
 * Visual verification for OSR playback:
 * - Screenshot comparison
 * - Element position verification
 * - Visual change detection
 * - Error recovery based on visual state
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs, sleep } from "../utils/index.js";
import { OUVVisualUnderstandingController } from "../ouv/visual-understanding.js";
import type { InferenceEngine } from "../inference/engine/index.js";

const log = createSubsystemLogger("osr/visual-verification");

// Verification result
export interface VerificationResult {
  success: boolean;
  matchScore: number;
  differences: VisualDifference[];
  screenshot: string;
  timestamp: number;
}

// Visual difference
export interface VisualDifference {
  type: "element_missing" | "element_moved" | "element_changed" | "new_element";
  elementId?: string;
  description: string;
  severity: "low" | "medium" | "high";
}

// Verification options
export interface VerificationOptions {
  tolerance?: number; // 0-1, default 0.9
  timeout?: number; // ms, default 5000
  retryInterval?: number; // ms, default 500
  requireExactMatch?: boolean;
  checkElements?: string[]; // Specific elements to check
}

/**
 * Visual Verifier for OSR
 */
export class OSRVisualVerifier {
  private ouv: OUVVisualUnderstandingController;
  private referenceScreenshots: Map<string, string> = new Map();
  private referenceElements: Map<string, any> = new Map();

  constructor(inferenceEngine: InferenceEngine) {
    this.ouv = new OUVVisualUnderstandingController(inferenceEngine);
    log.info("OSR Visual Verifier initialized");
  }

  /**
   * Capture reference screenshot
   */
  async captureReference(name: string): Promise<string> {
    log.info(`Capturing reference: ${name}`);

    // Capture screenshot
    const screenshot = await this.captureScreenshot();
    this.referenceScreenshots.set(name, screenshot);

    // Analyze and store elements
    const understanding = await this.ouv.understandScreen(screenshot, {
      includeScreenshot: false,
    });

    this.referenceElements.set(name, understanding.elements);

    log.info(
      `Reference captured: ${name} (${understanding.elements.length} elements)`,
    );
    return screenshot;
  }

  /**
   * Verify current state against reference
   */
  async verifyAgainstReference(
    referenceName: string,
    options: VerificationOptions = {},
  ): Promise<VerificationResult> {
    const opts = {
      tolerance: 0.9,
      timeout: 5000,
      retryInterval: 500,
      requireExactMatch: false,
      ...options,
    };

    const referenceScreenshot = this.referenceScreenshots.get(referenceName);
    const referenceElements = this.referenceElements.get(referenceName);

    if (!referenceScreenshot || !referenceElements) {
      throw new Error(`Reference not found: ${referenceName}`);
    }

    const startTime = nowMs();
    let lastResult: VerificationResult | null = null;

    // Retry until timeout
    while (nowMs() - startTime < opts.timeout) {
      const currentScreenshot = await this.captureScreenshot();
      const result = await this.compareScreenshots(
        referenceScreenshot,
        currentScreenshot,
        referenceElements,
        opts,
      );

      lastResult = result;

      if (result.success) {
        log.info(
          `Verification passed: ${referenceName} (${result.matchScore.toFixed(2)})`,
        );
        return result;
      }

      log.debug(
        `Verification failed, retrying... (${result.matchScore.toFixed(2)})`,
      );
      await sleep(opts.retryInterval);
    }

    log.warn(`Verification failed after timeout: ${referenceName}`);
    return lastResult!;
  }

  /**
   * Compare two screenshots
   */
  private async compareScreenshots(
    reference: string,
    current: string,
    referenceElements: any[],
    options: VerificationOptions,
  ): Promise<VerificationResult> {
    // Analyze current screenshot
    const currentUnderstanding = await this.ouv.understandScreen(current, {
      includeScreenshot: false,
    });

    const differences: VisualDifference[] = [];
    let matchScore = 1.0;

    // Check for missing elements
    for (const refElement of referenceElements) {
      const found = currentUnderstanding.elements.find(
        (e) =>
          e.text === refElement.text ||
          e.description === refElement.description,
      );

      if (!found) {
        differences.push({
          type: "element_missing",
          elementId: refElement.id,
          description: `Element "${refElement.text || refElement.description}" not found`,
          severity: "high",
        });
        matchScore -= 0.1;
      } else {
        // Check position change
        const positionDiff = this.calculatePositionDiff(
          refElement.bounds,
          found.bounds,
        );
        if (positionDiff > 10) {
          differences.push({
            type: "element_moved",
            elementId: refElement.id,
            description: `Element "${refElement.text || refElement.description}" moved by ${positionDiff.toFixed(0)}px`,
            severity: "medium",
          });
          matchScore -= 0.05;
        }
      }
    }

    // Check for new elements
    for (const currElement of currentUnderstanding.elements) {
      const found = referenceElements.find(
        (e) =>
          e.text === currElement.text ||
          e.description === currElement.description,
      );

      if (!found) {
        differences.push({
          type: "new_element",
          description: `New element "${currElement.text || currElement.description}" appeared`,
          severity: "low",
        });
        matchScore -= 0.02;
      }
    }

    // Clamp score
    matchScore = Math.max(0, Math.min(1, matchScore));

    return {
      success: matchScore >= (options.tolerance || 0.9),
      matchScore,
      differences,
      screenshot: current,
      timestamp: nowMs(),
    };
  }

  /**
   * Calculate position difference
   */
  private calculatePositionDiff(bounds1: any, bounds2: any): number {
    const dx = bounds1.x - bounds2.x;
    const dy = bounds1.y - bounds2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Wait for visual state
   */
  async waitForVisualState(
    predicate: (elements: any[]) => boolean,
    timeout: number = 10000,
    interval: number = 500,
  ): Promise<boolean> {
    const startTime = nowMs();

    while (nowMs() - startTime < timeout) {
      const screenshot = await this.captureScreenshot();
      const understanding = await this.ouv.understandScreen(screenshot, {
        includeScreenshot: false,
      });

      if (predicate(understanding.elements)) {
        return true;
      }

      await sleep(interval);
    }

    return false;
  }

  /**
   * Verify element exists
   */
  async verifyElementExists(
    elementDescription: string,
    timeout: number = 5000,
  ): Promise<boolean> {
    return this.waitForVisualState(
      (elements) =>
        elements.some(
          (e) =>
            e.text?.includes(elementDescription) ||
            e.description?.includes(elementDescription),
        ),
      timeout,
    );
  }

  /**
   * Verify element at position
   */
  async verifyElementAtPosition(
    x: number,
    y: number,
    tolerance: number = 10,
  ): Promise<any | null> {
    const screenshot = await this.captureScreenshot();
    const understanding = await this.ouv.understandScreen(screenshot, {
      includeScreenshot: false,
    });

    return (
      understanding.elements.find((e) => {
        const dx = e.center.x - x;
        const dy = e.center.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= tolerance;
      }) || null
    );
  }

  /**
   * Capture screenshot (placeholder)
   */
  private async captureScreenshot(): Promise<string> {
    // In production, use native module
    // For now, return placeholder
    return "screenshot_placeholder";
  }

  /**
   * Clear references
   */
  clearReferences(): void {
    this.referenceScreenshots.clear();
    this.referenceElements.clear();
    log.info("References cleared");
  }

  /**
   * Get reference names
   */
  getReferenceNames(): string[] {
    return Array.from(this.referenceScreenshots.keys());
  }
}

// Export visual verification
export const OSRVisualVerification = {
  OSRVisualVerifier,
};

export default OSRVisualVerification;
