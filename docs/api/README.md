# OpenOxygen API Documentation

## Overview

OpenOxygen provides a comprehensive API for building AI-powered automation workflows. This document covers the core APIs available in the framework.

## Table of Contents

- [Core APIs](#core-apis)
- [Inference Engine](#inference-engine)
- [Skill System](#skill-system)
- [Multi-Agent System](#multi-agent-system)
- [HTN Planner](#htn-planner)
- [Security](#security)
- [Configuration](#configuration)

## Core APIs

### Entry Point

```typescript
import { OpenOxygen } from "openoxygen";

const oxygen = new OpenOxygen({
  configPath: "./openoxygen.json",
});

await oxygen.initialize();
```

### Configuration

```typescript
import { loadConfig } from "openoxygen/core/config";

const config = await loadConfig({
  configPath: "./openoxygen.json",
});
```

## Inference Engine

### Creating an Engine

```typescript
import { createInferenceEngine } from "openoxygen/inference/engine";
import type { OxygenConfig } from "openoxygen/types";

const config: OxygenConfig = {
  models: [
    {
      provider: "ollama",
      model: "qwen3:4b",
      baseUrl: "http://localhost:11434",
    },
  ],
  // ... other config
};

const engine = createInferenceEngine(config);
```

### Running Inference

```typescript
const response = await engine.infer({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
  ],
  mode: "balanced", // "fast" | "balanced" | "deep"
});

console.log(response.content);
```

### Streaming Responses

```typescript
for await (const chunk of engine.stream({
  messages: [{ role: "user", content: "Tell me a story" }],
})) {
  process.stdout.write(chunk);
}
```

## Skill System

### System Skills

```typescript
import {
  listFiles,
  readFile,
  writeFile,
  createDirectory,
} from "openoxygen/skills/system";

// List files
const files = await listFiles("./src");

// Read file
const content = await readFile("./package.json");

// Write file
await writeFile("./output.txt", "Hello, World!");

// Create directory
await createDirectory("./new-folder");
```

### Browser Skills

```typescript
import {
  launchBrowser,
  navigate,
  clickElement,
  typeText,
} from "openoxygen/skills/browser";

// Launch browser
const browser = await launchBrowser({ headless: false });

// Navigate to URL
await navigate(browser.data.browserId, "https://example.com");

// Click element
await clickElement(browser.data.browserId, { type: "css", value: "#button" });

// Type text
await typeText(browser.data.browserId, { type: "css", value: "#input" }, "Hello");
```

### Office Skills

```typescript
import {
  createWordDocument,
  readWordDocument,
  createExcelWorkbook,
} from "openoxygen/skills/office";

// Create Word document
await createWordDocument({
  path: "./document.docx",
  content: "Document content here",
});

// Create Excel workbook
await createExcelWorkbook({
  path: "./data.xlsx",
  sheets: [
    {
      name: "Sheet1",
      data: [["Name", "Age"], ["John", 30]],
    },
  ],
});
```

## Multi-Agent System

### Registering Agents

```typescript
import { registerAgent, delegateTask } from "openoxygen/multi-agent";

// Register a worker agent
const agent = registerAgent({
  name: "terminal-worker",
  type: "worker",
  capabilities: ["terminal"],
  status: "idle",
  metadata: {
    version: "1.0.0",
    platform: "win32",
    maxConcurrentTasks: 1,
  },
});

console.log(`Agent registered: ${agent.id}`);
```

### Delegating Tasks

```typescript
// Delegate task to best matching agent
const assignment = delegateTask("run npm install", ["terminal"]);

// Wait for completion
const result = await waitForTask(assignment.id);
console.log(result);
```

### Agent Communication

```typescript
import { sendMessage, onMessage } from "openoxygen/multi-agent/communication";

// Listen for messages
onMessage(agent.id, (message) => {
  console.log(`Received: ${message.type} from ${message.from}`);
});

// Send message
sendMessage(agent.id, "coordinator", "task", { instruction: "process data" });
```

## HTN Planner

### Creating a Domain

```typescript
import { HTNDomainBuilder } from "openoxygen/planning/htn";

const builder = new HTNDomainBuilder("file-operations");

// Add primitive task
builder.addPrimitiveTask(
  "read-file",
  "read",
  async (params) => {
    // Implementation
    return { success: true, data: content };
  },
  {
    preconditions: [
      { type: "exists", field: "filePath" },
    ],
  }
);

// Add compound task with methods
builder.addCompoundTask(
  "process-file",
  [
    {
      id: "method1",
      name: "Read and Process",
      subtasks: [
        { id: "read", name: "read-file", type: "primitive" },
        { id: "process", name: "process-data", type: "primitive" },
      ],
    },
  ]
);

const domain = builder.build();
```

### Planning and Execution

```typescript
import { HTNPlanner } from "openoxygen/planning/htn";

const planner = new HTNPlanner(domain);

// Generate plan
const result = await planner.plan("process-file");

if (result.success) {
  console.log(`Plan created with ${result.plan?.tasks.length} steps`);
  
  // Execute plan
  const execution = await planner.executePlan(result.plan!, {
    executeStep: async (step) => {
      // Step execution logic
      return { success: true };
    },
  });
}
```

## Security

### Command Validation

```typescript
import { validateCommand } from "openoxygen/security/hardening";

const result = validateCommand("rm -rf /");
if (!result.safe) {
  console.error(`Blocked: ${result.reason}`);
}
```

### Prompt Injection Detection

```typescript
import { detectPromptInjection } from "openoxygen/security/hardening";

const check = detectPromptInjection(userInput);
if (check.detected) {
  console.warn(`Injection detected: ${check.patterns.join(", ")}`);
  console.log(`Sanitized: ${check.sanitized}`);
}
```

### Rate Limiting

```typescript
import { RateLimiter } from "openoxygen/security/hardening";

const limiter = new RateLimiter(60000, 100); // 100 requests per minute

if (!limiter.isAllowed(clientId)) {
  return { error: "Rate limit exceeded" };
}
```

## Configuration

### Loading Configuration

```typescript
import { loadConfig, loadDotEnv } from "openoxygen/core/config";

// Load .env file
await loadDotEnv();

// Load configuration
const config = await loadConfig();
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENOXYGEN_CONFIG_PATH` | Path to configuration file |
| `OPENOXYGEN_STATE_DIR` | State directory path |
| `OPENOXYGEN_GATEWAY_HOST` | Gateway host |
| `OPENOXYGEN_GATEWAY_PORT` | Gateway port |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |

## Error Handling

All APIs return standardized results:

```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}
```

Example error handling:

```typescript
const result = await someOperation();

if (!result.success) {
  console.error(`Operation failed: ${result.error}`);
  // Handle error
} else {
  console.log(`Success: ${result.data}`);
}
```

## TypeScript Support

OpenOxygen is fully typed. Import types from:

```typescript
import type {
  OxygenConfig,
  ToolResult,
  Agent,
  HTNPlan,
  // ... other types
} from "openoxygen/types";
```

## Examples

See the `examples/` directory for complete working examples:

- `examples/basic-usage.ts` - Basic framework usage
- `examples/browser-automation.ts` - Browser automation
- `examples/multi-agent.ts` - Multi-agent coordination
- `examples/custom-skill.ts` - Creating custom skills

## Support

For issues and feature requests, please visit:
https://github.com/StarsailsClover/OpenOxygen/issues
