#!/usr/bin/env node
/**
 * File Indexer and Architecture Analyzer
 * Analyzes all project files and categorizes them
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = 'D:\\Coding\\OpenOxygen';

// File categories
const CATEGORIES = {
  // Core source code
  core: {
    patterns: ['src/core/**/*.ts', 'src/execution/**/*.ts', 'src/inference/**/*.ts'],
    description: 'Core system modules'
  },
  
  // Agent and memory
  agent: {
    patterns: ['src/agent/**/*.ts', 'src/memory/**/*.ts'],
    description: 'Agent and memory management'
  },
  
  // Security
  security: {
    patterns: ['src/security/**/*.ts'],
    description: 'Security modules'
  },
  
  // Skills
  skills: {
    patterns: ['src/skills/**/*.ts'],
    description: 'Automation skills'
  },
  
  // Browser and vision
  browser: {
    patterns: ['src/browser/**/*.ts', 'src/vision/**/*.ts'],
    description: 'Browser and vision systems'
  },
  
  // Multimodal
  multimodal: {
    patterns: ['src/multimodal/**/*.ts'],
    description: 'Multimodal processing'
  },
  
  // Planning
  planning: {
    patterns: ['src/planning/**/*.ts'],
    description: 'Planning systems (HTN)'
  },
  
  // Protocols
  protocols: {
    patterns: ['src/protocols/**/*.ts'],
    description: 'Protocol implementations (MCP)'
  },
  
  // Compatibility
  compat: {
    patterns: ['src/compat/**/*.ts'],
    description: 'Compatibility layers'
  },
  
  // Tests
  tests: {
    patterns: ['src/tests/**/*.ts'],
    description: 'Test suites'
  },
  
  // OLB (OxygenLLMBooster)
  olb: {
    patterns: ['OLB/**/*.rs', 'OLB/**/*.toml', 'OLB/**/*.py'],
    description: 'OxygenLLMBooster Rust core'
  },
  
  // Native modules
  native: {
    patterns: ['native/**/*', 'src/native/**/*'],
    description: 'Native C++/Node-API modules'
  },
  
  // Documentation
  docs: {
    patterns: ['docs/**/*.md', '*.md'],
    description: 'Documentation files'
  },
  
  // Scripts
  scripts: {
    patterns: ['scripts/**/*'],
    description: 'Build and utility scripts'
  },
  
  // Configuration
  config: {
    patterns: ['*.json', '*.toml', '*.yaml', '*.yml', '*.config.*'],
    description: 'Configuration files'
  },
  
  // Archives (to be consolidated)
  archive: {
    patterns: ['archive/**/*', '**/archive/**/*', '**/*.bak', '**/*.bak2', '**/*.old'],
    description: 'Archive and backup files'
  },
  
  // Deprecated
  deprecated: {
    patterns: ['src/_deprecated/**/*', 'docs/archive/**/*'],
    description: 'Deprecated code'
  }
};

class FileIndexer {
  constructor() {
    this.files = [];
    this.stats = {
      totalFiles: 0,
      totalSize: 0,
      byCategory: {},
      byExtension: {}
    };
  }
  
  scan() {
    console.log('🔍 Scanning project files...\n');
    
    this.walkDirectory(PROJECT_ROOT);
    this.categorizeFiles();
    this.generateReport();
    
    return this.stats;
  }
  
  walkDirectory(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      // Skip node_modules, .git, dist, target
      if (['node_modules', '.git', 'dist', 'target'].includes(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        this.walkDirectory(fullPath, relPath);
      } else {
        this.addFile(fullPath, relPath);
      }
    }
  }
  
  addFile(fullPath, relPath) {
    const stats = fs.statSync(fullPath);
    const ext = path.extname(relPath).toLowerCase();
    
    this.files.push({
      path: relPath,
      fullPath,
      size: stats.size,
      extension: ext,
      category: null
    });
    
    this.stats.totalFiles++;
    this.stats.totalSize += stats.size;
    this.stats.byExtension[ext] = (this.stats.byExtension[ext] || 0) + 1;
  }
  
