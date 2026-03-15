// WebSocket realtime channel test
const WebSocket = require("D:\\Coding\\OpenOxygen\\node_modules\\ws");

const ws = new WebSocket("ws://127.0.0.1:4800/ws");

ws.on("open", () => console.log("✅ WS Connected"));

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`Recv [${msg.type}]:`, JSON.stringify(msg.data || {}).slice(0, 120));

  if (msg.type === "system.status") {
    console.log("\n--- Sending chat message via WebSocket ---");
    ws.send(JSON.stringify({
      type: "chat",
      id: "ws-test-1",
      data: { message: "Hello via WebSocket! What can you do?", mode: "fast" },
      timestamp: Date.now(),
    }));
  }

  if (msg.type === "chat.done") {
    console.log("\n✅ LLM Response:", msg.data?.content?.slice(0, 200));
    console.log("   Model:", msg.data?.model, "| Duration:", msg.data?.durationMs, "ms");
    ws.close();
    setTimeout(() => process.exit(0), 500);
  }

  if (msg.type === "task.error") {
    console.log("❌ Error:", msg.data?.error);
    ws.close();
    setTimeout(() => process.exit(1), 500);
  }
});

ws.on("error", (e) => {
  console.log("❌ WS Error:", e.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("⏰ Timeout (60s)");
  process.exit(1);
}, 60000);
