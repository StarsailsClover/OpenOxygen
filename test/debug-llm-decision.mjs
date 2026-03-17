async function test() {
  const resp = await fetch("http://127.0.0.1:4800/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{
        role: "user",
        content: "Say hello in one word"
      }],
    }),
  });
  const data = await resp.json();
  console.log("Full response:", JSON.stringify(data, null, 2));
}

test();
