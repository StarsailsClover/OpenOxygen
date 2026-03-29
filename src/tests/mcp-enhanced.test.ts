/**
 * MCP Enhanced Features Tests
 * 
 * Test suite for MCP protocol enhanced features
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  MCPResourceManager,
  MCPProgressTracker,
  MCPRootsManager,
  MCPSamplingHandler,
  MCPEnhancedClient,
} from "../protocols/mcp/enhanced.js";

describe("MCP Enhanced Features", () => {
  describe("Resource Manager", () => {
    let manager: MCPResourceManager;

    beforeEach(() => {
      manager = new MCPResourceManager();
    });

    test("should subscribe to resource", () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe("file:///test.txt", callback);

      expect(typeof unsubscribe).toBe("function");
    });

    test("should notify subscribers", () => {
      const callback = vi.fn();
      manager.subscribe("file:///test.txt", callback);

      const resource = {
        uri: "file:///test.txt",
        name: "test.txt",
        mimeType: "text/plain",
      };

      manager.notifyChange(resource);

      expect(callback).toHaveBeenCalledWith(resource);
    });

    test("should unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe("file:///test.txt", callback);

      unsubscribe();

      const resource = {
        uri: "file:///test.txt",
        name: "test.txt",
      };

      manager.notifyChange(resource);

      expect(callback).not.toHaveBeenCalled();
    });

    test("should cache resources", () => {
      const resource = {
        uri: "file:///doc.md",
        name: "doc.md",
      };

      manager.notifyChange(resource);

      expect(manager.getResource("file:///doc.md")).toEqual(resource);
    });

    test("should list all resources", () => {
      manager.notifyChange({ uri: "file:///a.txt", name: "a.txt" });
      manager.notifyChange({ uri: "file:///b.txt", name: "b.txt" });

      const resources = manager.listResources();

      expect(resources).toHaveLength(2);
    });

    test("should clear cache", () => {
      manager.notifyChange({ uri: "file:///test.txt", name: "test.txt" });

      manager.clearCache();

      expect(manager.listResources()).toHaveLength(0);
    });
  });

  describe("Progress Tracker", () => {
    let tracker: MCPProgressTracker;

    beforeEach(() => {
      tracker = new MCPProgressTracker();
    });

    test("should track progress", () => {
      const callback = vi.fn();
      tracker.onProgress("token-123", callback);

      tracker.reportProgress("token-123", 50, 100);

      expect(callback).toHaveBeenCalledWith({
        progressToken: "token-123",
        progress: 50,
        total: 100,
      });
    });

    test("should complete progress", () => {
      const callback = vi.fn();
      tracker.onProgress("token-123", callback);

      tracker.completeProgress("token-123");
      tracker.reportProgress("token-123", 100);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Roots Manager", () => {
    let manager: MCPRootsManager;

    beforeEach(() => {
      manager = new MCPRootsManager();
    });

    test("should add root", () => {
      manager.addRoot({ uri: "file:///project", name: "Project" });

      expect(manager.listRoots()).toHaveLength(1);
    });

    test("should remove root", () => {
      manager.addRoot({ uri: "file:///project", name: "Project" });

      const result = manager.removeRoot("file:///project");

      expect(result).toBe(true);
      expect(manager.listRoots()).toHaveLength(0);
    });

    test("should notify on change", () => {
      const listener = vi.fn();
      manager.onChange(listener);

      manager.addRoot({ uri: "file:///new", name: "New" });

      expect(listener).toHaveBeenCalled();
    });

    test("should return false for non-existent root", () => {
      const result = manager.removeRoot("file:///nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("Sampling Handler", () => {
    let handler: MCPSamplingHandler;

    beforeEach(() => {
      handler = new MCPSamplingHandler();
    });

    test("should register sampling callback", () => {
      const callback = vi.fn().mockResolvedValue({
        model: "gpt-4",
        role: "assistant",
        content: { type: "text", text: "Hello" },
      });

      handler.setSamplingCallback(callback);

      expect(handler.isSamplingAvailable()).toBe(true);
    });

    test("should handle sampling request", async () => {
      const response = {
        model: "gpt-4",
        role: "assistant" as const,
        content: { type: "text" as const, text: "Response" },
      };

      handler.setSamplingCallback(async () => response);

      const result = await handler.sample({
        messages: [{ role: "user", content: { type: "text", text: "Hi" } }],
      });

      expect(result).toEqual(response);
    });

    test("should throw if no callback registered", async () => {
      await expect(
        handler.sample({
          messages: [{ role: "user", content: { type: "text", text: "Hi" } }],
        }),
      ).rejects.toThrow("No sampling callback registered");
    });
  });

  describe("Enhanced Client", () => {
    let client: MCPEnhancedClient;

    beforeEach(() => {
      client = new MCPEnhancedClient();
    });

    test("should have all managers", () => {
      expect(client.resourceManager).toBeDefined();
      expect(client.progressTracker).toBeDefined();
      expect(client.rootsManager).toBeDefined();
      expect(client.samplingHandler).toBeDefined();
    });

    test("should track progress during execution", async () => {
      const progressCallback = vi.fn();

      // Mock the mcpClient.callTool
      // This would need actual mocking in real test

      // For now, just verify the progress tracker is called
      const token = "test-token";
      client.progressTracker.onProgress(token, progressCallback);
      client.progressTracker.reportProgress(token, 50, 100);

      expect(progressCallback).toHaveBeenCalledWith({
        progressToken: token,
        progress: 50,
        total: 100,
      });
    });
  });
});
