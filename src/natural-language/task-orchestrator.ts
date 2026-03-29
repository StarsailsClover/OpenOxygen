/**
 * OpenOxygen - Natural Language Task Orchestrator (26w15aF Phase A.3)
 *
 * P-2: 自然语言任务编排系统
 * - 接收自然语言指令
 * - 调用LLM分析意图
 * - 编排脚本模板和组件
 * - 生成可执行工作流
 */

import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
import type {
  InferenceEngine,
  ChatMessage,
} from "../inference/engine/index.js";

const log = createSubsystemLogger("natural-language/orchestrator");

// Task types
export type TaskType =
  | "browser_automation"
  | "gui_automation"
  | "file_operation"
  | "system_command"
  | "data_processing"
  | "api_call"
  | "multi_step";

// Task intent
export interface TaskIntent {
  type: TaskType;
  description: string;
  confidence: number;
  parameters: Record<string, any>;
  dependencies: string[];
}

// Script component
export interface ScriptComponent {
  id: string;
  name: string;
  type: "action" | "condition" | "loop" | "template";
  code: string;
  description: string;
  inputs: string[];
  outputs: string[];
}

// Workflow step
export interface WorkflowStep {
  id: string;
  order: number;
  component: ScriptComponent;
  parameters: Record<string, any>;
  condition?: string;
  retryCount: number;
  timeoutMs: number;
}

// Generated workflow
export interface GeneratedWorkflow {
  id: string;
  name: string;
  description: string;
  intent: TaskIntent;
  steps: WorkflowStep[];
  variables: Record<string, any>;
  createdAt: number;
}

// Execution result
export interface ExecutionResult {
  success: boolean;
  workflowId: string;
  durationMs: number;
  stepResults: StepResult[];
  output?: any;
  error?: string;
}

// Step result
export interface StepResult {
  stepId: string;
  success: boolean;
  durationMs: number;
  output?: any;
  error?: string;
}

// Component library
const COMPONENT_LIBRARY: ScriptComponent[] = [
  {
    id: "open_browser",
    name: "Open Browser",
    type: "action",
    code: `await launchBrowser("{{url}}");`,
    description: "Launch browser and navigate to URL",
    inputs: ["url"],
    outputs: ["browserId"],
  },
  {
    id: "click_element",
    name: "Click Element",
    type: "action",
    code: `await clickElement("{{selector}}", {{x}}, {{y}});`,
    description: "Click on a UI element",
    inputs: ["selector", "x", "y"],
    outputs: [],
  },
  {
    id: "type_text",
    name: "Type Text",
    type: "action",
    code: `await typeText("{{text}}", "{{selector}}");`,
    description: "Type text into input field",
    inputs: ["text", "selector"],
    outputs: [],
  },
  {
    id: "wait_seconds",
    name: "Wait",
    type: "action",
    code: `await sleep({{seconds}} * 1000);`,
    description: "Wait for specified seconds",
    inputs: ["seconds"],
    outputs: [],
  },
  {
    id: "screenshot",
    name: "Take Screenshot",
    type: "action",
    code: `const screenshot = await captureScreen("{{path}}");`,
    description: "Capture screen screenshot",
    inputs: ["path"],
    outputs: ["screenshot"],
  },
  {
    id: "run_command",
    name: "Run Command",
    type: "action",
    code: `const result = await executeCommand("{{command}}");`,
    description: "Execute terminal command",
    inputs: ["command"],
    outputs: ["result"],
  },
  {
    id: "read_file",
    name: "Read File",
    type: "action",
    code: `const content = await readFile("{{path}}");`,
    description: "Read file content",
    inputs: ["path"],
    outputs: ["content"],
  },
  {
    id: "write_file",
    name: "Write File",
    type: "action",
    code: `await writeFile("{{path}}", "{{content}}");`,
    description: "Write content to file",
    inputs: ["path", "content"],
    outputs: [],
  },
  {
    id: "if_condition",
    name: "If Condition",
    type: "condition",
    code: `if ({{condition}}) { {{then_block}} } else { {{else_block}} }`,
    description: "Conditional execution",
    inputs: ["condition", "then_block", "else_block"],
    outputs: [],
  },
  {
    id: "loop_times",
    name: "Loop N Times",
    type: "loop",
    code: `for (let i = 0; i < {{count}}; i++) { {{body}} }`,
    description: "Loop specified number of times",
    inputs: ["count", "body"],
    outputs: [],
  },
  {
    id: "loop_until",
    name: "Loop Until Condition",
    type: "loop",
    code: `while (!({{condition}})) { {{body}} }`,
    description: "Loop until condition is met",
    inputs: ["condition", "body"],
    outputs: [],
  },
];

