#!/usr/bin/env node
/**
 * OpenOxygen 重构脚本
 * 
 * 执行以下操作:
 * 1. 备份 C++ 代码
 * 2. 移除 native/cpp/ 目录
 * 3. 更新构建配置
 * 4. 重新构建 Rust 模块
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = 'D:\\Coding\\OpenOxygen';

console.log('=== OpenOxygen Refactor Script ===\n');

// Step 1: 备份 C++ 代码
console.log('Step 1: Backing up C++ code...');
const backupDir = path.join(ROOT, 'backup', 'native-cpp-' + Date.now());
fs.mkdirSync(backupDir, { recursive: true });

const cppDir = path.join(ROOT, 'native', 'cpp');
if (fs.existsSync(cppDir)) {
  fs.cpSync(cppDir, path.join(backupDir, 'cpp'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'native', 'binding.gyp'), path.join(backupDir, 'binding.gyp'));
  fs.cpSync(path.join(ROOT, 'native', 'package.json'), path.join(backupDir, 'package.json'));
  console.log('  ✓ Backed up to:', backupDir);
}

// Step 2: 移除 C++ 目录
console.log('\nStep 2: Removing C++ code...');
if (fs.existsSync(cppDir)) {
  fs.rmSync(cppDir, { recursive: true });
  fs.unlinkSync(path.join(ROOT, 'native', 'binding.gyp'));
  fs.unlinkSync(path.join(ROOT, 'native', 'package.json'));
  fs.rmdirSync(path.join(ROOT, 'native'));
  console.log('  ✓ Removed native/cpp/');
}

// Step 3: 更新构建配置
console.log('\nStep 3: Updating build configuration...');
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
delete pkgJson.dependencies['node-addon-api'];
delete pkgJson.devDependencies['node-gyp'];
fs.writeFileSync(path.join(ROOT, 'package.json'), JSON.stringify(pkgJson, null, 2));
console.log('  ✓ Updated package.json');

// Step 4: 重新构建 Rust
console.log('\nStep 4: Rebuilding Rust native module...');
try {
  execSync('cd "' + path.join(ROOT, 'packages', 'core-native') + '" && npm run build', {
    stdio: 'inherit'
  });
  console.log('  ✓ Rust module built successfully');
} catch (e) {
  console.error('  ✗ Build failed:', e.message);
  process.exit(1);
}

// Step 5: 构建 TypeScript
console.log('\nStep 5: Building TypeScript...');
try {
  execSync('cd "' + ROOT + '" && npm run build:ts', {
    stdio: 'inherit'
  });
  console.log('  ✓ TypeScript built successfully');
} catch (e) {
  console.error('  ✗ Build failed:', e.message);
  process.exit(1);
}

console.log('\n=== Refactor Complete ===');
console.log('C++ code backed up to:', backupDir);
console.log('Now using unified Rust + SIMD architecture');
