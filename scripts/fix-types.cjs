#!/usr/bin/env node
/**
 * Auto-fix TypeScript type errors
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = 'D:\\Coding\\OpenOxygen';

// Common fixes
const FIXES = [
  // Fix 1: Add @ts-ignore to lines with specific errors
  {
    pattern: /import.*from ['"]\..*\.js['"];/g,
    fix: (match) => match.replace('.js', ''),
  },
  // Fix 2: Add missing properties to ToolResult returns
  {
    pattern: /return \{\s*success: (true|false),\s*\};/g,
    fix: (match, success) => `return {\n      success: ${success},\n      durationMs: 0,\n    };`,
  },
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Apply fixes
  for (const { pattern, fix } of FIXES) {
    if (pattern.test(content)) {
      content = content.replace(pattern, fix);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let fixed = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !['node_modules', 'dist'].includes(entry.name)) {
      fixed += walkDir(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      if (fixFile(fullPath)) {
        fixed++;
      }
    }
  }

  return fixed;
}

console.log('🔧 Auto-fixing TypeScript errors...\n');
const fixed = walkDir(path.join(PROJECT_ROOT, 'src'));
console.log(`\n✅ Fixed ${fixed} files`);
