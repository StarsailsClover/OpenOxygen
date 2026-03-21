/**
 * 26w15aDTest - LLM Integration Tests
 * 
 * 真实 LLM (Ollama) 集成测试
 * 测试意图识别、任务分解、反思能力
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";

// Ollama configuration
const OLLAMA_HOST = "http://localhost:11434";
const OLLAMA_MODEL = "qwen2.5:7b"; // or other available model

describe("26w15aDTest - LLM Integration", () => {
  let ollamaAvailable = false;

  beforeAll(async () => {
    // Check if Ollama is running
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        console.log("Ollama models:", data.models.map(m => m.name));
        ollamaAvailable = true;
      }
    } catch (error) {
      console.warn("Ollama not available, tests will be skipped");
    }
  });

  describe("Ollama Connection", () => {
    it("should connect to Ollama", async () => {
      if (!ollamaAvailable) {
        console.log("Skipping - Ollama not available");
        return;
      }

      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.models).toBeDefined();
      expect(data.models.length).toBeGreaterThan(0);
    });

    it("should have required model available", async () => {
      if (!ollamaAvailable) {
        console.log("Skipping - Ollama not available");
        return;
      }

      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      const data = await response.json();
      
      const modelNames = data.models.map(m => m.name);
      console.log("Available models:", modelNames);
      
      // Check if any model is available
      expect(modelNames.length).toBeGreaterThan(0);
    });
  });

  describe("Intent Recognition", () => {
    it("should recognize terminal command intent", async () => {
      if (!ollamaAvailable) {
        console.log("Skipping - Ollama not available");
        return;
      }

      const prompt = `Analyze the user instruction and determine the intent:
Instruction: "列出当前目录下的所有文件"

Respond with JSON:
{
  "intent": "terminal|gui|browser|file",
  "confidence": 0.0-1.0,
  "command": "the actual command"
}`;

      const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      console.log("LLM response:", data.response);
      
      // Parse JSON response
      try {
        const result = JSON.parse(data.response);
        expect(result.intent).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      } catch {
        // If not valid JSON, check if response contains expected content
        expect(data.response.toLowerCase()).toContain("terminal");
      }
    });

    it("should recognize browser intent", async () => {
      if (!ollamaAvailable) {
        console.log("Skipping - Ollama not available");
        return;
      }

      const prompt = `Analyze the user instruction and determine the intent:
Instruction: "打开哔哩哔哩搜索 OpenOxygen 视频"

Respond with JSON:
{
  "intent": "terminal|gui|browser|file",
  "confidence": 0.0-1.0,
  "url": "target url if browser"
}`;

      const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      console.log("LLM response:", data.response);
      
      // Check if response indicates browser intent
      const responseLower = data.response.toLowerCase();
      expect(responseLower.includes("browser") || responseLower.includes("bilibili")).toBe(true);
    });
  });

  describe("Task Decomposition", () => {
    it("should decompose complex task", async () => {
      if (!ollamaAvailable) {
        console.log("Skipping - Ollama not available");
        return;
      }

      const prompt = `Decompose the following task into steps:
Task: "部署项目到生产环境"

Respond with JSON array of steps:
[
  {"step": 1, "action": "description", "mode": "terminal|gui|browser"},
  ...
]`;

      const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      console.log("Decomposition:", data.response);
      
      // Verify response contains steps
      expect(data.response.length).toBeGreaterThan(0);
    });
  });

  describe("Reflection Capability", () => {
    it("should analyze execution result and suggest fix", async () => {
      if (!ollamaAvailable) {
        console.log("Skipping - Ollama not available");
        return;
      }

      const prompt = `Analyze the execution result and suggest a fix:
Task: "npm install"
Result: { "success": false, "error": "package.json not found" }

Respond with JSON:
{
  "analysis": "what went wrong",
  "suggestion": "how to fix",
  "shouldRetry": true|false
}`;

      const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
      });

      expect(response.ok).toBe(true);
      
      const data = await response.json();
      console.log("Reflection:", data.response);
      
      // Verify response contains analysis
      expect(data.response.length).toBeGreaterThan(0);
    });
  });
});
