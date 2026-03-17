async function test() {
  const prompt = `Task: Open Chrome. Reply with ONLY JSON: {"action":"gui_hotkey","target":"win+r","params":{"keys":"win+r"},"prediction":"Run opens","reasoning":"Launch Chrome"}`;
  
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "qwen3:4b", prompt, stream: false, options: { num_predict: 300 } }),
  });
  const data = await res.json();
  
  console.log("response:", JSON.stringify(data.response).substring(0, 200));
  console.log("thinking:", JSON.stringify(data.thinking).substring(0, 500));
  
  // Try balanced brace extraction from thinking
  const text = data.thinking || "";
  let start = text.indexOf("{");
  if (start >= 0) {
    let depth = 0, end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") depth++;
      if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end >= 0) {
      const jsonStr = text.substring(start, end + 1);
      console.log("Extracted:", jsonStr.substring(0, 200));
      try { console.log("Parsed:", JSON.parse(jsonStr)); } catch (e) { console.log("Parse error:", e.message); }
    }
  }
}

test();
