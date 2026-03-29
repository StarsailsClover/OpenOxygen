/**
 * OpenAI Tool Calling Protocol
 * 
 * Implementation of OpenAI's function calling standard
 * Compatible with GPT-4, GPT-3.5, and OpenAI-compatible APIs
 */

import { createSubsystemLogger } from "../../logging/index.js";
import type { ToolResult } from "../../types/index.js";

const log = createSubsystemLogger("protocols/openai");

// ============================================================================
// OpenAI Types
// ============================================================================

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface OpenAIFunctionCall {
  name: string;
  arguments: string;
}

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: OpenAIFunctionCall;
}

export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Tool Registry
// ============================================================================

export interface RegisteredTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

// ============================================================================
// OpenAI Protocol
// ============================================================================

export class OpenAIProtocol {
  private tools: Map<string, RegisteredTool> = new Map();
  private apiKey?: string;
  private baseUrl: string;

  constructor(config?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = config?.apiKey;
    this.baseUrl = config?.baseUrl || "https://api.openai.com/v1";
  }

  /**
   * Register a tool for OpenAI function calling
   */
  registerTool(tool: RegisteredTool): void {
    this.tools.set(tool.name, tool);
    log.info(`Tool registered: ${tool.name}`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    const existed = this.tools.has(name);
    if (existed) {
      this.tools.delete(name);
      log.info(`Tool unregistered: ${name}`);
    }
    return existed;
  }

  /**
   * Convert registered tools to OpenAI format
   */
  getOpenAITools(): OpenAITool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Execute a tool call
   */
  async executeToolCall(toolCall: OpenAIToolCall): Promise<ToolResult> {
    const { name } = toolCall.function;
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`,
      };
    }

    try {
      // Parse arguments
      const args = JSON.parse(toolCall.function.arguments);
      
      log.info(`Executing tool: ${name}`, args);
      
      // Execute handler
      const result = await tool.handler(args);
      
      log.info(`Tool executed: ${name}`, { success: result.success });
      
      return result;
    } catch (error) {
      log.error(`Tool execution failed: ${name}`, error);
      return {
        success: false,
        error: `Execution failed: ${error}`,
      };
    }
  }

  /**
   * Format tool result for OpenAI
   */
  formatToolResult(toolCallId: string, result: ToolResult): OpenAIMessage {
    return {
      role: "tool",
      tool_call_id: toolCallId,
      content: result.success 
        ? JSON.stringify(result.data || result.output || "Success")
        : JSON.stringify({ error: result.error }),
    };
  }

  /**
   * Process a conversation with tool calling
   */
  async processWithTools(
    messages: OpenAIMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<{
    response: OpenAIResponse;
    toolResults: Array<{ toolCall: OpenAIToolCall; result: ToolResult }>;
  }> {
    const tools = this.getOpenAITools();
    
    if (tools.length === 0) {
      throw new Error("No tools registered");
    }

    // Build request
    const request: OpenAIRequest = {
      model: options?.model || "gpt-4",
      messages,
      tools,
      tool_choice: "auto",
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    };

    // Call OpenAI API
    const response = await this.callOpenAI(request);
    
    // Check for tool calls
    const assistantMessage = response.choices[0]?.message;
    const toolCalls = assistantMessage?.tool_calls;

    const toolResults: Array<{ toolCall: OpenAIToolCall; result: ToolResult }> = [];

    if (toolCalls && toolCalls.length > 0) {
      // Execute each tool call
      for (const toolCall of toolCalls) {
        const result = await this.executeToolCall(toolCall);
        toolResults.push({ toolCall, result });
      }
    }

    return { response, toolResults };
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Create a conversation with tool results
   */
  createConversation(
    originalMessages: OpenAIMessage[],
    assistantResponse: OpenAIResponse,
    toolResults: Array<{ toolCall: OpenAIToolCall; result: ToolResult }>,
  ): OpenAIMessage[] {
    const messages = [...originalMessages];
    
    // Add assistant message with tool calls
    const assistantMessage = assistantResponse.choices[0]?.message;
    if (assistantMessage) {
      messages.push(assistantMessage);
    }

    // Add tool results
    for (const { toolCall, result } of toolResults) {
      messages.push(this.formatToolResult(toolCall.id, result));
    }

    return messages;
  }

  /**
   * List registered tools
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool schema
   */
  getToolSchema(name: string): OpenAITool | undefined {
    const tool = this.tools.get(name);
    if (!tool) return undefined;

    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  /**
   * Validate tool arguments
   */
  validateArguments(
    toolName: string,
    args: Record<string, unknown>,
  ): { valid: boolean; errors?: string[] } {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { valid: false, errors: [`Tool not found: ${toolName}`] };
    }

    const errors: string[] = [];
    const required = (tool.parameters.required as string[]) || [];

    for (const param of required) {
      if (!(param in args)) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const openAIProtocol = new OpenAIProtocol();
