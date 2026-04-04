/**
 * Inference Engine Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  InferenceEngine,
  analyzeComplexity,
  type ChatMessage,
  type InferenceRequest,
} from "../../inference/engine/index.js";
import type { OxygenConfig } from "../../types/index.js";

describe("InferenceEngine", () => {
  let config: OxygenConfig;

  beforeEach(() => {
    config = {
      version: "1.0.0",
      gateway: { host: "localhost", port: 4800, auth: { mode: "none" } },
      security: { privilegeLevel: "standard", auditEnabled: false, rollbackEnabled: false },
      memory: { backend: "builtin", hybridSearch: false },
      vision: { enabled: false },
      models: [
        {
          provider: "ollama",
          model: "qwen3:4b",
          baseUrl: "http://localhost:11434",
        },
      ],
      agents: { list: [] },
      channels: [],
      plugins: [],
    };
  });

  describe("analyzeComplexity", () => {
    it("should detect fast mode for simple queries", () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "hello" },
      ];
      expect(analyzeComplexity(messages)).toBe("fast");
    });

    it("should detect deep mode for complex queries", () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "analyze this complex architecture in detail step by step" },
      ];
      expect(analyzeComplexity(messages)).toBe("deep");
    });

    it("should default to balanced for medium queries", () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "what is the weather today" },
      ];
      expect(analyzeComplexity(messages)).toBe("balanced");
    });
  });

  describe("createInferenceEngine", () => {
    it("should create engine with config", () => {
      const engine = new InferenceEngine(config);
      expect(engine).toBeDefined();
    });
  });
});
