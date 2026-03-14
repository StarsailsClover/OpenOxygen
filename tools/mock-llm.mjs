/**
 * OpenOxygen — Mock LLM Server
 * OpenAI-compatible API for testing
 */

import { createServer } from "node:http";

const PORT = 11435;
const MODEL = "mock-qwen3-4b";

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", model: MODEL }));
    return;
  }

  if (req.url === "/api/tags") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ models: [{ name: MODEL }] }));
    return;
  }

  if (req.url === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      object: "list",
      data: [{ id: MODEL, object: "model", created: Date.now() }]
    }));
    return;
  }

  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const lastMsg = body.messages?.filter(m => m.role === "user").pop();
    const content = lastMsg?.content?.toLowerCase() || "";
    
    let responseText = "I am a mock LLM for OpenOxygen testing. ";
    if (content.includes("hello") || content.includes("你好")) {
      responseText = "Hello! I am running on OpenOxygen framework. ";
    } else if (content.includes("screen") || content.includes("截图")) {
      responseText = "I can capture the screen. Use the screen capture tool.";
    } else if (content.includes("plan") || content.includes("规划")) {
      responseText = JSON.stringify([
        { action: "screen.capture", params: {}, dependencies: [] },
        { action: "file.list", params: { path: "." }, dependencies: [] }
      ]);
    }

    const result = {
      id: `chat-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now()/1000),
      model: MODEL,
      choices: [{
        index: 0,
        message: { role: "assistant", content: responseText },
        finish_reason: "stop"
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    };
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    console.log(`[${new Date().toISOString()}] chat: "${content.slice(0,40)}..."`);
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock LLM on :${PORT} (${MODEL})`);
});
