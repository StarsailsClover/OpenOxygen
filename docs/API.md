# API Reference

## Base URL

```
http://127.0.0.1:4800
```

Port is configurable via `gateway.port` in `openoxygen.json` or `OPENOXYGEN_GATEWAY_PORT` env var.

## Authentication

Controlled by `gateway.auth` in config:

| Mode | Header |
|------|--------|
| `none` | No header required |
| `token` | `Authorization: Bearer <token>` |
| `password` | `Authorization: Basic <base64(user:password)>` |

The `/health` endpoint is always unauthenticated.

---

## Endpoints

### `GET /health`

Health check. Always returns 200 if the server is running.

**Response**
```json
{
  "status": "ok",
  "timestamp": 1772986064033,
  "version": "0.1.0"
}
```

---

### `GET /api/v1/status`

Full system status.

**Response**
```json
{
  "gateway": { "host": "127.0.0.1", "port": 4800 },
  "agents": [{ "id": "default", "name": "OpenOxygen Default Agent" }],
  "channels": [],
  "plugins": [],
  "models": [{ "provider": "ollama", "model": "qwen3:4b", "hasKey": true }],
  "inferenceReady": true,
  "uptime": 247.99
}
```

---

### `GET /api/v1/agents`

List configured agents.

**Response**
```json
{
  "agents": [
    { "id": "default", "name": "OpenOxygen Default Agent" }
  ]
}
```

---

### `GET /api/v1/models`

List configured models (API keys are never exposed).

**Response**
```json
{
  "models": [
    { "provider": "ollama", "model": "qwen3:4b", "hasKey": true }
  ]
}
```

---

### `POST /api/v1/chat`

Send a message to the inference engine.

**Request body** — either `message` (string) or `messages` (array):

```json
{
  "message": "Hello, what can you do?",
  "mode": "fast",
  "systemPrompt": "You are a helpful assistant."
}
```

Or multi-turn:

```json
{
  "messages": [
    { "role": "system", "content": "You are a Windows expert." },
    { "role": "user", "content": "List running processes." }
  ],
  "mode": "deep"
}
```

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | one of `message` / `messages` | Single user message |
| `messages` | array | one of `message` / `messages` | Full conversation history |
| `mode` | string | no | `fast` / `balanced` / `deep` (auto-detected if omitted) |
| `systemPrompt` | string | no | Prepended system message |

**Response**
```json
{
  "id": "req-568ceda7-c2bb-4e4f-9a33-41facff38c1d",
  "content": "Hello! I'm running on OpenOxygen...",
  "toolCalls": null,
  "model": "qwen3:4b",
  "provider": "ollama",
  "mode": "fast",
  "usage": {
    "promptTokens": 11,
    "completionTokens": 64,
    "totalTokens": 75
  },
  "durationMs": 121
}
```

**Error responses**

| Status | Condition |
|--------|-----------|
| 400 | Missing `message` and `messages` |
| 503 | No inference engine available (no models configured) |

---

### `POST /api/v1/plan`

Generate an execution plan for a goal.

**Request body**

```json
{
  "goal": "Organize desktop files into categorized folders",
  "context": "Windows 11, ~30 files on desktop"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `goal` | string | yes | What to accomplish |
| `context` | string | no | Additional context for the planner |

**Response**
```json
{
  "id": "plan-13036f10-e938-47e5-a733-4dfaa7cc83f1",
  "goal": "Organize desktop files into categorized folders",
  "steps": [
    {
      "id": "step-abc",
      "action": "file.list",
      "params": { "path": "C:\\Users\\User\\Desktop" },
      "dependencies": [],
      "status": "pending"
    }
  ],
  "createdAt": 1772986138782,
  "updatedAt": 1772986138782,
  "status": "executing",
  "reflections": []
}
```

---

## Inference Modes

| Mode | Timeout | Use case |
|------|---------|----------|
| `fast` | 30 s | Simple questions, quick lookups |
| `balanced` | 60 s | General tasks, explanations |
| `deep` | 120 s | Complex analysis, multi-step planning |

When `mode` is omitted the engine auto-detects complexity from the input message.

---

## Error Format

All errors follow the same shape:

```json
{
  "error": "Human-readable description"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (missing fields, invalid JSON) |
| 401 | Unauthorized (bad or missing auth header) |
| 404 | Unknown route |
| 500 | Internal server error |
| 503 | Service unavailable (inference engine not ready) |
