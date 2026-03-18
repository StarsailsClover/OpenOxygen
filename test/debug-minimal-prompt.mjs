// Round 2: refine the working format
async function call(prompt) {
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "qwen3:4b", prompt, stream: false, format: "json", options: { num_predict: 300, temperature: 0.3 } }),
  });
  const data = await res.json();
  const text = data.response || data.thinking || "";
  const s = text.indexOf("{");
  if (s < 0) return { ok: false, raw: text.substring(0, 100) };
  let d = 0, e = -1;
  for (let i = s; i < text.length; i++) { if (text.charAt(i) === "{") d++; if (text.charAt(i) === "}") { d--; if (d === 0) { e = i; break; } } }
  if (e < 0) return { ok: false, raw: text.substring(0, 100) };
  try { return { ok: true, data: JSON.parse(text.substring(s, e + 1)) }; } catch { return { ok: false, raw: text.substring(s, e + 1).substring(0, 100) }; }
}

async function test() {
  // Format that works: task + window + elements + "Pick ONE action as JSON: {schema}"
  
  // Test A: Full agent decision with history (fixed format)
  console.log("=== A: Full decision with history ===");
  const rA = await call(`Task: open Chrome browser.
Window: "搜索"
Elements: [Edit]"搜索框"(660,398), [ListItem]"Google Chrome"(700,550)
History: hotkey(win)→ok, type(chrome)→ok
Pick ONE action as JSON: {"a":"click|type|hotkey|cmd","t":"target","x":0,"y":0,"text":"","keys":"","r":"reason"}`);
  console.log(rA.ok ? `OK: ${JSON.stringify(rA.data)}` : `FAIL: ${rA.raw}`);

  // Test B: Complex task with many elements
  console.log("\n=== B: Complex task 15 elements ===");
  const rB = await call(`Task: search "OpenOxygen" on bilibili.
Window: "哔哩哔哩"(Chrome_WidgetWin_1)
Elements: [Edit]"搜索"(800,52), [Button]"搜索"(900,52), [Link]"首页"(100,80), [Link]"番剧"(160,80), [Link]"直播"(220,80), [Link]"游戏中心"(300,80), [Link]"会员购"(380,80), [Image]"logo"(50,52), [Button]"登录"(1800,52), [Link]"动态"(450,80), [Link]"热门"(510,80), [Button]"投稿"(1700,52), [Link]"排行榜"(580,80), [Text]"推荐"(200,150), [Image]"banner"(960,300)
Pick ONE action as JSON: {"a":"click|type|hotkey|cmd","t":"target","x":0,"y":0,"text":"","keys":"","r":"reason"}`);
  console.log(rB.ok ? `OK: ${JSON.stringify(rB.data)}` : `FAIL: ${rB.raw}`);

  // Test C: Terminal task
  console.log("\n=== C: Terminal task ===");
  const rC = await call(`Task: create a new folder called test_project.
Window: "Desktop"
Elements: none relevant
Pick ONE action as JSON: {"a":"click|type|hotkey|cmd","t":"target","x":0,"y":0,"text":"","keys":"","cmd":"command","r":"reason"}`);
  console.log(rC.ok ? `OK: ${JSON.stringify(rC.data)}` : `FAIL: ${rC.raw}`);

  // Test D: After failure, need reflection
  console.log("\n=== D: Reflection after failure ===");
  const rD = await call(`You tried: click(搜索框, 800,52) but it failed because the element was not found.
Task: search on bilibili.
What went wrong and what to do next?
JSON: {"issue":"what went wrong","lesson":"what to learn","next":"next action","confidence":0.5}`);
  console.log(rD.ok ? `OK: ${JSON.stringify(rD.data)}` : `FAIL: ${rD.raw}`);

  // Test E: Multi-step prediction
  console.log("\n=== E: Predict next 3 steps ===");
  const rE = await call(`Task: open notepad and type "Hello World" then save.
Current: Desktop, no windows open.
Plan next 3 steps as JSON: {"steps":[{"a":"action","t":"target"},{"a":"action","t":"target"},{"a":"action","t":"target"}]}`);
  console.log(rE.ok ? `OK: ${JSON.stringify(rE.data)}` : `FAIL: ${rE.raw}`);
}

test();
