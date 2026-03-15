// Quick UIA element analysis for bilibili
const n = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const els = n.getUiElements(null).filter(e => e.name && !e.isOffscreen && e.width > 0);

console.log("=== Search-related elements ===");
const searchEls = els.filter(e =>
  (e.name || "").includes("搜索") || (e.name || "").includes("search") || (e.name || "").includes("Search") ||
  (e.automationId || "").toLowerCase().includes("search")
);
for (const e of searchEls) {
  console.log(`  [${e.controlType}] "${e.name}" aid="${e.automationId || ""}" at(${e.x},${e.y}) ${e.width}x${e.height}`);
}

console.log("\n=== Game-related elements ===");
const gameEls = els.filter(e => (e.name || "").includes("游戏"));
for (const e of gameEls) {
  console.log(`  [${e.controlType}] "${e.name}" at(${e.x},${e.y}) ${e.width}x${e.height}`);
}

console.log("\n=== Top nav elements (y < 100) ===");
const topEls = els.filter(e => e.y < 100 && e.y > 0).sort((a, b) => a.x - b.x);
for (const e of topEls) {
  console.log(`  [${e.controlType}] "${e.name}" at(${e.x},${e.y}) ${e.width}x${e.height}`);
}