/**
 * Natural Language Task Orchestrator
 */
export class NaturalLanguageOrchestrator {
  private inferenceEngine: InferenceEngine;
  private componentLibrary: Map<string, ScriptComponent>;
  private workflowHistory: GeneratedWorkflow[] = [];

  constructor(inferenceEngine: InferenceEngine) {
    this.inferenceEngine = inferenceEngine;
    this.componentLibrary = new Map(COMPONENT_LIBRARY.map((c) => [c.id, c]));
    log.info("Natural Language Orchestrator initialized");
  }

  /**
   * Process natural language task
   */
  async processTask(
    naturalLanguageInput: string,
    context: Record<string, any> = {},
  ): Promise<GeneratedWorkflow> {
    log.info(`Processing task: ${naturalLanguageInput}`);

    // Step 1: Analyze intent
    const intent = await this.analyzeIntent(naturalLanguageInput, context);
    log.info(`Intent detected: ${intent.type} (${intent.confidence})`);

    // Step 2: Select components
    const selectedComponents = await this.selectComponents(intent);
    log.info(`Selected ${selectedComponents.length} components`);

    // Step 3: Generate workflow
    const workflow = await this.generateWorkflow(
      naturalLanguageInput,
      intent,
      selectedComponents,
    );

    // Step 4: Store in history
    this.workflowHistory.push(workflow);

    log.info(
      `Workflow generated: ${workflow.id} (${workflow.steps.length} steps)`,
    );
    return workflow;
  }

  /**
   * Analyze task intent using LLM
   */
  private async analyzeIntent(
    input: string,
    context: Record<string, any>,
  ): Promise<TaskIntent> {
    const prompt = `Analyze the following natural language task and extract intent:

Task: "${input}"
Context: ${JSON.stringify(context)}

Available task types:
- browser_automation: Web browser operations (navigate, click, type)
- gui_automation: Desktop GUI operations (click, type, drag)
- file_operation: File system operations (read, write, copy, delete)
- system_command: Terminal/shell commands
- data_processing: Data transformation and processing
- api_call: HTTP API requests
- multi_step: Complex multi-step workflow

Respond in JSON format:
{
  "type": "task_type",
  "description": "Brief description of what the task does",
  "confidence": 0.95,
  "parameters": {
    "key": "value"
  },
  "dependencies": []
}`;

    const response = await this.inferenceEngine.infer({
      messages: [{ role: "user", content: prompt }],
      mode: "balanced",
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        type: parsed.type || "multi_step",
        description: parsed.description || input,
        confidence: parsed.confidence || 0.5,
        parameters: parsed.parameters || {},
        dependencies: parsed.dependencies || [],
      };
    } catch (error) {
      log.error(`Failed to parse intent: ${error}`);
      return {
        type: "multi_step",
        description: input,
        confidence: 0.5,
        parameters: {},
        dependencies: [],
      };
    }
  }

  /**
   * Select appropriate components based on intent
   */
  private async selectComponents(
    intent: TaskIntent,
  ): Promise<ScriptComponent[]> {
    const prompt = `Given the task intent, select the most appropriate components from the library:

Intent: ${intent.type} - ${intent.description}
Parameters: ${JSON.stringify(intent.parameters)}

Available components:
${COMPONENT_LIBRARY.map((c) => `- ${c.id}: ${c.description} (type: ${c.type})`).join("\n")}

Select components in order of execution. Respond as JSON array of component IDs:
["component_id_1", "component_id_2", ...]`;

    const response = await this.inferenceEngine.infer({
      messages: [{ role: "user", content: prompt }],
      mode: "balanced",
    });

    try {
      const selectedIds = JSON.parse(response.content);
      return selectedIds
        .map((id: string) => this.componentLibrary.get(id))
        .filter((c): c is ScriptComponent => c !== undefined);
    } catch (error) {
      log.error(`Failed to select components: ${error}`);
      // Return default components based on type
      return this.getDefaultComponents(intent.type);
    }
  }

  /**
   * Get default components for task type
   */
  private getDefaultComponents(type: TaskType): ScriptComponent[] {
    const defaults: Record<TaskType, string[]> = {
      browser_automation: ["open_browser", "wait_seconds", "screenshot"],
      gui_automation: ["screenshot", "click_element", "wait_seconds"],
      file_operation: ["read_file", "write_file"],
      system_command: ["run_command"],
      data_processing: ["read_file", "write_file"],
      api_call: ["run_command"],
      multi_step: ["screenshot", "wait_seconds"],
    };

    const ids = defaults[type] || defaults.multi_step;
    return ids
      .map((id) => this.componentLibrary.get(id))
      .filter((c): c is ScriptComponent => c !== undefined);
  }

