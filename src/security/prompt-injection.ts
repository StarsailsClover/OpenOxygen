/**
 * Prompt Injection Detection
 *
 * Detects and prevents prompt injection attacks
 * Uses pattern matching and heuristics
 */

import { createSubsystemLogger } from "../logging/index.js";

const log = createSubsystemLogger("security/prompt-injection");

// ============================================================================
// Detection Types
// ============================================================================

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

// ============================================================================
// Injection Patterns
// ============================================================================

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

  // Instruction override
  { pattern: /new\s+instructions?:/i, weight: 0.85 },
  { pattern: /override\s+(previous|default)\s+behavior/i, weight: 0.85 },
  { pattern: /bypass\s+(restrictions|filters)/i, weight: 0.9 },

  // Jailbreak attempts
  { pattern: /DAN\s*mode/i, weight: 0.95 },
  { pattern: /developer\s*mode/i, weight: 0.9 },
  { pattern: /sudo\s*mode/i, weight: 0.9 },
  { pattern: /root\s*access/i, weight: 0.9 },

  // Encoding tricks
  { pattern: /base64\s*decode/i, weight: 0.6 },
  { pattern: /rot13/i, weight: 0.6 },
  { pattern: /hex\s*decode/i, weight: 0.6 },

  // Multi-language
  { pattern: /переведи|переключись|игнорируй/i, weight: 0.7 },
  { pattern: /忽略|忘记|角色扮演/i, weight: 0.7 },
];

// ============================================================================
// Prompt Injection Detector
// ============================================================================

export class PromptInjectionDetector {
  private config: DetectionConfig;

  constructor(config?: Partial<DetectionConfig>) {
    this.config = {
      threshold: 0.7,
      maxLength: 10000,
      allowedTags: [],
      blockedPatterns: [],
      ...config,
    };
  }

  /**
   * Detect prompt injection
   */
  detect(input: string): InjectionDetectionResult {
    // Check length
    if (input.length > this.config.maxLength) {
      return {
        isInjection: true,
        confidence: 1.0,
        patterns: ["excessive_length"],
        sanitized: input.slice(0, this.config.maxLength),
        action: "block",
      };
    }

    const detectedPatterns: string[] = [];
    let totalWeight = 0;

    // Check patterns
    for (const { pattern, weight } of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
        totalWeight += weight;
      }
    }

    // Check custom blocked patterns
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(`custom:${pattern.source}`);
        totalWeight += 1.0;
      }
    }

    // Calculate confidence
    const confidence = Math.min(totalWeight, 1.0);
    const isInjection = confidence >= this.config.threshold;

    // Determine action
    let action: "allow" | "warn" | "block" = "allow";
    if (confidence >= 0.9) {
      action = "block";
    } else if (confidence >= this.config.threshold) {
      action = "warn";
    }

    // Sanitize input
    const sanitized = this.sanitize(input);

    const result: InjectionDetectionResult = {
      isInjection,
      confidence,
      patterns: detectedPatterns,
      sanitized,
      action,
    };

    if (isInjection) {
      log.warn(
        `Prompt injection detected: ${confidence.toFixed(2)} confidence`,
        {
          patterns: detectedPatterns,
        },
      );
    }

    return result;
  }

  /**
   * Sanitize input
   */
  private sanitize(input: string): string {
    let sanitized = input;

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, " ");

    // Remove potential delimiter injections
    sanitized = sanitized.replace(/```[\s\S]*?```/g, "[CODE_BLOCK_REMOVED]");
    sanitized = sanitized.replace(/<\|.*?\|>/g, "[DELIMITER_REMOVED]");

    // Escape HTML
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    return sanitized;
  }

  /**
   * Validate prompt
   */
  validate(prompt: string): { valid: boolean; message?: string } {
    const result = this.detect(prompt);

    if (result.action === "block") {
      return {
        valid: false,
        message: `Prompt injection detected (${(result.confidence * 100).toFixed(0)}% confidence). Patterns: ${result.patterns.join(", ")}`,
      };
    }

    if (result.action === "warn") {
      log.warn("Suspicious prompt detected", { confidence: result.confidence });
    }

    return { valid: true };
  }

  /**
   * Add custom blocked pattern
   */
  addBlockedPattern(pattern: RegExp): void {
    this.config.blockedPatterns.push(pattern);
  }

  /**
   * Update threshold
   */
  setThreshold(threshold: number): void {
    this.config.threshold = Math.max(0, Math.min(1, threshold));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const promptInjectionDetector = new PromptInjectionDetector();
