// Test format:json mode only
async function test() {
  const prompt = `Reply with ONLY this JSON: {"action":"click","x":100,"y":200}`;

  // Test 1: format:json via /api/generate
  console.log("=== qwen3:4b format:json /api/generate ===");
  const start1 = Date.now();
  const res1 = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3:4b", prompt, stream: false,
      format: "json",
      options: { num_predict: 200 },
    }),
  });
  const data1 = await res1.json();
  console.log(`Time: ${Date.now() - start1}ms`);
  console.log(`response: [${(data1.response || "").substring(0, 200)}]`);
  console.log(`thinking: [${(data1.thinking || "").substring(0, 200)}]`);

  // Test 2: format:json via /api/chat
  console.log("\n=== qwen3:4b format:json /api/chat ===");
  const start2 = Date.now();
  const res2 = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3:4b",
      messages: [{ role: "user", content: prompt }],
      stream: false,
      format: "json",
      options: { num_predict: 200 },
    }),
  });
  const data2 = await res2.json();
  console.log(`Time: ${Date.now() - start2}ms`);
  console.log(`content: [${(data2.message?.content || "").substring(0, 200)}]`);
  console.log(`thinking: [${(data2.message?.thinking || "").substring(0, 200)}]`);

  // Test 3: Extract JSON from thinking field
  console.log("\n=== Extract JSON from thinking ===");
  const thinking = data1.thinking || data2.message?.thinking || "";
  if (thinking) {
    let start = thinking.indexOf("{");
    if (start >= 0) {
      let depth = 0, end = -1;
      for (let i = start; i < thinking.length; i++) {
        if (thinking[i] === "{") depth++;
        if (thinking[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end >= 0) {
        const jsonStr = thinking.substring(start, end + 1);
        console.log(`Extracted: ${jsonStr}`);
        try { console.log("Parsed:", JSON.parse(jsonStr)); } catch (e) { console.log("Parse error:", e.message); }
      }
    }
  }
}

test();
