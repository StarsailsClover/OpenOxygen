#!/usr/bin/env node
/**
 * Update version across all files
 * Version format: 26w13a-main-26.103.0
 * Format: YYwWWa-BRANCH-YY.BUILD.PATCH
 */

const fs = require('fs');
const path = require('path');

const NEW_VERSION = '26w13a-main-26.103.0';
const VERSION_PARTS = {
  year: '26',
  week: '13',
  iteration: 'a',
  branch: 'main',
  build: '103',
  patch: '0'
};

const filesToUpdate = [
  {
    path: 'package.json',
    updater: (content) => {
      const pkg = JSON.parse(content);
      pkg.version = NEW_VERSION;
      return JSON.stringify(pkg, null, 2);
    }
  },
  {
    path: 'README.md',
    updater: (content) => {
      return content.replace(
        /Version-\d+w\d+a[A-Z]?-\d+\.\d+\.\d+/,
        `Version-${NEW_VERSION}`
      );
    }
  },
  {
    path: 'src/core/config/index.ts',
    updater: (content) => {
      return content.replace(
        /VERSION\s*=\s*["'][^"']+["']/,
        `VERSION = "${NEW_VERSION}"`
      );
    }
  },
  {
    path: 'OLB/Cargo.toml',
    updater: (content) => {
      return content.replace(
        /^version\s*=\s*"[^"]+"/m,
        `version = "${VERSION_PARTS.build}.${VERSION_PARTS.patch}"`
      );
    }
  },
  {
    path: 'OLB/python/olb/__init__.py',
    updater: (content) => {
      return content.replace(
        /__version__\s*=\s*["'][^"']+["']/,
        `__version__ = "${NEW_VERSION}"`
      );
    }
  }
];

console.log(`Updating version to: ${NEW_VERSION}`);
console.log('');

let updated = 0;
let failed = 0;

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, '..', file.path);
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const newContent = file.updater(content);
      
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`✓ Updated: ${file.path}`);
        updated++;
      } else {
        console.log(`- No changes: ${file.path}`);
      }
    } else {
      console.log(`✗ Not found: ${file.path}`);
      failed++;
    }
  } catch (error) {
    console.log(`✗ Error updating ${file.path}: ${error.message}`);
    failed++;
  }
}

console.log('');
console.log(`Updated: ${updated} files`);
console.log(`Failed: ${failed} files`);

// Create VERSION.txt
const versionInfo = `OpenOxygen Version: ${NEW_VERSION}
Branch: ${VERSION_PARTS.branch}
Build: ${VERSION_PARTS.year}.${VERSION_PARTS.build}.${VERSION_PARTS.patch}
Date: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(__dirname, '..', 'VERSION.txt'), versionInfo);
console.log('✓ Created VERSION.txt');
