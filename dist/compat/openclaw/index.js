/**
 * OpenClaw Compatibility Layer
 *
 * Seamless migration from OpenClaw to OpenOxygen
 * Provides API compatibility and automatic conversion
 */
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("compat/openclaw");
// ============================================================================
// Context Bridge
// ============================================================================
export class OpenClawContextBridge {
    contexts = new Map();
    /**
     * Create OpenClaw-compatible context
     */
    createContext(sessionId, userId) {
        const context = {
            sessionId,
            userId,
            workspace: `workspace/${sessionId}`,
            variables: {},
        };
        this.contexts.set(sessionId, context);
        log.info(`OpenClaw context created: ${sessionId}`);
        return context;
    }
    /**
     * Get context by session ID
     */
    getContext(sessionId) {
        return this.contexts.get(sessionId);
    }
    /**
     * Set context variable
     */
    setVariable(sessionId, key, value) {
        const context = this.contexts.get(sessionId);
        if (context) {
            context.variables[key] = value;
            return true;
        }
        return false;
    }
    /**
     * Get context variable
     */
    getVariable(sessionId, key) {
        const context = this.contexts.get(sessionId);
        return context?.variables[key];
    }
    /**
     * Clear context
     */
    clearContext(sessionId) {
        const existed = this.contexts.has(sessionId);
        if (existed) {
            this.contexts.delete(sessionId);
            log.info(`OpenClaw context cleared: ${sessionId}`);
        }
        return existed;
    }
}
// ============================================================================
// Skill Adapter
// ============================================================================
export class OpenClawSkillAdapter {
    skills = new Map();
    /**
     * Register OpenClaw skill
     */
    registerSkill(skill) {
        this.skills.set(skill.name, skill);
        log.info(`OpenClaw skill registered: ${skill.name} v${skill.version}`);
    }
    /**
     * Execute OpenClaw skill
     */
    async executeSkill(skillName, params, context) {
        const skill = this.skills.get(skillName);
        if (!skill) {
            return {
                success: false,
                error: `OpenClaw skill not found: ${skillName}`,
            };
        }
        try {
            const result = await skill.handler(params, context);
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `OpenClaw skill execution failed: ${error}`,
            };
        }
    }
    /**
     * List registered skills
     */
    listSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * Check if skill exists
     */
    hasSkill(skillName) {
        return this.skills.has(skillName);
    }
}
export function convertOpenClawConfig(ocConfig) {
    log.info(`Converting OpenClaw config v${ocConfig.version}`);
    return {
        version: "26w15aB",
        skills: ocConfig.skills.map((skill, index) => ({
            id: `skill-${index}`,
            name: skill.name,
            enabled: skill.enabled,
            config: skill.config || {},
        })),
        plugins: ocConfig.plugins.map((plugin, index) => ({
            id: `plugin-${index}`,
            name: plugin.name,
            source: plugin.path,
            config: plugin.config || {},
        })),
        settings: {
            ...ocConfig.settings,
            migratedFrom: "openclaw",
            originalVersion: ocConfig.version,
        },
    };
}
export async function migrateFromOpenClaw(openclawPath, outputPath) {
    log.info(`Starting migration from OpenClaw: ${openclawPath}`);
    const result = {
        success: false,
        migratedSkills: 0,
        migratedPlugins: 0,
        errors: [],
        warnings: [],
    };
    try {
        // Read OpenClaw configuration
        const fs = await import("node:fs");
        const configContent = await fs.promises.readFile(openclawPath, "utf-8");
        const ocConfig = JSON.parse(configContent);
        // Convert configuration
        const ooConfig = convertOpenClawConfig(ocConfig);
        // Write OpenOxygen configuration
        await fs.promises.writeFile(outputPath, JSON.stringify(ooConfig, null, 2));
        result.success = true;
        result.migratedSkills = ooConfig.skills.length;
        result.migratedPlugins = ooConfig.plugins.length;
        log.info(`Migration completed: ${result.migratedSkills} skills, ${result.migratedPlugins} plugins`);
    }
    catch (error) {
        result.errors.push(`Migration failed: ${error}`);
        log.error(`Migration failed: ${error}`);
    }
    return result;
}
export function checkCompatibility(ocConfig) {
    const report = {
        compatible: true,
        skillCompatibility: [],
        overallScore: 100,
    };
    // Check each skill
    for (const skill of ocConfig.skills) {
        const issues = [];
        let compatible = true;
        // Check for known incompatible features
        if (skill.name.includes("deprecated")) {
            compatible = false;
            issues.push("Skill uses deprecated API");
        }
        if (skill.config && skill.config["legacyMode"]) {
            issues.push("Uses legacy mode, may need manual adjustment");
        }
        report.skillCompatibility.push({
            name: skill.name,
            compatible,
            issues,
        });
        if (!compatible) {
            report.compatible = false;
            report.overallScore -= 10;
        }
    }
    report.overallScore = Math.max(0, report.overallScore);
    return report;
}
// ============================================================================
// Singleton Exports
// ============================================================================
export const contextBridge = new OpenClawContextBridge();
export const skillAdapter = new OpenClawSkillAdapter();
// Convenience functions
export function createOpenClawContext(sessionId, userId) {
    return contextBridge.createContext(sessionId, userId);
}
export function registerOpenClawSkill(skill) {
    skillAdapter.registerSkill(skill);
}
export function convertConfig(ocConfig) {
    return convertOpenClawConfig(ocConfig);
}
export async function migrateConfig(openclawPath, outputPath) {
    return migrateFromOpenClaw(openclawPath, outputPath);
}
