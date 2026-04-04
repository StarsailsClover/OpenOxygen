/**
 * MCP (Model Context Protocol) Client & Server
 *
 * Implementation of Anthropic's MCP protocol for tool discovery and invocation
 * Enables integration with MCP-compatible servers
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type { ToolResult } from "../../types/index.js";
import { generateId, nowMs } from "../../utils/index.js";

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
    sampling?: boolean;
    roots?: boolean;
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
    sampling?: boolean;
    roots?: boolean;
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
  size?: number;
}

export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64 encoded
}

// ============================================================================
// MCP Client
// ============================================================================

export class MCPClient {
  private config: MCPServerConfig;
  private connected: boolean = false;
  private serverCapabilities?: MCPHandshakeResponse["capabilities"];
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];

  constructor(config: MCPServerConfig) {
    this.config = { timeout: 30000, ...config };
    log.info(`MCPClient created for: ${config.name}`);
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<{
    success: boolean;
    error?: string;
    capabilities?: MCPHandshakeResponse["capabilities"];
  }> {
    log.info(`Connecting to MCP server: ${this.config.name}`);

    try {
      const handshakeRequest: MCPHandshakeRequest = {
        protocolVersion: "2024-11-05",
        clientInfo: {
          name: "OpenOxygen",
          version: "26w15a-dev-26.115.0",
        },
        capabilities: {
          tools: true,
          resources: true,
          prompts: false,
          sampling: false,
          roots: false,
        },
      };

      const response = await fetch(`${this.config.url}/mcp/handshake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(handshakeRequest),
      });

      if (!response.ok) {
        throw new Error(`Handshake failed: ${response.status} ${response.statusText}`);
      }

      const handshakeResponse: MCPHandshakeResponse = await response.json();
      this.serverCapabilities = handshakeResponse.capabilities;
      this.connected = true;

      log.info(`Connected to MCP server: ${handshakeResponse.serverInfo.name}`);

      // Discover tools and resources
      if (this.serverCapabilities.tools) {
        await this.discoverTools();
      }
      if (this.serverCapabilities.resources) {
        await this.discoverResources();
      }

      return {
        success: true,
        capabilities: this.serverCapabilities,
      };
    } catch (error) {
      log.error(`MCP connection failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Discover available tools
   */
  async discoverTools(): Promise<{
    success: boolean;
    tools?: MCPTool[];
    error?: string;
  }> {
    if (!this.connected) {
      return { success: false, error: "Not connected" };
    }

    try {
      const response = await fetch(`${this.config.url}/mcp/tools`, {
        headers: this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to discover tools: ${response.status}`);
      }

      const data = await response.json();
      this.tools = data.tools || [];

      log.info(`Discovered ${this.tools.length} tools`);

      return { success: true, tools: this.tools };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Discover available resources
   */
  async discoverResources(): Promise<{
    success: boolean;
    resources?: MCPResource[];
    error?: string;
  }> {
    if (!this.connected) {
      return { success: false, error: "Not connected" };
    }

    try {
      const response = await fetch(`${this.config.url}/mcp/resources`, {
        headers: this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to discover resources: ${response.status}`);
      }

      const data = await response.json();
      this.resources = data.resources || [];

      log.info(`Discovered ${this.resources.length} resources`);

      return { success: true, resources: this.resources };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Call a tool
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    if (!this.connected) {
      return { success: false, error: "Not connected to MCP server" };
    }

    log.info(`Calling MCP tool: ${name}`);

    try {
      const request: MCPToolCallRequest = { name, arguments: args };

      const response = await fetch(`${this.config.url}/mcp/tools/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Tool call failed: ${response.status}`);
      }

      const result: MCPToolCallResponse = await response.json();

      if (result.isError) {
        return {
          success: false,
          error: result.content.map((c) => c.text).join("\n"),
        };
      }

      return {
        success: true,
        data: result.content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<ToolResult> {
    if (!this.connected) {
      return { success: false, error: "Not connected to MCP server" };
    }

    log.info(`Reading MCP resource: ${uri}`);

    try {
      const response = await fetch(
        `${this.config.url}/mcp/resources?uri=${encodeURIComponent(uri)}`,
        {
          headers: this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {},
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to read resource: ${response.status}`);
      }

      const content: MCPResourceContent = await response.json();

      return {
        success: true,
        data: content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return [...this.tools];
  }

  /**
   * Get available resources
   */
  getResources(): MCPResource[] {
    return [...this.resources];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.connected = false;
    this.serverCapabilities = undefined;
    this.tools = [];
    this.resources = [];
    log.info(`Disconnected from MCP server: ${this.config.name}`);
  }
}

// ============================================================================
// MCP Server (Simple Implementation)
// ============================================================================

export interface MCPServerOptions {
  name: string;
  version: string;
  port?: number;
  tools?: MCPTool[];
  resources?: MCPResource[];
  toolHandlers?: Map<string, (args: Record<string, unknown>) => Promise<ToolResult>>;
}

export class MCPServer {
  private options: MCPServerOptions;
  private running: boolean = false;
  private httpServer?: any;

  constructor(options: MCPServerOptions) {
    this.options = { port: 3000, ...options };
    log.info(`MCPServer created: ${options.name}`);
  }

  /**
   * Start MCP server
   */
  async start(): Promise<{ success: boolean; error?: string }> {
    if (this.running) {
      return { success: false, error: "Server already running" };
    }

    try {
      const { createServer } = await import("node:http");

      this.httpServer = createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.options.port, () => {
          resolve();
        });
        this.httpServer!.on("error", reject);
      });

      this.running = true;
      log.info(`MCP Server started on port ${this.options.port}`);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stop MCP server
   */
  async stop(): Promise<void> {
    if (!this.running || !this.httpServer) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.httpServer!.close(() => resolve());
    });

    this.running = false;
    log.info("MCP Server stopped");
  }

  /**
   * Handle HTTP request
   */
  private async handleRequest(req: any, res: any): Promise<void> {
    const url = new URL(req.url, `http://localhost:${this.options.port}`);

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      switch (url.pathname) {
        case "/mcp/handshake":
          await this.handleHandshake(req, res);
          break;
        case "/mcp/tools":
          await this.handleListTools(req, res);
          break;
        case "/mcp/tools/call":
          await this.handleCallTool(req, res);
          break;
        case "/mcp/resources":
          await this.handleListResources(req, res);
          break;
        default:
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not found" }));
      }
    } catch (error) {
      log.error(`Request handling error: ${error}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  private async handleHandshake(req: any, res: any): Promise<void> {
    const response: MCPHandshakeResponse = {
      protocolVersion: "2024-11-05",
      serverInfo: {
        name: this.options.name,
        version: this.options.version,
      },
      capabilities: {
        tools: (this.options.tools?.length || 0) > 0,
        resources: (this.options.resources?.length || 0) > 0,
        prompts: false,
        sampling: false,
        roots: false,
      },
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  }

  private async handleListTools(req: any, res: any): Promise<void> {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ tools: this.options.tools || [] }));
  }

  private async handleListResources(req: any, res: any): Promise<void> {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ resources: this.options.resources || [] }));
  }

  private async handleCallTool(req: any, res: any): Promise<void> {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    // Parse request body
    const body = await new Promise<string>((resolve) => {
      let data = "";
      req.on("data", (chunk: string) => (data += chunk));
      req.on("end", () => resolve(data));
    });

    const request: MCPToolCallRequest = JSON.parse(body);
    const handler = this.options.toolHandlers?.get(request.name);

    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Tool not found: ${request.name}` }));
      return;
    }

    try {
      const result = await handler(request.arguments);

      const response: MCPToolCallResponse = {
        content: [
          {
            type: "text",
            text: result.success
              ? JSON.stringify(result.data)
              : result.error || "Unknown error",
          },
        ],
        isError: !result.success,
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
    } catch (error) {
      const response: MCPToolCallResponse = {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));
    }
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.running;
  }
}

// ============================================================================
// MCP Manager
// ============================================================================

export class MCPManager {
  private clients: Map<string, MCPClient> = new Map();
  private servers: Map<string, MCPServer> = new Map();

  /**
   * Add MCP client
   */
  addClient(config: MCPServerConfig): MCPClient {
    const client = new MCPClient(config);
    this.clients.set(config.id, client);
    return client;
  }

  /**
   * Get MCP client
   */
  getClient(id: string): MCPClient | undefined {
    return this.clients.get(id);
  }

  /**
   * Remove MCP client
   */
  removeClient(id: string): boolean {
    const client = this.clients.get(id);
    if (client) {
      client.disconnect();
      return this.clients.delete(id);
    }
    return false;
  }

  /**
   * Add MCP server
   */
  addServer(options: MCPServerOptions): MCPServer {
    const server = new MCPServer(options);
    this.servers.set(options.name, server);
    return server;
  }

  /**
   * Get MCP server
   */
  getServer(name: string): MCPServer | undefined {
    return this.servers.get(name);
  }

  /**
   * List all clients
   */
  listClients(): MCPClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * List all servers
   */
  listServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  MCPClient,
  MCPServer,
  MCPManager,
  type MCPServerConfig,
  type MCPHandshakeRequest,
  type MCPHandshakeResponse,
  type MCPTool,
  type MCPToolCallRequest,
  type MCPToolCallResponse,
  type MCPResource,
  type MCPResourceContent,
  type MCPServerOptions,
};

export default MCPManager;
