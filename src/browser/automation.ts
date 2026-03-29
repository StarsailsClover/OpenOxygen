/**
 * OpenOxygen - Browser Automation Module (26w15aD Phase 7)
 *
 * High-level browser automation with anti-detection
 * - Form auto-fill
 * - Anti-crawling simulation
 * - Human-like interaction patterns
 */

import { createSubsystemLogger } from "../logging/index.js";
import { sleep, generateId } from "../utils/index.js";
import {
  connectCDP,
  executeScriptCDP,
  clickElementCDP,
  queryElementCDP,
} from "./cdp.js";
import type { CDPClient } from "./cdp.js";

const log = createSubsystemLogger("browser/automation");

// Form field types
export type FormFieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "search"
  | "date"
  | "select"
  | "checkbox"
  | "radio"
  | "textarea";

// Form field definition
export interface FormField {
  name?: string;
  id?: string;
  type: FormFieldType;
  selector?: string;
  value: string;
  required?: boolean;
}

// Anti-detection options
export interface AntiDetectionOptions {
  // Mouse movement
  humanLikeMouse?: boolean;
  mouseSpeed?: "slow" | "normal" | "fast";

  // Typing
  humanLikeTyping?: boolean;
  typingSpeed?: "slow" | "normal" | "fast";
  typingErrorRate?: number; // 0-1, chance of making and correcting typo

  // Timing
  randomDelays?: boolean;
  minDelayMs?: number;
  maxDelayMs?: number;

  // Browser fingerprint
  hideWebDriver?: boolean;
  randomViewport?: boolean;

  // Behavior
  scrollBeforeAction?: boolean;
  randomScrollAmount?: number;
}

// Default anti-detection options
const defaultAntiDetection: AntiDetectionOptions = {
  humanLikeMouse: true,
  mouseSpeed: "normal",
  humanLikeTyping: true,
  typingSpeed: "normal",
  typingErrorRate: 0.05,
  randomDelays: true,
  minDelayMs: 100,
  maxDelayMs: 500,
  hideWebDriver: true,
  randomViewport: false,
  scrollBeforeAction: true,
  randomScrollAmount: 100,
};

/**
 * Apply anti-detection scripts to page
 */
export async function applyAntiDetection(
  cdp: CDPClient,
  options: AntiDetectionOptions = {},
): Promise<void> {
  const opts = { ...defaultAntiDetection, ...options };

  log.info("Applying anti-detection measures");

  if (opts.hideWebDriver) {
    // Hide webdriver property
    await executeScriptCDP(
      cdp,
      `
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // Hide Chrome runtime
      if (window.chrome) {
        Object.defineProperty(window, 'chrome', {
          get: () => ({
            ...window.chrome,
            runtime: undefined
          })
        });
      }
      
      // Hide permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission } as any);
        }
        return originalQuery(parameters);
      };
    `,
    );
  }

  if (opts.randomViewport) {
    // Slightly randomize viewport
    const widthVariation = Math.floor(Math.random() * 100);
    const heightVariation = Math.floor(Math.random() * 100);

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1920 + widthVariation,
      height: 1080 + heightVariation,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  log.info("Anti-detection measures applied");
}

/**
 * Get random delay
 */
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Human-like typing delay
 */
async function humanLikeTypeDelay(speed: string): Promise<void> {
  const delays: Record<string, { min: number; max: number }> = {
    slow: { min: 100, max: 300 },
    normal: { min: 50, max: 150 },
    fast: { min: 20, max: 80 },
  };

  const { min, max } = delays[speed] || delays.normal;
  await sleep(getRandomDelay(min, max));
}

/**
 * Type text with human-like behavior
 */
export async function typeTextHumanLike(
  cdp: CDPClient,
  selector: string,
  text: string,
  options: AntiDetectionOptions = {},
): Promise<boolean> {
  const opts = { ...defaultAntiDetection, ...options };

  log.info(`Typing text with human-like behavior: ${text.substring(0, 30)}...`);

  try {
    // Focus element
    await executeScriptCDP(
      cdp,
      `
      const el = document.querySelector('${selector}');
      if (el) {
        el.focus();
        el.click();
      }
    `,
    );

    await sleep(getRandomDelay(100, 300));

    // Type character by character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Simulate typo and correction
      if (
        opts.humanLikeTyping &&
        opts.typingErrorRate &&
        Math.random() < opts.typingErrorRate
      ) {
        // Type wrong character
        const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1);
        await cdp.send("Input.insertText", { text: wrongChar });
        await humanLikeTypeDelay(opts.typingSpeed || "normal");

        // Backspace
        await cdp.send("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "Backspace",
          code: "Backspace",
        });
        await cdp.send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "Backspace",
          code: "Backspace",
        });
        await humanLikeTypeDelay(opts.typingSpeed || "normal");
      }

      // Type correct character
      await cdp.send("Input.insertText", { text: char });
      await humanLikeTypeDelay(opts.typingSpeed || "normal");
    }

    log.info("Text typed successfully");
    return true;
  } catch (error: any) {
    log.error(`Failed to type text: ${error.message}`);
    return false;
  }
}

