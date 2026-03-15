const n = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const fs = require("fs");

async function testVision() {
  const ssPath = "D:\\Coding\\OpenOxygen\\.state\\vlm_test.png";
  n.captureScreen(ssPath);
  const b64 = fs.readFileSync(ssPath).toString("base64");
  console.log("Image:", (b64.length / 1024).toFixed(0), "KB base64");

  // Disable thinking mode with /no_think tag
  const body = {
    model: "qwen3-vl:4b",
    messages: [{
      role: "user",
      content: "/no_think\nBriefly list what you see on this screen. Be concise.",
      images: [b64]
    }],
    stream: false,
    options: { num_predict: 300 }
  };

  console.log("Sending...");
  const start = Date.now();
  const res = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  const ms = Date.now() - start;

  console.log(`\nVLM (${ms}ms):`);
  console.log("Content:", data.message?.content || "(empty)");
  if (data.message?.thinking) console.log("Thinking:", data.message.thinking.substring(0, 200));
}

testVision().catch(e => console.error("Error:", e.message));
