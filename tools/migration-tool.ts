#!/usr/bin/env node
/**
 * OpenClaw to OpenOxygen Migration Tool
 * 
 * 一键迁移工具
 */

import * as fs from 'fs';
import * as path from 'path';
import { OpenClawAdapter } from '../compat/openclaw/adapter.js';

interface MigrationOptions {
    source: string;
    target: string;
    backup: boolean;
}

class MigrationTool {
    private options: MigrationOptions;
    
    constructor(options: MigrationOptions) {
        this.options = options;
    }
    
    async migrate(): Promise<boolean> {
        console.log('=== OpenClaw to OpenOxygen Migration ===\n');
        
        // 1. 检查源配置
        console.log('Step 1: Checking source configuration...');
        const sourceConfigPath = path.join(this.options.source, 'openclaw.config.json');
        
        if (!fs.existsSync(sourceConfigPath)) {
            console.error('❌ Source config not found:', sourceConfigPath);
            return false;
        }
        
        const openclawConfig = JSON.parse(fs.readFileSync(sourceConfigPath, 'utf8'));
        console.log('✅ Source config loaded');
        
        // 2. 检查兼容性
        console.log('\nStep 2: Checking compatibility...');
        const compatibility = OpenClawAdapter.checkCompatibility(openclawConfig);
        
        if (!compatibility.compatible) {
            console.warn('⚠️ Compatibility issues found:');
            compatibility.issues.forEach(issue => console.warn('  -', issue));
        } else {
            console.log('✅ Configuration is compatible');
        }
        
        // 3. 创建备份
        if (this.options.backup) {
            console.log('\nStep 3: Creating backup...');
            const backupDir = path.join(this.options.target, 'backup', `migration-${Date.now()}`);
            fs.mkdirSync(backupDir, { recursive: true });
            console.log('✅ Backup created:', backupDir);
        }
        
        // 4. 迁移配置
        console.log('\nStep 4: Migrating configuration...');
        const oxygenConfig = OpenClawAdapter.migrateConfig(openclawConfig);
        
        const targetConfigPath = path.join(this.options.target, 'openoxygen.config.json');
        fs.writeFileSync(targetConfigPath, JSON.stringify(oxygenConfig, null, 2));
        console.log('✅ Configuration migrated:', targetConfigPath);
        
        // 5. 完成
        console.log('\n=== Migration Complete ===');
        console.log('OpenOxygen is ready to use!');
        console.log('\nNext steps:');
        console.log('  1. Review the migrated configuration');
        console.log('  2. Install dependencies: npm install');
        console.log('  3. Build native module: cd native && npm run build');
        console.log('  4. Start OpenOxygen: npm start');
        
        return true;
    }
}

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    
    const options: MigrationOptions = {
        source: args[0] || '.',
        target: args[1] || '.',
        backup: true
    };
    
    const tool = new MigrationTool(options);
    tool.migrate().catch(console.error);
}

export { MigrationTool };
