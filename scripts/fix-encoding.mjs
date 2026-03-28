#!/usr/bin/env node
/**
 * Script to fix encoding issues in TypeScript files
 * Converts GBK/UTF-8 mixed encoding to pure UTF-8
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SRC_DIR = "D:\\Coding\\OpenOxygen\\src";

// Common encoding artifacts to fix
const ENCODING_FIXES = [
  // Fix garbled Chinese characters
  { pattern: /鈥\?/g, replacement: "-" },
  { pattern: /鈥/g, replacement: "-" },
  { pattern: /€/g, replacement: "-" },
];

function fixFileEncoding(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf-8");
    let modified = false;

    for (const { pattern, replacement } of ENCODING_FIXES) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

function walkDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDirectory(fullPath);
    } else if (entry.name.endsWith(".ts")) {
      fixFileEncoding(fullPath);
    }
  }
}

console.log("Starting encoding fix...");
walkDirectory(SRC_DIR);
console.log("Encoding fix complete!");
