/**
 * MCP (Model Context Protocol) Client
 * 
 * Implementation of Anthropic's MCP protocol for tool discovery and invocation
 * Enables integration with MCP-compatible servers
 */

import { createSubsystemLogger } from "../logging/index.js";
import type { ToolResult } from "../types/index.js";

const log = createSubsystemLogger("protocols/mcp");

// ============================================================================
// MCP Types
// ============================================================================

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  timeout?: number;
}

export interface MCPHandshakeRequest {
  protocolVersion: string;
  clientInfo: {
    name: string;
    version: string;
  };
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export interface MCPHandshakeResponse {
  protocolVersion: string;
  serverInfo: {
    name: string;
    version: string;
  };
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolCallResponse {
  content: Array<{
    type: string;
    text?: string;
    data?: unknown;
  }>;
  isError?: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// ============================================================================
// MCP Client
// ============================================================================

export class MCPClient {
  private servers: Map<string, MCPServerConnection> = new Map();
  private protocolVersion = "2024-11-05";

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<boolean> {
    log.info(`Connecting to MCP server: ${config.name} (${config.id})`);

    try {
      const connection = new MCPServerConnection(config);
      const success = await connection.handshake();

      if (success) {
        this.servers.set(config.id, connection);
        log.info(`Connected to MCP server: ${config.name}`);
        return true;
      }

      log.error(`Failed to handshake with MCP server: ${config.name}`);
      return false;
    } catch (error) {
      log.error(`Error connecting to MCP server: ${config.name}`, error);
      return false;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<boolean> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      log.warn(`MCP server not found: ${serverId}`);
      return false;
    }

    await connection.close();
    this.servers.delete(serverId);
    log.info(`Disconnected from MCP server: ${serverId}`);
    return true;
  }

  /**
   * Discover tools from an MCP server
   */
  async discoverTools(serverId: string): Promise<MCPTool[]> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      log.error(`MCP server not connected: ${serverId}`);
      return [];
    }

    return await connection.listTools();
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      return {
        success: false,
        error: `MCP server not connected: ${serverId}`,
      };
    }

    try {
      const response = await connection.callTool(toolName, args);
      
      if (response.isError) {
        return {
          success: false,
          error: response.content.find(c => c.type === "text")?.text || "Tool execution failed",
        };
      }

      const textContent = response.content.find(c => c.type === "text")?.text;
      const dataContent = response.content.find(c => c.type === "data")?.data;

      return {
        success: true,
        data: dataContent || textContent,
        message: textContent,
      };
    } catch (error) {
      return {
        success: false,
        error: `Tool call failed: ${error}`,
      };
    }
  }

  /**
   * Discover resources from an MCP server
   */
  async discoverResources(serverId: string): Promise<MCPResource[]> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      log.error(`MCP server not connected: ${serverId}`);
      return [];
    }

    return await connection.listResources();
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverId: string, uri: string): Promise<ToolResult> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      return {
        success: false,
        error: `MCP server not connected: ${serverId}`,
      };
    }

    return await connection.readResource(uri);
  }

  /**
   * Discover prompts from an MCP server
   */
  async discoverPrompts(serverId: string): Promise<MCPPrompt[]> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      log.error(`MCP server not connected: ${serverId}`);
      return [];
    }

    return await connection.listPrompts();
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, string>,
  ): Promise<ToolResult> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      return {
        success: false,
        error: `MCP server not connected: ${serverId}`,
      };
    }

    return await connection.getPrompt(promptName, args);
  }

  /**
   * List all connected servers
   */
  listServers(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverId: string): boolean {
    return this.servers.has(serverId);
  }
}

// ============================================================================
// MCP Server Connection
// ============================================================================

class MCPServerConnection {
  private config: MCPServerConfig;
  private capabilities?: MCPHandshakeResponse["capabilities"];
  private sessionId?: string;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Perform MCP handshake
   */
  async handshake(): Promise<boolean> {
    const request: MCPHandshakeRequest = {
      protocolVersion: "2024-11-05",
      clientInfo: {
        name: "OpenOxygen",
        version: "26w13a",
      },
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
      },
    };

    try {
      // In real implementation, this would be an HTTP/WebSocket call
      // For now, simulate a successful handshake
      log.debug(`Handshaking with ${this.config.url}`);
      
      this.capabilities = {
        tools: true,
        resources: true,
        prompts: false,
      };
      
      this.sessionId = `mcp-session-${Date.now()}`;
      
      return true;
    } catch (error) {
      log.error(`Handshake failed: ${error}`);
      return false;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.capabilities?.tools) {
      return [];
    }

    // Simulate tool discovery
    // In real implementation, this would call the MCP server
    return [
      {
        name: "read_file",
        description: "Read a file from the filesystem",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
          },
          required: ["path", "content"],
        },
      },
    ];
  }

  /**
   * Call a tool
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolCallResponse> {
    log.debug(`Calling tool: ${toolName}`);

    // Simulate tool execution
    // In real implementation, this would call the MCP server
    return {
      content: [
        {
          type: "text",
          text: `Tool ${toolName} executed successfully`,
        },
      ],
    };
  }

  /**
   * List available resources
   */
  async listResources(): Promise<MCPResource[]> {
    if (!this.capabilities?.resources) {
      return [];
    }

    return [
      {
        uri: "file:///docs/readme.md",
        name: "README",
        description: "Project readme file",
        mimeType: "text/markdown",
      },
    ];
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<ToolResult> {
    log.debug(`Reading resource: ${uri}`);

    return {
      success: true,
      data: { uri, content: "Resource content" },
    };
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    if (!this.capabilities?.prompts) {
      return [];
    }

    return [
      {
        name: "code_review",
        description: "Review code for best practices",
        arguments: [
          {
            name: "code",
            description: "Code to review",
            required: true,
          },
        ],
      },
    ];
  }

  /**
   * Get a prompt
   */
  async getPrompt(
    promptName: string,
    args?: Record<string, string>,
  ): Promise<ToolResult> {
    log.debug(`Getting prompt: ${promptName}`);

    return {
      success: true,
      data: {
        name: promptName,
        prompt: `Prompt template for ${promptName}`,
        arguments: args,
      },
    };
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    log.debug(`Closing connection to ${this.config.url}`);
    this.sessionId = undefined;
  }
}

// ============================================================================
// MCP Tool Adapter
// ============================================================================

export class MCPToolAdapter {
  private mcpClient: MCPClient;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Convert MCP tool to OpenOxygen skill
   */
  convertToSkill(serverId: string, tool: MCPTool): any {
    return {
      id: `mcp.${serverId}.${tool.name}`,
      name: `MCP: ${tool.description || tool.name}`,
      description: tool.description,
      category: "mcp",
      parameters: Object.entries(tool.inputSchema.properties).map(([key, value]) => ({
        name: key,
        type: (value as any).type,
        required: tool.inputSchema.required?.includes(key) || false,
        description: (value as any).description,
      })),
      handler: async (args: Record<string, unknown>) => {
        return this.mcpClient.callTool(serverId, tool.name, args);
      },
    };
  }

  /**
   * Discover and register all tools from a server
   */
  async discoverAndRegister(serverId: string, skillRegistry: any): Promise<number> {
    const tools = await this.mcpClient.discoverTools(serverId);
    
    for (const tool of tools) {
      const skill = this.convertToSkill(serverId, tool);
      skillRegistry.register(skill);
    }

    log.info(`Registered ${tools.length} MCP tools from ${serverId}`);
    return tools.length;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const mcpClient = new MCPClient();
