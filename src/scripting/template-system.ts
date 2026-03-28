/**
 * OpenOxygen - Script Template System (P-2 Task 5)
 *
 * Script template management:
 * - Template creation and registration
 * - Variable substitution
 * - Template inheritance
 * - Template validation
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";

const log = createSubsystemLogger("scripting/template-system");

// Template parameter
export interface TemplateParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

// Script template
export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author?: string;
  parameters: TemplateParameter[];
  template: string;
  dependencies: string[];
  createdAt: number;
  updatedAt: number;
}

// Template execution context
export interface TemplateContext {
  variables: Record<string, any>;
  functions: Record<string, Function>;
  imports: Record<string, any>;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Script Template System
 */
export class ScriptTemplateSystem {
  private templates: Map<string, ScriptTemplate> = new Map();
  private categories: Set<string> = new Set();

  constructor() {
    this.registerDefaultTemplates();
    log.info("Script Template System initialized");
  }

  /**
   * Register default templates
   */
  private registerDefaultTemplates(): void {
    // Browser automation templates
    this.registerTemplate({
      name: "Browser Search",
      description: "Open browser and perform search",
      category: "browser",
      version: "1.0.0",
      parameters: [
        {
          name: "url",
          type: "string",
          description: "Search engine URL",
          required: true,
          defaultValue: "https://www.google.com",
        },
        {
          name: "query",
          type: "string",
          description: "Search query",
          required: true,
        },
        {
          name: "waitTime",
          type: "number",
          description: "Wait time after search (ms)",
          required: false,
          defaultValue: 3000,
        },
      ],
      template: `
        await launchBrowser("{{url}}");
        await sleep(1000);
        await clickElement("[name='q']");
        await typeText("{{query}}");
        await keyPress("Enter");
        await sleep({{waitTime}});
      `,
      dependencies: ["browser-core"],
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    // File operation templates
    this.registerTemplate({
      name: "Create File",
      description: "Create a new file with content",
      category: "file",
      version: "1.0.0",
      parameters: [
        {
          name: "path",
          type: "string",
          description: "File path",
          required: true,
        },
        {
          name: "content",
          type: "string",
          description: "File content",
          required: true,
        },
        {
          name: "overwrite",
          type: "boolean",
          description: "Overwrite if exists",
          required: false,
          defaultValue: false,
        },
      ],
      template: `
        if (!{{overwrite}} && await fileExists("{{path}}")) {
          throw new Error("File already exists");
        }
        await writeFile("{{path}}", "{{content}}");
      `,
      dependencies: ["fs-extra"],
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    // Data processing templates
    this.registerTemplate({
      name: "Data Transform",
      description: "Transform data from one format to another",
      category: "data",
      version: "1.0.0",
      parameters: [
        {
          name: "input",
          type: "string",
          description: "Input data or file path",
          required: true,
        },
        {
          name: "inputFormat",
          type: "string",
          description: "Input format (json, csv, xml)",
          required: true,
          validation: { options: ["json", "csv", "xml"] },
        },
        {
          name: "outputFormat",
          type: "string",
          description: "Output format (json, csv, xml)",
          required: true,
          validation: { options: ["json", "csv", "xml"] },
        },
      ],
      template: `
        const data = await readData("{{input}}", "{{inputFormat}}");
        const transformed = await transformData(data, "{{outputFormat}}");
        return transformed;
      `,
      dependencies: ["data-utils"],
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    // API call templates
    this.registerTemplate({
      name: "API Request",
      description: "Make HTTP API request",
      category: "api",
      version: "1.0.0",
      parameters: [
        {
          name: "url",
          type: "string",
          description: "API endpoint URL",
          required: true,
        },
        {
          name: "method",
          type: "string",
          description: "HTTP method",
          required: false,
          defaultValue: "GET",
          validation: { options: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
        },
        {
          name: "headers",
          type: "object",
          description: "Request headers",
          required: false,
          defaultValue: {},
        },
        {
          name: "body",
          type: "object",
          description: "Request body",
          required: false,
        },
      ],
      template: `
        const response = await fetch("{{url}}", {
          method: "{{method}}",
          headers: {{headers}},
          body: {{body}} ? JSON.stringify({{body}}) : undefined,
        });
        return await response.json();
      `,
      dependencies: ["fetch"],
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    // GUI automation templates
    this.registerTemplate({
      name: "GUI Click",
      description: "Click on GUI element",
      category: "gui",
      version: "1.0.0",
      parameters: [
        {
          name: "x",
          type: "number",
          description: "X coordinate",
          required: true,
        },
        {
          name: "y",
          type: "number",
          description: "Y coordinate",
          required: true,
        },
        {
          name: "button",
          type: "string",
          description: "Mouse button",
          required: false,
          defaultValue: "left",
          validation: { options: ["left", "right", "middle"] },
        },
      ],
      template: `
        await mouseMove({{x}}, {{y}});
        await mouseClick("{{button}}");
      `,
      dependencies: ["native-input"],
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    log.info(`Registered ${this.templates.size} default templates`);
  }

  /**
   * Register template
   */
  registerTemplate(template: Omit<ScriptTemplate, "id" | "createdAt" | "updatedAt">): ScriptTemplate {
    const fullTemplate: ScriptTemplate = {
      ...template,
      id: generateId("tpl"),
      createdAt: nowMs(),
      updatedAt: nowMs(),
    };

    this.templates.set(fullTemplate.id, fullTemplate);
    this.categories.add(fullTemplate.category);

    log.info(`Registered template: ${fullTemplate.name} (${fullTemplate.id})`);
    return fullTemplate;
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ScriptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): ScriptTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category
    );
  }

  /**
   * Get all templates
   */
  getAllTemplates(): ScriptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories);
  }

  /**
   * Update template
   */
  updateTemplate(
    id: string,
    updates: Partial<Omit<ScriptTemplate, "id" | "createdAt">>
  ): ScriptTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updated = {
      ...template,
      ...updates,
      updatedAt: nowMs(),
    };

    this.templates.set(id, updated);
    log.info(`Updated template: ${updated.name}`);
    return updated;
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      log.info(`Deleted template: ${id}`);
    }
    return deleted;
  }

  /**
   * Render template with parameters
   */
  renderTemplate(templateId: string, parameters: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate parameters
    const validation = this.validateParameters(template, parameters);
    if (!validation.valid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(", ")}`);
    }

    // Fill in default values
    const filledParams = { ...parameters };
    for (const param of template.parameters) {
      if (!(param.name in filledParams) && param.defaultValue !== undefined) {
        filledParams[param.name] = param.defaultValue;
      }
    }

    // Replace placeholders
    let rendered = template.template;
    for (const [key, value] of Object.entries(filledParams)) {
      const placeholder = new RegExp(`{{${key}}}`, "g");
      rendered = rendered.replace(placeholder, JSON.stringify(value));
    }

    return rendered;
  }

  /**
   * Validate parameters
   */
  validateParameters(
    template: ScriptTemplate,
    parameters: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const param of template.parameters) {
      const value = parameters[param.name];

      // Check required
      if (param.required && (value === undefined || value === null)) {
        if (param.defaultValue === undefined) {
          errors.push(`Missing required parameter: ${param.name}`);
          continue;
        }
      }

      if (value === undefined) continue;

      // Type validation
      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (actualType !== param.type) {
        errors.push(
          `Parameter ${param.name} should be ${param.type}, got ${actualType}`
        );
        continue;
      }

      // Pattern validation
      if (param.validation?.pattern && typeof value === "string") {
        const regex = new RegExp(param.validation.pattern);
        if (!regex.test(value)) {
          errors.push(
            `Parameter ${param.name} does not match pattern: ${param.validation.pattern}`
          );
        }
      }

      // Range validation
      if (param.type === "number") {
        if (param.validation?.min !== undefined && value < param.validation.min) {
          errors.push(
            `Parameter ${param.name} should be >= ${param.validation.min}`
          );
        }
        if (param.validation?.max !== undefined && value > param.validation.max) {
          errors.push(
            `Parameter ${param.name} should be <= ${param.validation.max}`
          );
        }
      }

      // Options validation
      if (param.validation?.options && !param.validation.options.includes(value)) {
        errors.push(
          `Parameter ${param.name} should be one of: ${param.validation.options.join(", ")}`
        );
      }
    }

    // Check for unknown parameters
    for (const key of Object.keys(parameters)) {
      if (!template.parameters.find((p) => p.name === key)) {
        warnings.push(`Unknown parameter: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): ScriptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Clone template
   */
  cloneTemplate(id: string, newName: string): ScriptTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    return this.registerTemplate({
      ...template,
      name: newName,
    });
  }
}

// Export template system
export const ScriptTemplateManager = {
  ScriptTemplateSystem,
};

export default ScriptTemplateManager;