  categorizeFiles() {
    for (const file of this.files) {
      for (const [category, info] of Object.entries(CATEGORIES)) {
        for (const pattern of info.patterns) {
          if (this.matchPattern(file.path, pattern)) {
            file.category = category;
            this.stats.byCategory[category] = (this.stats.byCategory[category] || 0) + 1;
            break;
          }
        }
        if (file.category) break;
      }
      
      if (!file.category) {
        file.category = 'other';
        this.stats.byCategory['other'] = (this.stats.byCategory['other'] || 0) + 1;
      }
    }
  }
  
  matchPattern(filePath, pattern) {
    // Simple glob matching
    const regex = pattern
      .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
      .replace(/\*/g, '[^/\\]*')
      .replace(/<<<DOUBLESTAR>>>/g, '.*')
      .replace(/\//g, '[/\\\\]');
    
    return new RegExp(regex).test(filePath);
  }
  
  generateReport() {
    console.log('📊 File Index Report\n');
    console.log('=' .repeat(60));
    
    console.log(`\n📁 Total Files: ${this.stats.totalFiles}`);
    console.log(`📦 Total Size: ${(this.stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n📂 By Category:');
    console.log('-'.repeat(40));
    const sortedCategories = Object.entries(this.stats.byCategory)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [category, count] of sortedCategories) {
      const desc = CATEGORIES[category]?.description || 'Other files';
      console.log(`  ${category.padEnd(15)} ${count.toString().padStart(4)}  ${desc}`);
    }
    
    console.log('\n📄 By Extension (Top 10):');
    console.log('-'.repeat(40));
    const sortedExtensions = Object.entries(this.stats.byExtension)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    for (const [ext, count] of sortedExtensions) {
      console.log(`  ${(ext || '(no ext)').padEnd(10)} ${count.toString().padStart(4)}`);
    }
    
    // Save detailed index
    this.saveIndex();
  }
  
  saveIndex() {
    const indexPath = path.join(PROJECT_ROOT, 'FILE_INDEX.json');
    
    const index = {
      generated: new Date().toISOString(),
      stats: this.stats,
      files: this.files.map(f => ({
        path: f.path,
        category: f.category,
        size: f.size,
        extension: f.extension
      }))
    };
    
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`\n💾 Detailed index saved to: ${indexPath}`);
  }
  
  generateReorganizationPlan() {
    console.log('\n\n🔧 Reorganization Plan\n');
    console.log('=' .repeat(60));
    
    const plan = {
      create: [
        'archive/',           // All archive files
        'archive/old_roadmaps/',
        'archive/backups/',
        'archive/test_outputs/',
        'resources/',         // Potentially useful files
        'resources/docs/',
        'resources/examples/',
        'deprecated/',        // Deprecated code
      ],
      move: [],
      delete: []
    };
    
    // Identify files to move
    for (const file of this.files) {
      // Archive old files
      if (file.path.includes('archive') && !file.path.startsWith('archive/')) {
        plan.move.push({
          from: file.path,
          to: `archive/${file.path}`,
          reason: 'Consolidate archives'
        });
      }
      
      // Archive backup files
      if (file.path.endsWith('.bak') || file.path.endsWith('.bak2')) {
        plan.move.push({
          from: file.path,
          to: `archive/backups/${path.basename(file.path)}`,
          reason: 'Archive backup files'
        });
      }
      
      // Archive old roadmaps
      if (/ROADMAP|CHANGELOG|PROGRESS|SPRINT/i.test(file.path) && 
          !file.path.includes('archive')) {
        plan.move.push({
          from: file.path,
          to: `archive/old_roadmaps/${path.basename(file.path)}`,
          reason: 'Archive old planning documents'
        });
      }
    }
    
    console.log('Directories to create:');
    plan.create.forEach(dir => console.log(`  + ${dir}`));
    
    console.log(`\nFiles to move: ${plan.move.length}`);
    console.log('  (See REORGANIZATION_PLAN.json for details)');
    
    // Save plan
    const planPath = path.join(PROJECT_ROOT, 'REORGANIZATION_PLAN.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(`\n💾 Plan saved to: ${planPath}`);
  }
}

// Run indexer
const indexer = new FileIndexer();
indexer.scan();
indexer.generateReorganizationPlan();

console.log('\n✅ File indexing complete!');
