/**
 * Skill Registry
 * 
 * Central registry for all skills
 * Manages skill registration, discovery, and execution
 */

import { createSubsystemLogger } from "../logging/index.js";
import type { ToolResult } from "../types/index.js";

const log = createSubsystemLogger("skills/registry");

// ============================================================================
// Types
// ============================================================================

export type SkillHandler = (...args: any[]) => Promise<ToolResult>;

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  handler: SkillHandler;
  parameters?: SkillParameter[];
  returns?: SkillReturn;
}

export interface SkillParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface SkillReturn {
  type: string;
  description: string;
}

// ============================================================================
// Skill Registry
// ============================================================================

class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  /**
   * Register a skill
   */
  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
    
    // Add to category
    if (!this.categories.has(skill.category)) {
      this.categories.set(skill.category, new Set());
    }
    this.categories.get(skill.category)!.add(skill.id);
    
    log.info(`Skill registered: ${skill.name} (${skill.id})`);
  }

  /**
   * Unregister a skill
   */
  unregister(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      this.skills.delete(skillId);
      this.categories.get(skill.category)?.delete(skillId);
      log.info(`Skill unregistered: ${skillId}`);
      return true;
    }
    return false;
  }

  /**
   * Get skill by ID
   */
  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Check if skill exists
   */
  has(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  /**
   * Execute skill
   */
  async execute(skillId: string, ...args: any[]): Promise<ToolResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${skillId}`,
      };
    }

    try {
      log.info(`Executing skill: ${skill.name}`);
      const result = await skill.handler(...args);
      return result;
    } catch (error) {
      log.error(`Skill execution failed: ${skillId}`, error);
      return {
        success: false,
        error: `Skill execution failed: ${error}`,
      };
    }
  }

  /**
   * List all skills
   */
  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * List skills by category
   */
  listByCategory(category: string): Skill[] {
    const skillIds = this.categories.get(category);
    if (!skillIds) return [];
    
    return Array.from(skillIds)
      .map((id) => this.skills.get(id))
      .filter((skill): skill is Skill => skill !== undefined);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Search skills
   */
  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(
      (skill) =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get skill count
   */
  get count(): number {
    return this.skills.size;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const skillRegistry = new SkillRegistry();

// Convenience functions
export function registerSkill(skill: Skill): void {
  skillRegistry.register(skill);
}

export function getSkill(skillId: string): Skill | undefined {
  return skillRegistry.get(skillId);
}

export function executeSkill(skillId: string, ...args: any[]): Promise<ToolResult> {
  return skillRegistry.execute(skillId, ...args);
}

export function listSkills(): Skill[] {
  return skillRegistry.list();
}

export function searchSkills(query: string): Skill[] {
  return skillRegistry.search(query);
}
