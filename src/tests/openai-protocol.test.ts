/**
 * OpenAI Protocol Tests
 * 
 * Test suite for OpenAI Tool Calling Protocol
 */

import { describe, test, expect, beforeEach } from "vitest";
import {
  OpenAIProtocol,
  OpenAITool,
  OpenAIToolCall,
  openAIProtocol,
} from "../protocols/openai/index.js";

describe("OpenAI Protocol", () => {
  beforeEach(() => {
    // Clear registered tools
    for (const name of openAIProtocol.listTools()) {
      openAIProtocol.unregisterTool(name);
    }
  });

  describe("Tool Registration", () => {
    test("should register a tool", () => {
      openAIProtocol.registerTool({
        name: "get_weather",
        description: "Get weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string" },
          },
          required: ["location"],
        },
        handler: async (args) => ({
          success: true,
          output: { temperature: 72, condition: "sunny" },
        }),
      });

      expect(openAIProtocol.listTools()).toContain("get_weather");
    });

    test("should unregister a tool", () => {
      openAIProtocol.registerTool({
        name: "test_tool",
        description: "Test tool",
        parameters: { type: "object", properties: {} },
        handler: async () => ({ success: true }),
      });

      const result = openAIProtocol.unregisterTool("test_tool");
      
      expect(result).toBe(true);
      expect(openAIProtocol.listTools()).not.toContain("test_tool");
    });

    test("should convert tools to OpenAI format", () => {
      openAIProtocol.registerTool({
        name: "get_time",
        description: "Get current time",
        parameters: {
          type: "object",
          properties: {
            timezone: { type: "string" },
          },
        },
        handler: async () => ({ success: true }),
      });

      const tools = openAIProtocol.getOpenAITools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].type).toBe("function");
      expect(tools[0].function.name).toBe("get_time");
    });
  });

  describe("Tool Execution", () => {
    test("should execute a tool call", async () => {
      openAIProtocol.registerTool({
        name: "calculate",
        description: "Calculate sum",
        parameters: {
          type: "object",
          properties: {
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["a", "b"],
        },
        handler: async (args) => ({
          success: true,
          output: { result: (args.a as number) + (args.b as number) },
        }),
      });

      const toolCall: OpenAIToolCall = {
        id: "call_123",
        type: "function",
        function: {
          name: "calculate",
          arguments: JSON.stringify({ a: 5, b: 3 }),
        },
      };

      const result = await openAIProtocol.executeToolCall(toolCall);
      
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ result: 8 });
    });

    test("should return error for unknown tool", async () => {
      const toolCall: OpenAIToolCall = {
        id: "call_456",
        type: "function",
        function: {
          name: "unknown_tool",
          arguments: "{}",
        },
      };

      const result = await openAIProtocol.executeToolCall(toolCall);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("should handle execution errors", async () => {
      openAIProtocol.registerTool({
        name: "failing_tool",
        description: "Always fails",
        parameters: { type: "object", properties: {} },
        handler: async () => {
          throw new Error("Intentional failure");
        },
      });

      const toolCall: OpenAIToolCall = {
        id: "call_789",
        type: "function",
        function: {
          name: "failing_tool",
          arguments: "{}",
        },
      };

      const result = await openAIProtocol.executeToolCall(toolCall);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("failed");
    });
  });

  describe("Argument Validation", () => {
    test("should validate required arguments", () => {
      openAIProtocol.registerTool({
        name: "send_email",
        description: "Send an email",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string" },
            subject: { type: "string" },
          },
          required: ["to", "subject"],
        },
        handler: async () => ({ success: true }),
      });

      const result = openAIProtocol.validateArguments("send_email", {
        to: "test@example.com",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required parameter: subject");
    });

    test("should pass validation with all required args", () => {
      openAIProtocol.registerTool({
        name: "search",
        description: "Search documents",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
        handler: async () => ({ success: true }),
      });

      const result = openAIProtocol.validateArguments("search", {
        query: "test",
      });

      expect(result.valid).toBe(true);
    });
  });

  describe("Result Formatting", () => {
    test("should format successful result", () => {
      const result = openAIProtocol.formatToolResult("call_123", {
        success: true,
        output: { data: "test" },
      });

      expect(result.role).toBe("tool");
      expect(result.tool_call_id).toBe("call_123");
      expect(result.content).toContain("test");
    });

    test("should format error result", () => {
      const result = openAIProtocol.formatToolResult("call_456", {
        success: false,
        error: "Something went wrong",
      });

      expect(result.role).toBe("tool");
      expect(result.content).toContain("error");
    });
  });

  describe("Tool Schema", () => {
    test("should get tool schema", () => {
      openAIProtocol.registerTool({
        name: "read_file",
        description: "Read a file",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
          required: ["path"],
        },
        handler: async () => ({ success: true }),
      });

      const schema = openAIProtocol.getToolSchema("read_file");

      expect(schema).toBeDefined();
      expect(schema?.type).toBe("function");
      expect(schema?.function.name).toBe("read_file");
    });

    test("should return undefined for unknown tool", () => {
      const schema = openAIProtocol.getToolSchema("nonexistent");
      expect(schema).toBeUndefined();
    });
  });

  describe("Conversation Management", () => {
    test("should create conversation with tool results", () => {
      const originalMessages = [
        { role: "user" as const, content: "What's the weather?" },
      ];

      const assistantResponse = {
        id: "resp_123",
        object: "chat.completion" as const,
        created: Date.now(),
        model: "gpt-4",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant" as const,
              content: null,
              tool_calls: [
                {
                  id: "call_123",
                  type: "function" as const,
                  function: {
                    name: "get_weather",
                    arguments: '{"location": "NYC"}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls" as const,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      const toolResults = [
        {
          toolCall: assistantResponse.choices[0].message.tool_calls![0],
          result: { success: true, output: { temp: 72 } },
        },
      ];

      const conversation = openAIProtocol.createConversation(
        originalMessages,
        assistantResponse,
        toolResults,
      );

      expect(conversation).toHaveLength(3);
      expect(conversation[1].role).toBe("assistant");
      expect(conversation[2].role).toBe("tool");
    });
  });
});
