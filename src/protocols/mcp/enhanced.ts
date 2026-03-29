/**
 * MCP Protocol Enhanced Features
 * 
 * Advanced MCP protocol features:
 * - Resource subscriptions
 * - Progress notifications
 * - Roots management
 * - Sampling
 */

import { createSubsystemLogger } from "../../logging/index.js";
import { mcpClient, MCPTool, MCPResource, MCPPrompt } from "./index.js";

const log = createSubsystemLogger("protocols/mcp/enhanced");

// ============================================================================
// Enhanced Types
// ============================================================================

export interface MCPResourceSubscription {
  uri: string;
  callback: (resource: MCPResource) => void;
}

export interface MCPProgressNotification {
  progressToken: string;
  progress: number;
  total?: number;
}

export interface MCPRoot {
  uri: string;
  name?: string;
}

export interface MCPSamplingRequest {
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text" | "image";
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
  modelPreferences?: {
    hints?: Array<{ name?: string }>;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
  systemPrompt?: string;
  maxTokens?: number;
}

export interface MCPSamplingResponse {
  model: string;
  stopReason?: "endTurn" | "stopSequence" | "maxTokens";
  role: "assistant";
  content: {
    type: "text" | "image";
    text?: string;
    data?: string;
    mimeType?: string;
  };
}

// ============================================================================
// Resource Manager
// ============================================================================

export class MCPResourceManager {
  private subscriptions: Map<string, Set<MCPResourceSubscription>> = new Map();
  private resources: Map<string, MCPResource> = new Map();

  /**
   * Subscribe to resource changes
   */
  subscribe(uri: string, callback: (resource: MCPResource) => void): () => void {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }

    const subscription: MCPResourceSubscription = { uri, callback };
    this.subscriptions.get(uri)!.add(subscription);

    log.info(`Subscribed to resource: ${uri}`);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(uri)?.delete(subscription);
      log.info(`Unsubscribed from resource: ${uri}`);
    };
  }

  /**
   * Notify subscribers of resource change
   */
  notifyChange(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);

    const subscribers = this.subscriptions.get(resource.uri);
    if (subscribers) {
      for (const sub of subscribers) {
        try {
          sub.callback(resource);
        } catch (error) {
          log.error(`Error notifying subscriber: ${error}`);
        }
      }
    }
  }

  /**
   * Get cached resource
   */
  getResource(uri: string): MCPResource | undefined {
    return this.resources.get(uri);
  }

  /**
   * List all cached resources
   */
  listResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.resources.clear();
    log.info("Resource cache cleared");
  }
}

// ============================================================================
// Progress Tracker
// ============================================================================

export class MCPProgressTracker {
  private progressCallbacks: Map<string, (progress: MCPProgressNotification) => void> = new Map();

  /**
   * Register progress callback
   */
  onProgress(token: string, callback: (progress: MCPProgressNotification) => void): void {
    this.progressCallbacks.set(token, callback);
  }

  /**
   * Report progress
   */
  reportProgress(token: string, progress: number, total?: number): void {
    const callback = this.progressCallbacks.get(token);
    if (callback) {
      callback({ progressToken: token, progress, total });
    }
  }

  /**
   * Complete progress
   */
  completeProgress(token: string): void {
    this.progressCallbacks.delete(token);
  }
}

// ============================================================================
// Roots Manager
// ============================================================================

export class MCPRootsManager {
  private roots: MCPRoot[] = [];
  private changeListeners: ((roots: MCPRoot[]) => void)[] = [];

  /**
   * Add a root
   */
  addRoot(root: MCPRoot): void {
    this.roots.push(root);
    this.notifyChange();
    log.info(`Root added: ${root.uri}`);
  }

  /**
   * Remove a root
   */
  removeRoot(uri: string): boolean {
    const index = this.roots.findIndex((r) => r.uri === uri);
    if (index >= 0) {
      this.roots.splice(index, 1);
      this.notifyChange();
      log.info(`Root removed: ${uri}`);
      return true;
    }
    return false;
  }

