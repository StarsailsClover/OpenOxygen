# OpenOxygen API Documentation

## Core APIs

### Gateway

```typescript
import { gateway } from "./core/gateway";

// Start gateway
gateway.start({ port: 3000 });

// Stop gateway
gateway.stop();
```

### Runtime

```typescript
import { runtime } from "./core/runtime";

// Initialize runtime
await runtime.initialize();

// Execute task
const result = await runtime.execute(task);

// Shutdown
await runtime.shutdown();
```

### Config

```typescript
import { config } from "./core/config";

// Load config
const cfg = config.load("config.json");

// Get value
const value = config.get("key");

// Set value
config.set("key", value);
```

## Execution APIs

### Terminal

```typescript
import { executeCommand } from "./execution/terminal";

const result = await executeCommand("ls -la", {
  cwd: "/path/to/dir",
  timeout: 30000
});
```

### Browser

```typescript
import { oxygenBrowser } from "./browser";

// Initialize
await oxygenBrowser.initialize();

// Create tab
await oxygenBrowser.createTab("https://example.com");

// Navigate
await oxygenBrowser.navigate("https://example.com");

// Execute JS
const result = await oxygenBrowser.executeJavaScript("document.title");

// Close
await oxygenBrowser.close();
```

### Sandbox

```typescript
import { executeSandboxed } from "./execution/sandbox";

const result = await executeSandboxed("return 1 + 1", {
  timeoutMs: 30000,
  maxMemoryMB: 256
});
```

## Inference APIs

### Engine

```typescript
import { inferenceEngine } from "./inference/engine";

// Initialize
await inferenceEngine.initialize({
  model: "gpt-4",
  temperature: 0.7
});

// Run inference
const result = await inferenceEngine.run({
  messages: [{ role: "user", content: "Hello" }]
});
```

### Router

```typescript
import { aiCluster } from "./core/ai-cluster";

// Register model
aiCluster.registerNode({
  id: "gpt-4",
  name: "GPT-4",
  provider: "openai",
  capabilities: [{ type: "text", score: 0.95 }]
});

// Route request
const decision = aiCluster.routeRequest(request);

// Execute with fusion
const result = await aiCluster.executeWithFusion(request, "adaptive");
```

### Reflection

```typescript
import { reflectionEngine } from "./inference/reflection";

// Analyze execution
const reflection = reflectionEngine.reflect({
  executionId: "exec-1",
  outcome: "success",
  metrics: { totalSteps: 10, totalDurationMs: 5000 }
});

// Get insights
console.log(reflection.insights);
console.log(reflection.recommendations);
```

## Security APIs

### Permissions

```typescript
import { checkPermission, grantTemporaryPermission } from "./security/permissions";

// Check permission
const result = checkPermission({
  action: "read",
  resource: "file"
}, "standard");

// Grant temporary permission
const grant = grantTemporaryPermission({
  action: "write",
  resource: "file"
}, 60000);
```

### Audit

```typescript
import { auditLog } from "./security/audit";

// Log event
auditLog.record({
  action: "file.read",
  resource: "/path/to/file",
  user: "user-1",
  result: "success"
});

// Query logs
const logs = auditLog.query({
  startTime: Date.now() - 86400000,
  action: "file.read"
});
```

## Memory APIs

### Vector Store

```typescript
import { vectorStore } from "./memory/vector";

// Store embedding
await vectorStore.store("id-1", embedding, { text: "content" });

// Search similar
const results = await vectorStore.search(queryEmbedding, 10);
```

### Lifecycle

```typescript
import { memoryLifecycle } from "./memory/lifecycle";

// Store short-term
memoryLifecycle.storeShortTerm("key", value);

// Store long-term
await memoryLifecycle.storeLongTerm("key", value);

// Retrieve
const value = await memoryLifecycle.retrieve("key");
```

## Multimodal APIs

```typescript
import { multimodalRouter } from "./multimodal";

// Route input
const output = await multimodalRouter.route({
  type: "audio",
  data: audioBuffer
});

// Process through pipeline
const result = await preprocessingPipeline.process({
  type: "vision",
  data: imageBuffer
});
```

## Agent APIs

### Orchestrator

```typescript
import { agentOrchestrator } from "./agent/orchestrator";

// Create agent
const agent = await agentOrchestrator.createAgent({
  name: "My Agent",
  skills: ["browser", "office"]
});

// Execute task
const result = await agentOrchestrator.execute(agent.id, task);

// Communicate
await agentOrchestrator.sendMessage(agent.id, "Hello");
```

### Communication

```typescript
import { agentCommunication } from "./agent/communication";

// Send message
await agentCommunication.send({
  from: "agent-1",
  to: "agent-2",
  content: "Hello"
});

// Subscribe to messages
agentCommunication.subscribe("agent-1", (message) => {
  console.log("Received:", message);
});
```

## Plugin APIs

```typescript
import { pluginLoader } from "./plugins/loader";

// Load plugin
const plugin = await pluginLoader.load("/path/to/plugin");

// Register hooks
plugin.registerHook("beforeExecute", (context) => {
  console.log("Before execute:", context);
});

// Unload plugin
await pluginLoader.unload(plugin.id);
```

## Utility APIs

### Logging

```typescript
import { createSubsystemLogger } from "./logging";

const log = createSubsystemLogger("my-module");

log.info("Info message");
log.warn("Warning message");
log.error("Error message");
log.debug("Debug message");
```

### Utils

```typescript
import { generateId, withTimeout, retry } from "./utils";

// Generate ID
const id = generateId("prefix");

// With timeout
const result = await withTimeout(promise, 5000);

// Retry
const result = await retry(async () => {
  return await fetchData();
}, { maxRetries: 3 });
```

## Error Codes

| Code | Description |
|------|-------------|
| 1001 | Gateway not ready |
| 2001 | Inference no engine |
| 3001 | Execution permission denied |
| 4001 | Vision capture failed |
| 5001 | Storage DB error |
| 6001 | Plugin load failed |
| 7001 | Task not found |
| 9001 | Internal error |

## WebSocket API

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "subscribe",
    channel: "events"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};
```

## REST API

### Authentication

```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-api-key"}'
```

### Execute Task

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "browser.navigate",
    "params": ["https://example.com"]
  }'
```

### Get Status

```bash
curl http://localhost:3000/api/status \
  -H "Authorization: Bearer $TOKEN"
```
