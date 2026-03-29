/**
 * MCP Gateway Integration
 * 
 * Integrates MCP client with OpenOxygen Gateway
 * Enables MCP tools to be used as OpenOxygen skills
 */

import { createSubsystemLogger } from "../../logging/index.js";
import { mcpClient, MCPToolAdapter } from "./index.js";
import { skillRegistry } from "../../skills/registry.js";

const log = createSubsystemLogger("protocols/mcp-gateway");

// ============================================================================
// MCP Gateway Integration
// ============================================================================

export class MCPGatewayIntegration {
  private toolAdapter: MCPToolAdapter;
  private registeredServers: Set<string> = new Set();

  constructor() {
    this.toolAdapter = new MCPToolAdapter(mcpClient);
  }

  /**
   * Initialize MCP integration
   */
  async initialize(): Promise<void> {
    log.info("Initializing MCP Gateway integration");

    // Load MCP server configurations
    const configs = this.loadServerConfigs();

    for (const config of configs) {
      await this.connectServer(config);
    }

    log.info(`MCP integration initialized with ${this.registeredServers.size} servers`);
  }

  /**
   * Connect to an MCP server and register its tools
   */
  async connectServer(config: {
    id: string;
    name: string;
    url: string;
    apiKey?: string;
  }): Promise<boolean> {
    log.info(`Connecting MCP server: ${config.name}`);

    const connected = await mcpClient.connect({
      ...config,
      timeout: 30000,
    });

    if (!connected) {
      log.error(`Failed to connect MCP server: ${config.name}`);
      return false;
    }

    // Discover and register tools
    try {
      const count = await this.toolAdapter.discoverAndRegister(config.id, skillRegistry);
      this.registeredServers.add(config.id);
      
      log.info(`MCP server ${config.name} connected with ${count} tools`);
      return true;
    } catch (error) {
      log.error(`Failed to register MCP tools: ${config.name}`, error);
      return false;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<boolean> {
    log.info(`Disconnecting MCP server: ${serverId}`);

    // Unregister tools
    const skills = skillRegistry.list();
    for (const skill of skills) {
      if (skill.id.startsWith(`mcp.${serverId}.`)) {
        skillRegistry.unregister(skill.id);
      }
    }

    const disconnected = await mcpClient.disconnect(serverId);
    if (disconnected) {
      this.registeredServers.delete(serverId);
    }

    return disconnected;
  }

  /**
   * List connected MCP servers
   */
  listConnectedServers(): string[] {
    return Array.from(this.registeredServers);
  }

  /**
   * Get MCP server status
   */
  getServerStatus(serverId: string): {
    connected: boolean;
    tools: number;
  } {
    const connected = mcpClient.isConnected(serverId);
    
    if (!connected) {
      return { connected: false, tools: 0 };
    }

    const skills = skillRegistry.list();
    const toolCount = skills.filter(s => s.id.startsWith(`mcp.${serverId}.`)).length;

    return { connected: true, tools: toolCount };
  }

  /**
   * Load MCP server configurations
   */
  private loadServerConfigs(): Array<{
    id: string;
    name: string;
    url: string;
    apiKey?: string;
  }> {
    // In real implementation, load from config file
    // For now, return empty array or example configs
    return [
      // Example:
      // {
      //   id: "filesystem",
      //   name: "File System MCP",
      //   url: "http://localhost:3001",
      // },
    ];
  }

  /**
   * Reload all MCP servers
   */
  async reload(): Promise<void> {
    log.info("Reloading MCP servers");

    // Disconnect all
    for (const serverId of this.registeredServers) {
      await this.disconnectServer(serverId);
    }

    // Reconnect
    await this.initialize();
  }
}

// ============================================================================
// MCP Configuration Manager
// ============================================================================

export interface MCPServerConfiguration {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
  autoConnect: boolean;
}

export class MCPConfigurationManager {
  private configPath: string;
  private configs: Map<string, MCPServerConfiguration> = new Map();

  constructor(configPath?: string) {
    this.configPath = configPath || "./config/mcp-servers.json";
  }

  /**
   * Load configurations from file
   */
  async load(): Promise<void> {
    try {
      const fs = await import("node:fs");
      
      if (!fs.existsSync(this.configPath)) {
        log.warn(`MCP config file not found: ${this.configPath}`);
        return;
      }

      const content = await fs.promises.readFile(this.configPath, "utf-8");
      const configs: MCPServerConfiguration[] = JSON.parse(content);

      for (const config of configs) {
        this.configs.set(config.id, config);
      }

      log.info(`Loaded ${configs.length} MCP server configurations`);
    } catch (error) {
      log.error("Failed to load MCP configurations", error);
    }
  }

  /**
   * Save configurations to file
   */
  async save(): Promise<void> {
    try {
      const fs = await import("node:fs");
      const configs = Array.from(this.configs.values());
      
      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(configs, null, 2),
        "utf-8"
      );

      log.info(`Saved ${configs.length} MCP server configurations`);
    } catch (error) {
      log.error("Failed to save MCP configurations", error);
    }
  }

  /**
   * Add or update a server configuration
   */
  setConfig(config: MCPServerConfiguration): void {
    this.configs.set(config.id, config);
  }

  /**
   * Get a server configuration
   */
  getConfig(id: string): MCPServerConfiguration | undefined {
    return this.configs.get(id);
  }

  /**
   * Remove a server configuration
   */
  removeConfig(id: string): boolean {
    return this.configs.delete(id);
  }

  /**
   * List all configurations
   */
  listConfigs(): MCPServerConfiguration[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get enabled configurations
   */
  getEnabledConfigs(): MCPServerConfiguration[] {
    return this.listConfigs().filter(c => c.enabled);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const mcpGatewayIntegration = new MCPGatewayIntegration();
export const mcpConfigurationManager = new MCPConfigurationManager();
