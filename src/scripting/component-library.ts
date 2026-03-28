/**
 * OpenOxygen - Component Library Extension (P-2 Task 6)
 *
 * Extended component library:
 * - UI components (buttons, forms, dialogs)
 * - Data components (tables, lists, charts)
 * - Action components (triggers, schedulers)
 * - Integration components (APIs, databases)
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";

const log = createSubsystemLogger("scripting/component-library");

// Component type
export type ExtendedComponentType =
  | "ui"
  | "data"
  | "action"
  | "integration"
  | "logic"
  | "custom";

// Component definition
export interface ExtendedComponent {
  id: string;
  name: string;
  description: string;
  type: ExtendedComponentType;
  category: string;
  icon?: string;
  version: string;
  author?: string;
  inputs: ComponentInput[];
  outputs: ComponentOutput[];
  code: string;
  config?: Record<string, any>;
  documentation?: string;
  examples?: string[];
  createdAt: number;
  updatedAt: number;
}

// Component input
export interface ComponentInput {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "any";
  description: string;
  required: boolean;
  defaultValue?: any;
}

// Component output
export interface ComponentOutput {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "any";
  description: string;
}

// Component instance
export interface ComponentInstance {
  id: string;
  componentId: string;
  name: string;
  config: Record<string, any>;
  connections: {
    inputs: Record<string, string>; // inputName -> sourceId.outputName
    outputs: Record<string, string[]>; // outputName -> [targetId.inputName]
  };
  position?: { x: number; y: number };
}

// Component library
export class ExtendedComponentLibrary {
  private components: Map<string, ExtendedComponent> = new Map();
  private instances: Map<string, ComponentInstance> = new Map();

  constructor() {
    this.registerDefaultComponents();
    log.info("Extended Component Library initialized");
  }

  /**
   * Register default components
   */
  private registerDefaultComponents(): void {
    // UI Components
    this.registerComponent({
      name: "Button",
      description: "Interactive button component",
      type: "ui",
      category: "ui-basic",
      version: "1.0.0",
      inputs: [
        { name: "label", type: "string", description: "Button text", required: true },
        { name: "disabled", type: "boolean", description: "Disable button", required: false, defaultValue: false },
      ],
      outputs: [
        { name: "clicked", type: "boolean", description: "Click event" },
      ],
      code: `renderButton({ label, disabled, onClick: () => emit('clicked', true) })`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      name: "Text Input",
      description: "Text input field",
      type: "ui",
      category: "ui-basic",
      version: "1.0.0",
      inputs: [
        { name: "placeholder", type: "string", description: "Placeholder text", required: false },
        { name: "value", type: "string", description: "Current value", required: false },
      ],
      outputs: [
        { name: "value", type: "string", description: "Input value" },
        { name: "changed", type: "boolean", description: "Value changed event" },
      ],
      code: `renderInput({ placeholder, value, onChange: (v) => { emit('value', v); emit('changed', true); } })`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      name: "Form",
      description: "Form container with validation",
      type: "ui",
      category: "ui-container",
      version: "1.0.0",
      inputs: [
        { name: "fields", type: "array", description: "Form field definitions", required: true },
        { name: "data", type: "object", description: "Form data", required: false },
      ],
      outputs: [
        { name: "data", type: "object", description: "Form data" },
        { name: "valid", type: "boolean", description: "Form valid state" },
        { name: "submitted", type: "boolean", description: "Form submitted" },
      ],
      code: `renderForm({ fields, data, onSubmit: (d) => { emit('data', d); emit('submitted', true); } })`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      name: "Dialog",
      description: "Modal dialog",
      type: "ui",
      category: "ui-container",
      version: "1.0.0",
      inputs: [
        { name: "title", type: "string", description: "Dialog title", required: true },
        { name: "content", type: "string", description: "Dialog content", required: true },
        { name: "visible", type: "boolean", description: "Show dialog", required: false, defaultValue: false },
      ],
      outputs: [
        { name: "confirmed", type: "boolean", description: "User confirmed" },
        { name: "cancelled", type: "boolean", description: "User cancelled" },
      ],
      code: `renderDialog({ title, content, visible, onConfirm: () => emit('confirmed', true), onCancel: () => emit('cancelled', true) })`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    // Data Components
    this.registerComponent({
      id: "data-table",
      name: "Data Table",
      description: "Display data in table format",
      type: "data",
      category: "data-display",
      version: "1.0.0",
      inputs: [
        { name: "data", type: "array", description: "Table data", required: true },
        { name: "columns", type: "array", description: "Column definitions", required: true },
      ],
      outputs: [
        { name: "selected", type: "object", description: "Selected row" },
        { name: "sorted", type: "array", description: "Sorted data" },
      ],
      code: `renderTable({ data, columns, onSelect: (row) => emit('selected', row), onSort: (sorted) => emit('sorted', sorted) })`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      id: "data-list",
      name: "List",
      description: "Display data in list format",
      type: "data",
      category: "data-display",
      version: "1.0.0",
      inputs: [
        { name: "items", type: "array", description: "List items", required: true },
        { name: "renderItem", type: "any", description: "Item render function", required: false },
      ],
      outputs: [
        { name: "selected", type: "any", description: "Selected item" },
      ],
      code: `renderList({ items, renderItem, onSelect: (item) => emit('selected', item) })`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      id: "data-chart",
      name: "Chart",
      description: "Display data as chart",
      type: "data",
      category: "data-display",
      version: "1.0.0",
      inputs: [
        { name: "data", type: "array", description: "Chart data", required: true },
        { name: "type", type: "string", description: "Chart type (line, bar, pie)", required: true },
        { name: "options", type: "object", description: "Chart options", required: false },
      ],
      outputs: [
        { name: "clicked", type: "object", description: "Clicked data point" },
      ],
      code: `renderChart({ data, type, options, onClick: (point) => emit('clicked', point) })`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    // Action Components
    this.registerComponent({
      id: "action-trigger",
      name: "Event Trigger",
      description: "Trigger actions based on events",
      type: "action",
      category: "action-flow",
      version: "1.0.0",
      inputs: [
        { name: "event", type: "string", description: "Event name to listen", required: true },
        { name: "condition", type: "any", description: "Trigger condition", required: false },
      ],
      outputs: [
        { name: "triggered", type: "boolean", description: "Event triggered" },
        { name: "data", type: "any", description: "Event data" },
      ],
      code: `onEvent(event, (data) => { if (!condition || condition(data)) { emit('triggered', true); emit('data', data); } })`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      id: "action-scheduler",
      name: "Scheduler",
      description: "Schedule periodic actions",
      type: "action",
      category: "action-flow",
      version: "1.0.0",
      inputs: [
        { name: "interval", type: "number", description: "Interval in ms", required: true },
        { name: "enabled", type: "boolean", description: "Enable scheduler", required: false, defaultValue: true },
      ],
      outputs: [
        { name: "tick", type: "boolean", description: "Scheduler tick" },
        { name: "count", type: "number", description: "Tick count" },
      ],
      code: `let count = 0; setInterval(() => { if (enabled) { count++; emit('tick', true); emit('count', count); } }, interval)`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      id: "action-delay",
      name: "Delay",
      description: "Delay execution",
      type: "action",
      category: "action-flow",
      version: "1.0.0",
      inputs: [
        { name: "duration", type: "number", description: "Delay duration in ms", required: true },
      ],
      outputs: [
        { name: "completed", type: "boolean", description: "Delay completed" },
      ],
      code: `setTimeout(() => emit('completed', true), duration)`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    // Integration Components
    this.registerComponent({
      id: "integration-api",
      name: "API Call",
      description: "Make HTTP API request",
      type: "integration",
      category: "integration-network",
      version: "1.0.0",
      inputs: [
        { name: "url", type: "string", description: "API URL", required: true },
        { name: "method", type: "string", description: "HTTP method", required: false, defaultValue: "GET" },
        { name: "headers", type: "object", description: "Request headers", required: false },
        { name: "body", type: "any", description: "Request body", required: false },
      ],
      outputs: [
        { name: "response", type: "object", description: "API response" },
        { name: "error", type: "object", description: "Error if failed" },
      ],
      code: `try { const res = await fetch(url, { method, headers, body }); const data = await res.json(); emit('response', data); } catch (err) { emit('error', err); }`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      id: "integration-database",
      name: "Database Query",
      description: "Execute database query",
      type: "integration",
      category: "integration-data",
      version: "1.0.0",
      inputs: [
        { name: "connection", type: "string", description: "Connection string", required: true },
        { name: "query", type: "string", description: "SQL query", required: true },
        { name: "params", type: "array", description: "Query parameters", required: false },
      ],
      outputs: [
        { name: "results", type: "array", description: "Query results" },
        { name: "error", type: "object", description: "Error if failed" },
      ],
      code: `try { const results = await dbQuery(connection, query, params); emit('results', results); } catch (err) { emit('error', err); }`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    // Logic Components
    this.registerComponent({
      id: "logic-condition",
      name: "Condition",
      description: "Conditional branching",
      type: "logic",
      category: "logic-control",
      version: "1.0.0",
      inputs: [
        { name: "condition", type: "boolean", description: "Condition to evaluate", required: true },
        { name: "trueValue", type: "any", description: "Value if true", required: false },
        { name: "falseValue", type: "any", description: "Value if false", required: false },
      ],
      outputs: [
        { name: "result", type: "any", description: "Result value" },
        { name: "isTrue", type: "boolean", description: "Condition was true" },
      ],
      code: `const result = condition ? trueValue : falseValue; emit('result', result); emit('isTrue', condition)`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      id: "logic-switch",
      name: "Switch",
      description: "Multi-way branching",
      type: "logic",
      category: "logic-control",
      version: "1.0.0",
      inputs: [
        { name: "value", type: "any", description: "Value to switch on", required: true },
        { name: "cases", type: "object", description: "Case mappings", required: true },
      ],
      outputs: [
        { name: "result", type: "any", description: "Matched case result" },
        { name: "matched", type: "string", description: "Matched case key" },
      ],
      code: `const matched = cases[value]; emit('result', matched); emit('matched', value)`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    this.registerComponent({
      id: "logic-merge",
      name: "Merge",
      description: "Merge multiple inputs",
      type: "logic",
      category: "logic-data",
      version: "1.0.0",
      inputs: [
        { name: "inputs", type: "array", description: "Inputs to merge", required: true },
        { name: "strategy", type: "string", description: "Merge strategy (concat, merge, override)", required: false, defaultValue: "merge" },
      ],
      outputs: [
        { name: "result", type: "any", description: "Merged result" },
      ],
      code: `const result = mergeInputs(inputs, strategy); emit('result', result)`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });

    log.info(`Registered ${this.components.size} default components`);
  }

  /**
   * Register component
   */
  registerComponent(
    component: Omit<ExtendedComponent, "id" | "createdAt" | "updatedAt">
  ): ExtendedComponent {
    const fullComponent: ExtendedComponent = {
      ...component,
      id: generateId("comp"),
      createdAt: nowMs(),
      updatedAt: nowMs(),
    };

    this.components.set(fullComponent.id, fullComponent);
    log.info(`Registered component: ${fullComponent.name} (${fullComponent.id})`);
    return fullComponent;
  }

  /**
   * Get component by ID
   */
  getComponent(id: string): ExtendedComponent | undefined {
    return this.components.get(id);
  }

  /**
   * Get components by type
   */
  getComponentsByType(type: ExtendedComponentType): ExtendedComponent[] {
    return Array.from(this.components.values()).filter((c) => c.type === type);
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: string): ExtendedComponent[] {
    return Array.from(this.components.values()).filter(
      (c) => c.category === category
    );
  }

  /**
   * Get all components
   */
  getAllComponents(): ExtendedComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.components.forEach((c) => categories.add(c.category));
    return Array.from(categories);
  }

  /**
   * Create component instance
   */
  createInstance(
    componentId: string,
    name: string,
    config: Record<string, any> = {}
  ): ComponentInstance | null {
    const component = this.components.get(componentId);
    if (!component) return null;

    const instance: ComponentInstance = {
      id: generateId("inst"),
      componentId,
      name,
      config,
      connections: { inputs: {}, outputs: {} },
    };

    this.instances.set(instance.id, instance);
    log.info(`Created instance: ${name} (${instance.id})`);
    return instance;
  }

  /**
   * Get instance
   */
  getInstance(id: string): ComponentInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * Connect instances
   */
  connect(
    sourceId: string,
    sourceOutput: string,
    targetId: string,
    targetInput: string
  ): boolean {
    const source = this.instances.get(sourceId);
    const target = this.instances.get(targetId);

    if (!source || !target) return false;

    // Add output connection
    if (!source.connections.outputs[sourceOutput]) {
      source.connections.outputs[sourceOutput] = [];
    }
    source.connections.outputs[sourceOutput].push(`${targetId}.${targetInput}`);

    // Add input connection
    target.connections.inputs[targetInput] = `${sourceId}.${sourceOutput}`;

    log.info(`Connected: ${sourceId}.${sourceOutput} -> ${targetId}.${targetInput}`);
    return true;
  }

  /**
   * Search components
   */
  searchComponents(query: string): ExtendedComponent[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.components.values()).filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery) ||
        c.category.toLowerCase().includes(lowerQuery)
    );
  }
}

// Export component library
export const ComponentLibraryManager = {
  ExtendedComponentLibrary,
};

export default ComponentLibraryManager;
