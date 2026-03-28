async function call(prompt) {
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "qwen3:4b", prompt, stream: false, format: "json", options: { num_predict: 200, temperature: 0.3 } }),
  });
  const data = await res.json();
  const text = data.response || data.thinking || "";
  const s = text.indexOf("{");
  if (s < 0) return { ok: false, raw: text.substring(0, 80) };
  let d = 0, e = -1;
  for (let i = s; i < text.length; i++) { if (text.charAt(i) === "{") d++; if (text.charAt(i) === "}") { d--; if (d === 0) { e = i; break; } } }
  if (e < 0) return { ok: false, raw: text.substring(0, 80) };
  try { return { ok: true, data: JSON.parse(text.substring(s, e + 1)) }; } catch { return { ok: false, raw: text.substring(s, e + 1).substring(0, 80) }; }
}

async function test() {
  // Strategy A: Use (choose one) instead of |
  console.log("=== A: (choose one) ===");
  const rA = await call(`Task: open VS Code.
Win: "Desktop"
UI: [Button]"开始"(28,1092), [Button]"搜索"(624,398), [Edit]"搜索框"(660,398)
Next: {"a":"(choose: click, type, hotkey, cmd, done)","t":"target name","x":0,"y":0,"text":"","keys":"","cmd":"","r":"why"}`);
  console.log(rA.ok ? `OK: a=${rA.data.a}` : `FAIL: ${rA.raw}`);

  // Strategy B: Example-first
  console.log("\n=== B: Example-first ===");
  const rB = await call(`Task: open VS Code.
Win: "Desktop"
UI: [Button]"开始"(28,1092), [Button]"搜索"(624,398)
Example: {"a":"hotkey","keys":"win","r":"open start menu"}
Your turn, pick ONE action:`);
  console.log(rB.ok ? `OK: a=${rB.data.a} keys=${rB.data.keys||""} x=${rB.data.x||0}` : `FAIL: ${rB.raw}`);

  // Strategy C: Numbered options
  console.log("\n=== C: Numbered options ===");
  const rC = await call(`Task: open VS Code.
Win: "Desktop"
UI: [Button]"开始"(28,1092), [Button]"搜索"(624,398)
Actions: 1=click(x,y) 2=type(text) 3=hotkey(keys) 4=cmd(command) 5=done
Pick ONE: {"a":1,"x":0,"y":0,"text":"","keys":"","cmd":"","r":"why"}`);
  console.log(rC.ok ? `OK: a=${rC.data.a}` : `FAIL: ${rC.raw}`);

  // Strategy D: Separate action and params
  console.log("\n=== D: Two fields ===");
  const rD = await call(`Task: type "hello" in search box.
Win: "搜索"
UI: [Edit]"搜索框"(660,398), [Button]"搜索"(900,398)
Pick action: {"do":"click or type or hotkey or cmd","where":"element name","x":660,"y":398,"text":"hello","keys":"","r":"why"}`);
  console.log(rD.ok ? `OK: do=${rD.data.do} x=${rD.data.x} text=${rD.data.text}` : `FAIL: ${rD.raw}`);

  // Strategy E: Fill-in-the-blank
  console.log("\n=== E: Fill-in-blank ===");
  const rE = await call(`Task: open start menu then search "VS Code".
Win: "Desktop"
UI: [Button]"开始"(28,1092)
Step 1: I will _____ the _____ at position (___,___) because _____.
Fill as JSON: {"action":"click","target":"开始","x":28,"y":1092,"reason":"open start menu"}`);
  console.log(rE.ok ? `OK: action=${rE.data.action} target=${rE.data.target} x=${rE.data.x} y=${rE.data.y}` : `FAIL: ${rE.raw}`);

  // Strategy F: Direct instruction
  console.log("\n=== F: Direct instruction ===");
  const rF = await call(`I need to open VS Code. The start button is at position (28,1092). I should click it.
{"action":"click","target":"开始","x":28,"y":1092,"reason":"open start menu to search VS Code"}`);
  console.log(rF.ok ? `OK: action=${rF.data.action} x=${rF.data.x} y=${rF.data.y}` : `FAIL: ${rF.raw}`);
}

test();