  /**
   * Generate workflow from components
   */
  private async generateWorkflow(
    originalInput: string,
    intent: TaskIntent,
    components: ScriptComponent[],
  ): Promise<GeneratedWorkflow> {
    // Generate parameters for each component
    const steps: WorkflowStep[] = [];

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const parameters = await this.generateParameters(
        component,
        intent,
        originalInput,
        i,
      );

      steps.push({
        id: generateId("step"),
        order: i,
        component,
        parameters,
        retryCount: 3,
        timeoutMs: 30000,
      });
    }

    return {
      id: generateId("workflow"),
      name: `Workflow for: ${originalInput.substring(0, 50)}`,
      description: intent.description,
      intent,
      steps,
      variables: {},
      createdAt: nowMs(),
    };
  }

  /**
   * Generate parameters for a component
   */
  private async generateParameters(
    component: ScriptComponent,
    intent: TaskIntent,
    originalInput: string,
    stepIndex: number,
  ): Promise<Record<string, any>> {
    const prompt = `Generate parameters for component "${component.name}" (step ${stepIndex + 1}):

Original task: "${originalInput}"
Component description: ${component.description}
Required inputs: ${component.inputs.join(", ")}
Intent parameters: ${JSON.stringify(intent.parameters)}

Respond as JSON object with parameter values:
{
  "param_name": "param_value"
}`;

    const response = await this.inferenceEngine.infer({
      messages: [{ role: "user", content: prompt }],
      mode: "balanced",
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      log.warn(
        `Failed to generate parameters for ${component.id}, using defaults`,
      );
      return this.getDefaultParameters(component);
    }
  }

  /**
   * Get default parameters for component
   */
  private getDefaultParameters(
    component: ScriptComponent,
  ): Record<string, any> {
    const defaults: Record<string, any> = {
      url: "https://www.google.com",
      selector: "body",
      x: 100,
      y: 100,
      text: "",
      seconds: 1,
      path: "./screenshot.png",
      command: "echo 'hello'",
      condition: "true",
      count: 1,
    };

    const params: Record<string, any> = {};
    for (const input of component.inputs) {
      params[input] = defaults[input] || "";
    }
    return params;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflow: GeneratedWorkflow): Promise<ExecutionResult> {
    log.info(`Executing workflow: ${workflow.id}`);
    const startTime = nowMs();
    const stepResults: StepResult[] = [];

    for (const step of workflow.steps) {
      const stepStart = nowMs();
      log.info(`Executing step ${step.order + 1}: ${step.component.name}`);

      try {
        // In production, this would execute actual code
        // For now, simulate execution
        await this.executeStep(step, workflow.variables);

        stepResults.push({
          stepId: step.id,
          success: true,
          durationMs: nowMs() - stepStart,
        });
      } catch (error: any) {
        log.error(`Step failed: ${error.message}`);
        stepResults.push({
          stepId: step.id,
          success: false,
          durationMs: nowMs() - stepStart,
          error: error.message,
        });

        // Retry if needed
        if (step.retryCount > 0) {
          log.info(`Retrying step (${step.retryCount} retries left)`);
          step.retryCount--;
          // Retry logic here
        }
      }
    }

    const allSuccess = stepResults.every((r) => r.success);
    const duration = nowMs() - startTime;

    log.info(
      `Workflow execution completed: ${allSuccess ? "success" : "failed"} (${duration}ms)`,
    );

    return {
      success: allSuccess,
      workflowId: workflow.id,
      durationMs: duration,
      stepResults,
    };
  }

  /**
   * Execute single step
   */
  private async executeStep(
    step: WorkflowStep,
    variables: Record<string, any>,
  ): Promise<void> {
    // Replace template variables in code
    let code = step.component.code;
    for (const [key, value] of Object.entries(step.parameters)) {
      code = code.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    }

    // In production, execute the code
    // For now, just log it
    log.debug(`Executing code: ${code}`);

    // Simulate execution time
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Add custom component to library
   */
  addComponent(component: ScriptComponent): void {
    this.componentLibrary.set(component.id, component);
    log.info(`Added component: ${component.id}`);
  }

  /**
   * Get workflow history
   */
  getWorkflowHistory(): GeneratedWorkflow[] {
    return [...this.workflowHistory];
  }

  /**
   * Get component library
   */
  getComponentLibrary(): ScriptComponent[] {
    return Array.from(this.componentLibrary.values());
  }
}

// Export component library
export { COMPONENT_LIBRARY };

// Export orchestrator
export const NaturalLanguageOrchestration = {
  NaturalLanguageOrchestrator,
};

export default NaturalLanguageOrchestration; // ...existing code...