/**
 * Auto-fill form fields
 */
export async function autoFillForm(
  cdp: CDPClient,
  fields: FormField[],
  options: AntiDetectionOptions = {},
): Promise<{ success: boolean; filled: string[]; failed: string[] }> {
  log.info(`Auto-filling form with ${fields.length} fields`);

  const filled: string[] = [];
  const failed: string[] = [];

  // Apply anti-detection first
  await applyAntiDetection(cdp, options);

  for (const field of fields) {
    try {
      // Build selector
      let selector = field.selector;
      if (!selector) {
        if (field.id) {
          selector = `#${field.id}`;
        } else if (field.name) {
          selector = `[name="${field.name}"]`;
        } else {
          failed.push(field.name || "unknown");
          continue;
        }
      }

      // Scroll to element
      if (options.scrollBeforeAction) {
        await executeScriptCDP(
          cdp,
          `
          const el = document.querySelector('${selector}');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        `,
        );
        await sleep(getRandomDelay(300, 800));
      }

      // Fill based on type
      switch (field.type) {
        case "select":
          await executeScriptCDP(
            cdp,
            `
            const el = document.querySelector('${selector}');
            if (el) {
              el.value = '${field.value}';
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `,
          );
          break;

        case "checkbox":
        case "radio":
          await executeScriptCDP(
            cdp,
            `
            const el = document.querySelector('${selector}');
            if (el) {
              el.checked = ${field.value === "true" || field.value === "on"};
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          `,
          );
          break;

        default:
          // Text-based fields - use human-like typing
          await typeTextHumanLike(cdp, selector, field.value, options);
      }

      filled.push(field.name || field.id || selector);

      // Random delay between fields
      if (options.randomDelays) {
        await sleep(
          getRandomDelay(options.minDelayMs || 100, options.maxDelayMs || 500),
        );
      }
    } catch (error: any) {
      log.error(`Failed to fill field ${field.name}: ${error.message}`);
      failed.push(field.name || "unknown");
    }
  }

  log.info(`Form filled: ${filled.length} success, ${failed.length} failed`);
  return { success: failed.length === 0, filled, failed };
}

/**
 * Detect and fill common forms
 */
export async function detectAndFillForm(
  cdp: CDPClient,
  formData: Record<string, string>,
  options: AntiDetectionOptions = {},
): Promise<{ success: boolean; fields: FormField[] }> {
  log.info("Detecting form fields");

  // Common field patterns
  const patterns: Record<string, string[]> = {
    username: [
      'input[name*="user"]',
      'input[name*="login"]',
      'input[id*="user"]',
      'input[id*="login"]',
      'input[type="text"]:first-of-type',
    ],
    email: [
      'input[type="email"]',
      'input[name*="email"]',
      'input[id*="email"]',
      'input[placeholder*="email" i]',
    ],
    password: [
      'input[type="password"]',
      'input[name*="pass"]',
      'input[id*="pass"]',
      'input[name*="pwd"]',
      'input[id*="pwd"]',
    ],
    search: [
      'input[type="search"]',
      'input[name*="search"]',
      'input[id*="search"]',
      'input[placeholder*="search" i]',
    ],
    phone: [
      'input[type="tel"]',
      'input[name*="phone"]',
      'input[name*="tel"]',
      'input[id*="phone"]',
    ],
  };

  const fields: FormField[] = [];

  for (const [key, value] of Object.entries(formData)) {
    const selectors = patterns[key as keyof typeof patterns];
    if (!selectors) continue;

    // Try each selector
    for (const selector of selectors) {
      try {
        const exists = await executeScriptCDP(
          cdp,
          `
          return !!document.querySelector('${selector}');
        `,
        );

        if (exists) {
          fields.push({
            name: key,
            type:
              key === "password"
                ? "password"
                : key === "email"
                  ? "email"
                  : "text",
            selector,
            value,
          });
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
  }

  // Fill detected fields
  const result = await autoFillForm(cdp, fields, options);

  return {
    success: result.success,
    fields,
  };
}

/**
 * Submit form
 */
export async function submitForm(
  cdp: CDPClient,
  submitSelector?: string,
  options: AntiDetectionOptions = {},
): Promise<boolean> {
  log.info("Submitting form");

  try {
    if (submitSelector) {
      // Click submit button
      await clickElementCDP(cdp, submitSelector);
    } else {
      // Try to find and click submit button
      await executeScriptCDP(
        cdp,
        `
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button:contains("Submit"), button:contains("Login"), button:contains("Sign")');
        if (submitBtn) {
          submitBtn.click();
        } else {
          // Try submitting first form
          const form = document.querySelector('form');
          if (form) form.submit();
        }
      `,
      );
    }

    await sleep(getRandomDelay(500, 1500));
    log.info("Form submitted");
    return true;
  } catch (error: any) {
    log.error(`Failed to submit form: ${error.message}`);
    return false;
  }
}

// Export automation utilities
export const BrowserAutomation = {
  applyAntiDetection,
  typeTextHumanLike,
  autoFillForm,
  detectAndFillForm,
  submitForm,
};

export default BrowserAutomation;
