/**
 * OpenAI Protocol Skill Adapter
 * 
 * Adapts OpenOxygen skills to OpenAI tool format
 */

import { createSubsystemLogger } from "../../logging/index.js";
import { skillRegistry, Skill } from "../../skills/registry.js";
import { openAIProtocol, OpenAITool, RegisteredTool } from "./index.js";

const log = createSubsystemLogger("protocols/openai/skills");

// ============================================================================
// Skill to OpenAI Tool Adapter
// ============================================================================

export class OpenAISkillAdapter {
  private registeredSkills: Map<string, string> = new Map();

  /**
   * Convert a skill to OpenAI tool format
   */
  skillToOpenAITool(skill: Skill): OpenAITool {
    const parameters: Record<string, unknown> = {
      type: "object",
      properties: {},
    };

    if (skill.parameters) {
      for (const param of skill.parameters) {
        (parameters.properties as Record<string, unknown>)[param.name] = {
          type: param.type,
          description: param.description,
        };
      }

      parameters.required = skill.parameters
        .filter((p) => p.required)
        .map((p) => p.name);
    }

    return {
      type: "function",
      function: {
        name: skill.id.replace(/\./g, "_"),
        description: skill.description,
        parameters,
      },
    };
  }

  /**
   * Register a skill with OpenAI protocol
   */
  adaptSkill(skill: Skill): void {
    const openAIName = skill.id.replace(/\./g, "_");

    const registeredTool: RegisteredTool = {
      name: openAIName,
      description: skill.description,
      parameters: this.buildParameters(skill),
      handler: async (args) => {
        return skillRegistry.execute(skill.id, args);
      },
    };

    openAIProtocol.registerTool(registeredTool);
    this.registeredSkills.set(skill.id, openAIName);

    log.info(`Skill adapted to OpenAI: ${skill.id} -> ${openAIName}`);
  }

  /**
   * Register all skills from a category
   */
  adaptCategory(category: string): number {
    const skills = skillRegistry.listByCategory(category);
    let count = 0;

    for (const skill of skills) {
      this.adaptSkill(skill);
      count++;
    }

    log.info(`Adapted ${count} skills from category: ${category}`);
    return count;
  }

  /**
   * Register all available skills
   */
  adaptAllSkills(): number {
    const skills = skillRegistry.list();
    let count = 0;

    for (const skill of skills) {
      this.adaptSkill(skill);
      count++;
    }

    log.info(`Adapted ${count} total skills`);
    return count;
  }

  /**
   * Unregister a skill
   */
  unadaptSkill(skillId: string): boolean {
    const openAIName = this.registeredSkills.get(skillId);
    if (!openAIName) return false;

    openAIProtocol.unregisterTool(openAIName);
    this.registeredSkills.delete(skillId);

    log.info(`Skill unadapted: ${skillId}`);
    return true;
  }

  /**
   * Get OpenAI tool name for a skill
   */
  getOpenAIName(skillId: string): string | undefined {
    return this.registeredSkills.get(skillId);
  }

  /**
   * Get original skill ID from OpenAI tool name
   */
  getSkillId(openAIName: string): string | undefined {
    for (const [skillId, name] of this.registeredSkills) {
      if (name === openAIName) return skillId;
    }
    return undefined;
  }

  /**
   * List adapted skills
   */
  listAdaptedSkills(): string[] {
    return Array.from(this.registeredSkills.keys());
  }

  /**
   * Build parameters schema from skill
   */
  private buildParameters(skill: Skill): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    if (skill.parameters) {
      for (const param of skill.parameters) {
        properties[param.name] = {
          type: this.mapType(param.type),
          description: param.description,
        };
      }
    }

    return {
      type: "object",
      properties,
      required: skill.parameters?.filter((p) => p.required).map((p) => p.name) || [],
    };
  }

  /**
   * Map skill parameter type to JSON schema type
   */
  private mapType(skillType: string): string {
    const typeMap: Record<string, string> = {
      string: "string",
      number: "number",
      boolean: "boolean",
      array: "array",
      object: "object",
      any: "object",
    };

    return typeMap[skillType] || "string";
  }

  /**
   * Auto-discover and register skills
   */
  autoDiscover(): void {
    log.info("Auto-discovering skills for OpenAI...");

    // Register office skills
    this.adaptCategory("office");

    // Register browser skills
    this.adaptCategory("browser");

    // Register system skills
    this.adaptCategory("system");

    log.info(`Auto-discovery complete. Total tools: ${openAIProtocol.listTools().length}`);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const openAISkillAdapter = new OpenAISkillAdapter();
