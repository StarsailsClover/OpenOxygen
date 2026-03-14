/**
 * OpenOxygen — Local Model Simulator for Ollama
 *
 * 模拟本地大语言模型，用于测试 OpenOxygen 的完整推理管道。
 * 提供比 mock-llm.mjs 更真实的响应，支持中文理解。
 */

import { createServer } from "node:http";
import process from "node:process";

const PORT = 11434;
const MODEL_NAME = "qwen3:4b";

// 模拟知识库
const KNOWLEDGE_BASE = {
  greetings: [
    
    "你好！我是 Qwen3-4B，一个基于通义千问的大型语言模型。",
    "你好！我是运行在 OpenOxygen 框架上的 AI 助手，很高兴为你服务。",
  ],
  capabilities: [
    "我可以帮你：\n1. 分析屏幕内容和 UI 元素\n2. 执行文件操作（读取、写入、移动）\n3. 控制应用程序（打开、关闭、操作）\n4. 管理进程和系统资源\n5. 生成任务计划并执行\n6. 回答关于 Windows 系统的问题",
  ],
  screenActions: [
    { action: "screen.capture", description: "截取当前屏幕" },
    { action: "file.list", params: { path: "Desktop" }, description: "列出桌面文件" },
    { action: "process.list", description: "查看系统进程" },
  ],
};

function generateResponse(messages, tools) {
  const lastMsg = messages.filter(m => m.role === "user").pop();
  const content = lastMsg?.content?.toLowerCase() || "";
  
  // 检测是否需要工具调用
  if (tools && tools.length > 0) {
    if (content.includes("截图") || content.includes("屏幕") || content.includes("capture")) {
      return {
        content: "好的，我来帮你截取当前屏幕。",
        tool_calls: [{
          id: `call_${Date.now()}`,
          type: "function",
          function: { name: "screen.capture", arguments: JSON.stringify({ outputPath: "D:/Coding/OpenOxygen/.state/screenshot.png" }) }
        }]
      };
    }
    if (content.includes("文件") || content.includes("桌面")) {
      return {
        content: "我来查看一下桌面文件。",
        tool_calls: [{
          id: `call_${Date.now()}`,
          type: "function", 
          function: { name: "file.list", arguments: JSON.stringify({ path: "D:/Coding/OpenOxygen", recursive: false }) }
        }]
      };
    }
  }
  
  // 普通对话响应
  let responseText;
  if (/你好|hello|hi/.test(content)) {
    responseText = KNOWLEDGE_BASE.greetings[Math.floor(Math.random() * KNOWLEDGE_BASE.greetings.length)];
  } else if (/能做什么|功能|help|capability/.test(content)) {
    responseText = KNOWLEDGE_BASE.capabilities[0];
  } else if (/截图|屏幕|screen/.test(content)) {
    responseText = "我可以帮你截取屏幕并进行分析。请使用 /api/v1/chat 接口，我会自动调用屏幕截图工具。";
  } else if (/优化|清理|系统/.test(content)) {
    responseText = "我可以帮你制定系统优化方案，包括：\n1. 清理临时文件\n2. 分析运行进程\n3. 优化启动项\n\n请使用 /api/v1/plan 接口生成详细计划。";
  } else {
    responseText = `收到你的消息："${lastMsg?.content?.slice(0, 100)}..."\n\n我是运行在 OpenOxygen 框架上的 ${MODEL_NAME} 模拟模型，正在与 OxygenUltraVision 视觉系统和高级输入系统协同工作。\n\n这是一个本地推理测试响应，展示了完整的端到端推理管道。`;
  }
  
  return { content: responseText, tool_calls: undefined };
}

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
    res.end(JSON.stringify({ status: "ok", version: "0.17.7", model: MODEL_NAME }));
    return;
  }

  if (req.url === "/api/tags" || req.url === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ models: [{ name: MODEL_NAME, size: 4300000000, digest: "qwen3-4b-mock" }] }));
    return;
  }

  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const { messages, tools, stream } = body;
    
    const startTime = Date.now();
    const result = generateResponse(messages, tools);
    const promptTokens = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    const completionTokens = result.content?.length || 50;
    
    const response = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: MODEL_NAME,
      choices: [{
        index: 0,
        message: { role: "assistant", content: result.content, ...(result.tool_calls ? { tool_calls: result.tool_calls } : {}) },
        finish_reason: result.tool_calls ? "tool_calls" : "stop"
      }],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
    
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
    
    console.log(`[${new Date().toISOString()}] ${messages[messages.length-1]?.role}: "${messages[messages.length-1]?.content?.slice(0,40)}..." → ${result.tool_calls ? "tool_call" : "text"} (${completionTokens} tokens, ${Date.now()-startTime}ms)`);
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log(`║  Local LLM Simulator (${MODEL_NAME})                    │`);
  console.log("║  Ollama-compatible API on :11434                             ║");
  console.log("║  Ready for OpenOxygen inference pipeline                     ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log("");
});
