/**
 * OpenOxygen — Local Mock LLM Server
 *
 * 模拟 OpenAI-compatible API 的本地服务器，用于调试推理管道。
 * 支持 /v1/chat/completions 端点，返回确定性响应。
 * 后续可无缝替换为 Ollama (Qwen3-4B) 或任何 OpenAI-compatible 服务。
 */

import { createServer } from "node:http";

const PORT = 11434;
const MODEL_NAME = "mock-qwen3-4b";

// ─── Tool Call Simulation ───────────────────────────────────────────────────

function detectToolCall(content) {
  const lower = content.toLowerCase();

  if (lower.includes("截图") || lower.includes("screenshot") || lower.includes("screen")) {
    return {
      id: `call_${Date.now()}`,
      type: "function",
      function: {
        name: "screen.capture",
        arguments: JSON.stringify({ outputPath: "C:\\temp\\screenshot.png" }),
      },
    };
  }

  if (lower.includes("文件") || lower.includes("file") || lower.includes("read")) {
    return {
      id: `call_${Date.now()}`,
      type: "function",
      function: {
        name: "file.read",
        arguments: JSON.stringify({ path: "." }),
      },
    };
  }

  if (lower.includes("进程") || lower.includes("process")) {
    return {
      id: `call_${Date.now()}`,
      type: "function",
      function: {
        name: "process.list",
        arguments: JSON.stringify({}),
      },
    };
  }

  return null;
}

// ─── Response Generator ─────────────────────────────────────────────────────

function generateResponse(messages, tools) {
  const lastMsg = messages.filter((m) => m.role === "user").pop();
  const content = lastMsg?.content ?? "";

  // Check if we should simulate a tool call
  if (tools && tools.length > 0) {
    const toolCall = detectToolCall(content);
    if (toolCall) {
      return {
        content: null,
        tool_calls: [toolCall],
      };
    }
  }

  // Generate contextual response
  const lower = content.toLowerCase();
  let response;

  if (lower.includes("hello") || lower.includes("你好")) {
    response = "你好！我是运行在 OpenOxygen 框架上的本地 AI 助手。我可以帮你管理文件、控制窗口、截取屏幕等。有什么需要帮助的吗？";
  } else if (lower.includes("plan") || lower.includes("规划") || lower.includes("步骤")) {
    response = JSON.stringify([
      { action: "screen.capture", params: { outputPath: "C:\\temp\\analysis.png" }, dependencies: [] },
      { action: "file.list", params: { path: "." }, dependencies: [] },
      { action: "inference", params: { prompt: "Analyze the results" }, dependencies: [0, 1] },
    ]);
  } else if (lower.includes("reflect") || lower.includes("反思")) {
    response = JSON.stringify({
      quality: "good",
      issues: [],
      suggestions: ["Consider adding error handling for edge cases"],
      shouldRetry: false,
    });
  } else if (lower.includes("status") || lower.includes("状态")) {
    response = `系统状态正常。当前模型: ${MODEL_NAME}，运行在 OpenOxygen v0.1.0 框架上。Gateway 端口 4800，推理引擎已连接。`;
  } else {
    response = `收到你的消息: "${content.slice(0, 100)}"。我是 ${MODEL_NAME} 模拟模型，正在 OpenOxygen 框架中运行。这是一个调试响应，用于验证推理管道的端到端连通性。`;
  }

  return { content: response, tool_calls: undefined };
}

// ─── HTTP Server ────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /v1/models — list available models
  if (req.method === "GET" && req.url === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        object: "list",
        data: [
          {
            id: MODEL_NAME,
            object: "model",
            created: Math.floor(Date.now() / 1000),
            owned_by: "openoxygen-local",
          },
        ],
      }),
    );
    return;
  }

  // POST /v1/chat/completions — chat completion
  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));

    const { messages, tools, stream } = body;
    const startTime = Date.now();
    const result = generateResponse(messages, tools);

    const promptTokens = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
    const completionTokens = result.content?.length ?? 50;

    const response = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: MODEL_NAME,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: result.content,
            ...(result.tool_calls ? { tool_calls: result.tool_calls } : {}),
          },
          finish_reason: result.tool_calls ? "tool_calls" : "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };

    // Simulate latency (50-200ms)
    const latency = 50 + Math.random() * 150;
    await new Promise((r) => setTimeout(r, latency));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));

    const elapsed = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] POST /v1/chat/completions — ${elapsed}ms — ${result.tool_calls ? "tool_call" : "text"} (${completionTokens} tokens)`,
    );
    return;
  }

  // Health check
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", model: MODEL_NAME, type: "mock-llm" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("  ┌──────────────────────────────────────────────┐");
  console.log(`  │  Mock LLM Server (${MODEL_NAME})        │`);
  console.log(`  │  OpenAI-compatible API on :${PORT}            │`);
  console.log("  │  Ready for OpenOxygen inference pipeline     │");
  console.log("  └──────────────────────────────────────────────┘");
  console.log("");
  console.log("  Endpoints:");
  console.log(`    GET  http://127.0.0.1:${PORT}/v1/models`);
  console.log(`    POST http://127.0.0.1:${PORT}/v1/chat/completions`);
  console.log("");
});
