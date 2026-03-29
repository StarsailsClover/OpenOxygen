/**
 * MCP Protocol Tests
 *
 * Test suite for Model Context Protocol client
 */

import { describe, test, expect, beforeEach } from "vitest";
import {
  MCPClient,
  MCPToolAdapter,
  mcpClient,
} from "../protocols/mcp/index.js";
import { mcpGatewayIntegration } from "../protocols/mcp/gateway-integration.js";

describe("MCP Client", () => {
  beforeEach(() => {
    // Clean up connections
    for (const serverId of mcpClient.listServers()) {
      mcpClient.disconnect(serverId);
    }
  });

  describe("Server Connection", () => {
    test("should connect to MCP server", async () => {
      const connected = await mcpClient.connect({
        id: "test-server",
        name: "Test Server",
        url: "http://localhost:3001",
      });

      // In test environment, handshake is simulated
      expect(connected).toBe(true);
      expect(mcpClient.isConnected("test-server")).toBe(true);
    });

    test("should disconnect from MCP server", async () => {
      await mcpClient.connect({
        id: "test-server-2",
        name: "Test Server 2",
        url: "http://localhost:3002",
      });

      const disconnected = await mcpClient.disconnect("test-server-2");

      expect(disconnected).toBe(true);
      expect(mcpClient.isConnected("test-server-2")).toBe(false);
    });

    test("should list connected servers", async () => {
      await mcpClient.connect({
        id: "server-a",
        name: "Server A",
        url: "http://localhost:3001",
      });

      await mcpClient.connect({
        id: "server-b",
        name: "Server B",
        url: "http://localhost:3002",
      });

      const servers = mcpClient.listServers();

      expect(servers).toContain("server-a");
      expect(servers).toContain("server-b");
      expect(servers.length).toBe(2);
    });
  });

  describe("Tool Discovery", () => {
    test("should discover tools from server", async () => {
      await mcpClient.connect({
        id: "tool-server",
        name: "Tool Server",
        url: "http://localhost:3001",
      });

      const tools = await mcpClient.discoverTools("tool-server");

      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty("name");
      expect(tools[0]).toHaveProperty("description");
      expect(tools[0]).toHaveProperty("inputSchema");
    });

    test("should return empty array for disconnected server", async () => {
      const tools = await mcpClient.discoverTools("not-connected");

      expect(tools).toEqual([]);
    });
  });

  describe("Tool Invocation", () => {
    test("should call tool successfully", async () => {
      await mcpClient.connect({
        id: "exec-server",
        name: "Execution Server",
        url: "http://localhost:3001",
      });

      const result = await mcpClient.callTool("exec-server", "read_file", {
        path: "/test/file.txt",
      });

      expect(result.success).toBe(true);
    });

    test("should fail for disconnected server", async () => {
      const result = await mcpClient.callTool("not-connected", "tool", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("not connected");
    });
  });

  describe("Resource Management", () => {
    test("should discover resources", async () => {
      await mcpClient.connect({
        id: "resource-server",
        name: "Resource Server",
        url: "http://localhost:3001",
      });

      const resources = await mcpClient.discoverResources("resource-server");

      expect(resources).toBeDefined();
    });

    test("should read resource", async () => {
      await mcpClient.connect({
        id: "resource-server-2",
        name: "Resource Server 2",
        url: "http://localhost:3001",
      });

      const result = await mcpClient.readResource(
        "resource-server-2",
        "file:///docs/readme.md",
      );

      expect(result.success).toBe(true);
    });
  });

  describe("Prompt Management", () => {
    test("should discover prompts", async () => {
      await mcpClient.connect({
        id: "prompt-server",
        name: "Prompt Server",
        url: "http://localhost:3001",
      });

      const prompts = await mcpClient.discoverPrompts("prompt-server");

      expect(prompts).toBeDefined();
    });

    test("should get prompt", async () => {
      await mcpClient.connect({
        id: "prompt-server-2",
        name: "Prompt Server 2",
        url: "http://localhost:3001",
      });

      const result = await mcpClient.getPrompt(
        "prompt-server-2",
        "code_review",
        { code: "console.log('test')" },
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("prompt");
    });
  });
});

describe("MCP Tool Adapter", () => {
  test("should convert MCP tool to skill", () => {
    const adapter = new MCPToolAdapter(mcpClient);

    const mcpTool = {
      name: "test_tool",
      description: "A test tool",
      inputSchema: {
        type: "object",
        properties: {
          param1: { type: "string", description: "Parameter 1" },
          param2: { type: "number" },
        },
        required: ["param1"],
      },
    };

    const skill = adapter.convertToSkill("test-server", mcpTool);

    expect(skill.id).toBe("mcp.test-server.test_tool");
    expect(skill.name).toContain("test_tool");
    expect(skill.category).toBe("mcp");
    expect(skill.parameters).toBeDefined();
    expect(skill.handler).toBeDefined();
  });
});

describe("MCP Gateway Integration", () => {
  test("should initialize integration", async () => {
    await mcpGatewayIntegration.initialize();

    // Should complete without error
    expect(true).toBe(true);
  });

  test("should get server status", async () => {
    const status = mcpGatewayIntegration.getServerStatus("test");

    expect(status).toHaveProperty("connected");
    expect(status).toHaveProperty("tools");
  });

  test("should list connected servers", () => {
    const servers = mcpGatewayIntegration.listConnectedServers();

    expect(Array.isArray(servers)).toBe(true);
  });
});
