// 分析 UIA 元素，找出搜索相关元素的位置
const native = require("D:\\Coding\\OpenOxygen\\packages\\core-native\\index.js");
const elements = native.getUiElements(null);

console.log("=== Search-related elements ===");
const searchRelated = elements.filter(e =>
  e.name.includes("搜索") || e.name.toLowerCase().includes("search") ||
  (e.automationId || "").toLowerCase().includes("search")
);
for (const e of searchRelated) {
  console.log(`  [${e.controlType}] name="${e.name.slice(0,60)}" id="${e.automationId||""}" at(${e.x},${e.y},${e.width}x${e.height})`);
}

console.log("\n=== All elements near top (y < 150) ===");
const topElements = elements.filter(e => e.y < 150 && e.y >= 0 && e.width > 20);
for (const e of topElements) {
  console.log(`  [${e.controlType}] name="${e.name.slice(0,60)}" at(${e.x},${e.y},${e.width}x${e.height})`);
}

console.log("\n=== Edit/Input elements ===");
const inputs = elements.filter(e => e.controlType === "Edit" || e.controlType === "ComboBox");
for (const e of inputs) {
  console.log(`  [${e.controlType}] name="${e.name.slice(0,60)}" id="${e.automationId||""}" at(${e.x},${e.y},${e.width}x${e.height})`);
}
