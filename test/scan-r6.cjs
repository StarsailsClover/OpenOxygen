// Scan R6 screenshots and analyze results
const fs = require("fs");
const path = require("path");

const dir = "D:\\Coding\\OpenOxygen\\.state\\26w13a-r6";

console.log("R6 Screenshot Analysis:\n");
console.log("Files found:");

const files = fs.readdirSync(dir).sort();
for (const f of files) {
  const stat = fs.statSync(path.join(dir, f));
  console.log(`  ${f.padEnd(35)} ${(stat.size/1024).toFixed(0)}KB`);
}

console.log(`\n${files.length} screenshots captured`);

// Group by task
const tasks = {
  T1_calc: files.filter(f=>f.includes("calc")),
  T2_bili: files.filter(f=>f.includes("bili")),
  T3_gmail: files.filter(f=>f.includes("gmail")),
  T4_vsc: files.filter(f=>f.includes("vsc")),
  T5_qq: files.filter(f=>f.includes("qq")),
  T6_wechat: files.filter(f=>f.includes("wechat")),
  T7_steam: files.filter(f=>f.includes("steam")),
  T8_doubao: files.filter(f=>f.includes("doubao")),
  T9_github: files.filter(f=>f.includes("github")),
  T10_baidu: files.filter(f=>f.includes("baidu")),
  T11_chatgpt: files.filter(f=>f.includes("chatgpt")),
  T12_sys: files.filter(f=>f.includes("win_")),
  T13_explorer: files.filter(f=>f.includes("explorer")),
  T14_notepad: files.filter(f=>f.includes("notepad")),
  T15_snap: files.filter(f=>f.includes("snap"))
};

console.log("\nTask progress:");
for (const [t, f] of Object.entries(tasks)) {
  const status = f.length > 0 ? "✓" : "✗";
  console.log(`  ${status} ${t.padEnd(20)} ${f.length} shots`);
}
