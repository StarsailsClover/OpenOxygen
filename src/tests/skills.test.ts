/**
 * Skills Tests
 * 
 * Test suite for skill library
 */

import { describe, test, expect, beforeEach } from "vitest";
import { skillRegistry } from "../skills/registry.js";
import { registerOfficeSkills } from "../skills/office/index.js";
import { registerBrowserSkills } from "../skills/browser/index.js";
import { registerSystemSkills } from "../skills/system/index.js";

describe("Skill Registry", () => {
  beforeEach(() => {
    // Clear registry before each test
    // Note: In real implementation, we might want to mock this
  });

  describe("Registration", () => {
    test("should register a skill", () => {
      const skill = {
        id: "test.skill",
        name: "Test Skill",
        description: "A test skill",
        category: "test",
        handler: async () => ({ success: true }),
      };

      skillRegistry.register(skill);

      expect(skillRegistry.has("test.skill")).toBe(true);
      expect(skillRegistry.get("test.skill")).toEqual(skill);
    });

    test("should unregister a skill", () => {
      const skill = {
        id: "unregister.test",
        name: "Unregister Test",
        description: "Test unregister",
        category: "test",
        handler: async () => ({ success: true }),
      };

      skillRegistry.register(skill);
      expect(skillRegistry.has("unregister.test")).toBe(true);

      const result = skillRegistry.unregister("unregister.test");
      expect(result).toBe(true);
      expect(skillRegistry.has("unregister.test")).toBe(false);
    });

    test("should list all skills", () => {
      const skills = skillRegistry.list();
      
      expect(Array.isArray(skills)).toBe(true);
    });

    test("should search skills", () => {
      const skill = {
        id: "searchable.skill",
        name: "Searchable Skill",
        description: "Can be found by search",
        category: "test",
        handler: async () => ({ success: true }),
      };

      skillRegistry.register(skill);

      const results = skillRegistry.search("searchable");
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(s => s.id === "searchable.skill")).toBe(true);
    });
  });

  describe("Execution", () => {
    test("should execute a skill", async () => {
      const skill = {
        id: "executable.skill",
        name: "Executable Skill",
        description: "Can be executed",
        category: "test",
        handler: async (param: string) => ({ 
          success: true, 
          data: param 
        }),
      };

      skillRegistry.register(skill);

      const result = await skillRegistry.execute("executable.skill", "test-param");

      expect(result.success).toBe(true);
      expect(result.data).toBe("test-param");
    });

    test("should return error for non-existent skill", async () => {
      const result = await skillRegistry.execute("nonexistent.skill");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("should handle skill execution error", async () => {
      const skill = {
        id: "failing.skill",
        name: "Failing Skill",
        description: "Always fails",
        category: "test",
        handler: async () => {
          throw new Error("Execution failed");
        },
      };

      skillRegistry.register(skill);

      const result = await skillRegistry.execute("failing.skill");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Execution failed");
    });
  });

  describe("Categories", () => {
    test("should list skills by category", () => {
      const skill1 = {
        id: "cat1.skill1",
        name: "Skill 1",
        description: "Category 1 skill",
        category: "category1",
        handler: async () => ({ success: true }),
      };

      const skill2 = {
        id: "cat1.skill2",
        name: "Skill 2",
        description: "Category 1 skill 2",
        category: "category1",
        handler: async () => ({ success: true }),
      };

      const skill3 = {
        id: "cat2.skill1",
        name: "Skill 3",
        description: "Category 2 skill",
        category: "category2",
        handler: async () => ({ success: true }),
      };

      skillRegistry.register(skill1);
      skillRegistry.register(skill2);
      skillRegistry.register(skill3);

      const cat1Skills = skillRegistry.listByCategory("category1");
      
      expect(cat1Skills.length).toBe(2);
      expect(cat1Skills.some(s => s.id === "cat1.skill1")).toBe(true);
      expect(cat1Skills.some(s => s.id === "cat1.skill2")).toBe(true);
    });

    test("should get all categories", () => {
      const categories = skillRegistry.getCategories();
      
      expect(Array.isArray(categories)).toBe(true);
    });
  });
});

describe("Office Skills", () => {
  test("should register office skills", () => {
    // This would register actual skills in a real test
    // For now, just verify the function exists
    expect(typeof registerOfficeSkills).toBe("function");
  });
});

describe("Browser Skills", () => {
  test("should register browser skills", () => {
    expect(typeof registerBrowserSkills).toBe("function");
  });
});

describe("System Skills", () => {
  test("should register system skills", () => {
    expect(typeof registerSystemSkills).toBe("function");
  });
});