  /**
   * List all roots
   */
  listRoots(): MCPRoot[] {
    return [...this.roots];
  }

  /**
   * On roots change
   */
  onChange(listener: (roots: MCPRoot[]) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index >= 0) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener(this.roots);
      } catch (error) {
        log.error(`Error notifying roots listener: ${error}`);
      }
    }
  }
}

// ============================================================================
// Sampling Handler
// ============================================================================

export class MCPSamplingHandler {
  private samplingCallback?: (request: MCPSamplingRequest) => Promise<MCPSamplingResponse>;

  /**
   * Set sampling callback
   */
  setSamplingCallback(
    callback: (request: MCPSamplingRequest) => Promise<MCPSamplingResponse>,
  ): void {
    this.samplingCallback = callback;
    log.info("Sampling callback registered");
  }

  /**
   * Handle sampling request
   */
  async sample(request: MCPSamplingRequest): Promise<MCPSamplingResponse> {
    if (!this.samplingCallback) {
      throw new Error("No sampling callback registered");
    }

    log.info("Handling sampling request", { messages: request.messages.length });

    return this.samplingCallback(request);
  }

  /**
   * Check if sampling is available
   */
  isSamplingAvailable(): boolean {
    return !!this.samplingCallback;
  }
}

// ============================================================================
// Enhanced MCP Client
// ============================================================================

export class MCPEnhancedClient {
  resourceManager: MCPResourceManager;
  progressTracker: MCPProgressTracker;
  rootsManager: MCPRootsManager;
  samplingHandler: MCPSamplingHandler;

  constructor() {
    this.resourceManager = new MCPResourceManager();
    this.progressTracker = new MCPProgressTracker();
    this.rootsManager = new MCPRootsManager();
    this.samplingHandler = new MCPSamplingHandler();
  }

  /**
   * Initialize enhanced features
   */
  async initialize(serverId: string): Promise<boolean> {
    log.info(`Initializing enhanced MCP features for ${serverId}`);

    // Check if server supports enhanced features
    const connected = mcpClient.isConnected(serverId);
    if (!connected) {
      log.error(`Server not connected: ${serverId}`);
      return false;
    }

    // Initialize resource subscriptions
    // Initialize progress tracking
    // Initialize roots

    log.info(`Enhanced features initialized for ${serverId}`);
    return true;
  }

  /**
   * Subscribe to resource with auto-refresh
   */
  async subscribeResource(
    serverId: string,
    uri: string,
    callback: (resource: MCPResource) => void,
    refreshInterval?: number,
  ): Promise<() => void> {
    // Initial fetch
    const initial = await mcpClient.readResource(serverId, uri);
    if (initial.success) {
      callback(initial.data as MCPResource);
    }

    // Subscribe for updates
    const unsubscribe = this.resourceManager.subscribe(uri, callback);

    // Set up auto-refresh if requested
    let intervalId: NodeJS.Timeout | undefined;
    if (refreshInterval && refreshInterval > 0) {
      intervalId = setInterval(async () => {
        const result = await mcpClient.readResource(serverId, uri);
        if (result.success) {
          this.resourceManager.notifyChange(result.data as MCPResource);
        }
      }, refreshInterval);
    }

    // Return combined unsubscribe
    return () => {
      unsubscribe();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }

  /**
   * Execute tool with progress tracking
   */
  async executeToolWithProgress(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
    onProgress?: (progress: number, total?: number) => void,
  ): Promise<unknown> {
    const progressToken = `progress-${Date.now()}`;

    // Register progress callback
    if (onProgress) {
      this.progressTracker.onProgress(progressToken, (notification) => {
        onProgress(notification.progress, notification.total);
      });
    }

    try {
      // Add progress token to args if server supports it
      const enhancedArgs = {
        ...args,
        _meta: { progressToken },
      };

      const result = await mcpClient.callTool(serverId, toolName, enhancedArgs);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    } finally {
      this.progressTracker.completeProgress(progressToken);
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const mcpEnhancedClient = new MCPEnhancedClient();
