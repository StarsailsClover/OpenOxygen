/**
 * Prompt Injection Detection
 *
 * Detects and prevents prompt injection attacks
 * Uses pattern matching and heuristics
 */

import { createSubsystemLogger } from "../logging/index.js";

const log = createSubsystemLogger("security/prompt-injection");

// === Detection Types ===

export interface InjectionDetectionResult {
  isInjection: boolean;
  confidence: number;
  patterns: string[];
  sanitized: string;
  action: "allow" | "warn" | "block";
}

export interface DetectionConfig {
  threshold: number;
  maxLength: number;
  allowedTags: string[];
  blockedPatterns: RegExp[];
}

// === Injection Patterns ===

const INJECTION_PATTERNS = [
  // System prompt override
  {
    pattern: /ignore\s+(previous|above|all)\s+(instructions|prompts)/i,
    weight: 0.9,
  },
  {
    pattern: /disregard\s+(previous|above|all)\s+(instructions|prompts)/i,
    weight: 0.9,
  },
  {
    pattern: /forget\s+(previous|above|all)\s+(instructions|prompts)/i,
    weight: 0.9,
  },

  // Role manipulation
  { pattern: /you\s+are\s+now/i, weight: 0.8 },
  { pattern: /act\s+as\s+/i, weight: 0.7 },
  { pattern: /pretend\s+to\s+be/i, weight: 0.7 },
  { pattern: /roleplay\s+as/i, weight: 0.7 },

  // Delimiter injection
  { pattern: /```\s*system/i, weight: 0.95 },
  { pattern: /```\s*assistant/i, weight: 0.95 },
  { pattern: /```\s*user/i, weight: 0.95 },
  { pattern: /<\|system\|>/i, weight: 0.95 },
  { pattern: /<\|assistant\|>/i, weight: 0.95 },
  { pattern: /<\|user\|>/i, weight: 0.95 },
  { pattern: /\[system\]/i, weight: 0.9 },
  { pattern: /\[assistant\]/i, weight: 0.9 },
  { pattern: /\[user\]/i, weight: 0.9 },

  // Jailbreak attempts
  { pattern: /jailbreak/i, weight: 0.8 },
  { pattern: /DAN\s*mode/i, weight: 0.8 },
  { pattern: /developer\s+mode/i, weight: 0.7 },
  { pattern: /ignore\s+ethical/i, weight: 0.9 },
  { pattern: /ignore\s+legal/i, weight: 0.9 },

  // Encoding tricks
  { pattern: /base64\s*decode/i, weight: 0.6 },
  { pattern: /rot13/i, weight: 0.6 },
  { pattern: /hex\s*decode/i, weight: 0.6 },
];

// === Detector ===

export class PromptInjectionDetector {
  private config: DetectionConfig;

  constructor(config: Partial<DetectionConfig> = {}) {
    this.config = {
      threshold: 0.7,
      maxLength: 10000,
      allowedTags: [],
      blockedPatterns: [],
      ...config,
    };
  }

  /**
   * Detect injection in input
   */
  detect(input: string): InjectionDetectionResult {
    // Check length
    if (input.length > this.config.maxLength) {
      return {
        isInjection: true,
        confidence: 1,
        patterns: ["excessive_length"],
        sanitized: input.substring(0, this.config.maxLength),
        action: "block",
      };
    }

    // Check patterns
    let totalWeight = 0;
    const matchedPatterns: string[] = [];

    for (const { pattern, weight } of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        totalWeight += weight;
        matchedPatterns.push(pattern.source);
      }
    }

    // Check custom blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(input)) {
        totalWeight += 1;
        matchedPatterns.push(`custom:${pattern.source}`);
      }
    }

    // Normalize confidence (cap at 1.0)
    const confidence = Math.min(totalWeight, 1);
    const isInjection = confidence >= this.config.threshold;

    // Determine action
    let action: "allow" | "warn" | "block" = "allow";
    if (confidence >= 0.9) {
      action = "block";
    } else if (confidence >= this.config.threshold) {
      action = "warn";
    }

    // Sanitize
    const sanitized = this.sanitize(input);

    return {
      isInjection,
      confidence,
      patterns: matchedPatterns,
      sanitized,
      action,
    };
  }

  /**
   * Sanitize input
   */
  sanitize(input: string): string {
    let sanitized = input;

    // Escape delimiter sequences
    sanitized = sanitized.replace(/```/g, "` ` `");
    sanitized = sanitized.replace(/<\|/g, "< |");
    sanitized = sanitized.replace(/\|>/g, "| >");
    sanitized = sanitized.replace(/\[system\]/gi, "[ system ]");
    sanitized = sanitized.replace(/\[assistant\]/gi, "[ assistant ]");
    sanitized = sanitized.replace(/\[user\]/gi, "[ user ]");

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return sanitized;
  }

  /**
   * Quick check (returns true if safe)
   */
  isSafe(input: string): boolean {
    const result = this.detect(input);
    return !result.isInjection;
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// === Factory ===

export function createPromptInjectionDetector(
  config?: Partial<DetectionConfig>,
): PromptInjectionDetector {
  return new PromptInjectionDetector(config);
}

// === Exports ===

export {
  createPromptInjectionDetector,
  PromptInjectionDetector,
  INJECTION_PATTERNS,
};

export default PromptInjectionDetector;
