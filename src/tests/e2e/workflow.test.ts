/**
 * End-to-End Workflow Tests
 * 
 * Complete workflow tests for OpenOxygen
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { skillRegistry } from "../../skills/registry.js";
import { htnPlanner } from "../../planning/htn/index.js";
import { openAIProtocol } from "../../protocols/openai/index.js";
import { mcpClient } from "../../protocols/mcp/index.js";
import { interruptManager } from "../../core/interrupt.js";
import { encryptionService } from "../../security/encryption.js";

describe("E2E Workflows", () => {
  beforeAll(() => {
    encryptionService.initialize("test-key");
  });

  afterAll(() => {
    interruptManager.cleanup(0);
  });

  describe("Complete Automation Workflow", () => {
    test("should execute file organization workflow", async () => {
      // 1. Register task
      const taskId = "file-org-1";
      interruptManager.registerTask(taskId, "File Organization", 5);
      interruptManager.startTask(taskId);

      // 2. List files
      const listResult = await skillRegistry.execute("system.file.list", "/test/path");
      expect(listResult.success).toBe(true);

      // 3. Create directory
      const mkdirResult = await skillRegistry.execute("system.dir.create", "/test/path/organized");
      expect(mkdirResult.success).toBe(true);

      // 4. Move files
      const moveResult = await skillRegistry.execute("system.file.move", "/test/path/file.txt", "/test/path/organized/file.txt");
      expect(moveResult.success).toBe(true);

      // 5. Complete task
      interruptManager.completeTask(taskId);
      
      const task = interruptManager.getTask(taskId);
      expect(task?.state).toBe("completed");
    });

    test("should execute web scraping workflow", async () => {
      const taskId = "web-scrape-1";
      interruptManager.registerTask(taskId, "Web Scraping", 5);
      interruptManager.startTask(taskId);

      // Launch browser
      const browserResult = await skillRegistry.execute("browser.launch");
      expect(browserResult.success).toBe(true);

      // Navigate
      const navResult = await skillRegistry.execute("browser.navigate", "https://example.com");
      expect(navResult.success).toBe(true);

      // Take screenshot
      const screenshotResult = await skillRegistry.execute("browser.screenshot");
      expect(screenshotResult.success).toBe(true);

      // Get content
      const contentResult = await skillRegistry.execute("browser.getText", { selector: "h1" });
      
      interruptManager.completeTask(taskId);
    });
  });

  describe("Protocol Integration Workflow", () => {
    test("should use OpenAI protocol with skills", async () => {
      // Register a skill as OpenAI tool
      openAIProtocol.registerTool({
        name: "get_system_info",
        description: "Get system information",
        parameters: {
          type: "object",
          properties: {},
        },
        handler: async () => {
          return skillRegistry.execute("system.info");
        },
      });

      const tools = openAIProtocol.getOpenAITools();
      expect(tools.length).toBeGreaterThan(0);

      // Simulate tool call
      const result = await openAIProtocol.executeToolCall({
        id: "call-1",
        type: "function",
        function: {
          name: "get_system_info",
          arguments: "{}",
        },
      });

      expect(result.success).toBe(true);
    });

    test("should use MCP protocol with skills", async () => {
      // Connect to MCP server
      const connected = await mcpClient.connect({
        id: "test-server",
        name: "Test Server",
        url: "http://localhost:3001",
      });

      expect(connected).toBe(true);

      // Discover tools
      const tools = await mcpClient.discoverTools("test-server");
      expect(tools.length).toBeGreaterThan(0);

      // Disconnect
      await mcpClient.disconnect("test-server");
    });
  });

  describe("Security Workflow", () => {
    test("should encrypt and decrypt sensitive data", () => {
      const sensitive = {
        apiKey: "sk-secret-123",
        password: "my-password",
      };

      const encrypted = encryptionService.encryptObject(sensitive);
      
      // Verify sensitive fields are encrypted
      expect(typeof encrypted.apiKey).toBe("object");
      expect(typeof encrypted.password).toBe("object");

      // Decrypt
      const decrypted = encryptionService.decryptObject(encrypted);
      expect(decrypted.apiKey).toBe("sk-secret-123");
      expect(decrypted.password).toBe("my-password");
    });

    test("should handle task interruption securely", async () => {
      const taskId = "secure-task-1";
      interruptManager.registerTask(taskId, "Secure Task", 5);
      interruptManager.startTask(taskId);

      // Pause
      const pauseResult = interruptManager.pauseTask(taskId, "Security check");
      expect(pauseResult.success).toBe(true);

      // Resume
      const resumeResult = interruptManager.resumeTask(taskId);
      expect(resumeResult.success).toBe(true);

      // Complete
      interruptManager.completeTask(taskId);
    });
  });

  describe("Error Recovery Workflow", () => {
    test("should handle and recover from errors", async () => {
      const taskId = "error-task-1";
      interruptManager.registerTask(taskId, "Error Task", 5);
      interruptManager.startTask(taskId);

      // Simulate error
      interruptManager.failTask(taskId, "Network error");

      const task = interruptManager.getTask(taskId);
      expect(task?.state).toBe("failed");
      expect(task?.metadata.error).toBe("Network error");

      // Cleanup
      interruptManager.cleanup(0);
    });
  });

  describe("Performance Workflow", () => {
    test("should complete operations within time limits", async () => {
      const start = Date.now();

      await skillRegistry.execute("system.info");

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test("should handle concurrent operations", async () => {
      const promises = [
        skillRegistry.execute("system.info"),
        skillRegistry.execute("system.info"),
        skillRegistry.execute("system.info"),
      ];

      const results = await Promise.all(promises);
      
      for (const result of results) {
        expect(result.success).toBe(true);
      }
    });
  });
});
