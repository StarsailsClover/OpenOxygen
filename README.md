# OpenOxygen

<div align="center">

**Windows-Native AI Agent Framework**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.94-orange)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green)](https://nodejs.org/)

*Kernel-level system control · Fused inference planning · OpenClaw compatible*

[**中文文档 →**](docs/README_CN.md)

</div>

---

## What is OpenOxygen?

OpenOxygen is a **from-scratch** AI Agent deployment framework built for Windows. It pairs a **Rust native core** (Win32 API, SIMD vector search, image processing) with a **TypeScript application layer** (inference engine, task planner, plugin system) to give LLMs real control over the operating system — safely.

It is **interface-compatible** with [OpenClaw](https://github.com/openclaw/openclaw), so existing skills, plugins and LLM configurations migrate with zero code changes.

### Key numbers

| Metric | Value |
|--------|-------|
| Screen capture (2048 × 1152) | **103 ms** (Win32 BitBlt) |
| Vector search (1 000 docs) | **< 1 ms** (SIMD) |
| Inference round-trip | **~120 ms** (Gateway → LLM → Response) |
| Integration tests | **42 / 42 passing** |
| Native binary size | **6.16 MB** (release + LTO) |

---

## Architecture

```
Gateway (:4800)
    │
    ├── Inference Engine ─── Multi-Model Router
    │       │                  (OpenAI / Anthropic / Gemini / Ollama / StepFun)
    │       ├── Task Planner
    │       └── Reflection Engine
    │
    ├── Execution Layer
    │       ├── Windows Control  ← Rust (Win32 API)
    │       ├── Vision Pipeline  ← Rust (image crate)
    │       └── Sandbox          ← Rust (process isolation)
    │
    ├── Memory System
    │       ├── Vector Store     ← Rust (SIMD cosine)
    │       └── BM25 + Lifecycle
    │
    └── Security
            ├── Audit Trail
            └── Permission System (minimal / standard / elevated)
```

---

## Quick Start

### Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Windows | 10 / 11 x64 | ✅ |
| Node.js | ≥ 22 | ✅ |
| Rust | ≥ 1.82 | for building native module |
| Ollama | any | for local LLM |

### Install & Run

```bash
git clone https://github.com/ND-SailsIsHere/OpenOxygen.git
cd OpenOxygen

npm install                    # JS dependencies
npm run build:native           # compile Rust → .node
npm run build:ts               # compile TypeScript → dist/

# configure (edit models, gateway port, etc.)
cp .env.example .env

# start
npm start
```

The gateway is now listening on **http://127.0.0.1:4800**.

### Verify

```bash
curl http://127.0.0.1:4800/health
# → {"status":"ok","version":"0.1.0"}
```

---

## Using a Local LLM

```bash
# 1  Install Ollama  →  https://ollama.com
# 2  Pull a model
ollama pull qwen3:4b

# 3  openoxygen.json already points to localhost:11434 — just start
npm start
```

No code changes needed; the inference engine auto-detects Ollama's OpenAI-compatible endpoint.

---

## API

All endpoints return JSON. Auth is controlled by `gateway.auth` in `openoxygen.json`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/status` | System status (agents, models, uptime) |
| `GET` | `/api/v1/agents` | List configured agents |
| `GET` | `/api/v1/models` | List configured models |
| `POST` | `/api/v1/chat` | Chat completion (single or multi-turn) |
| `POST` | `/api/v1/plan` | Generate an execution plan for a goal |

### Chat example

```bash
curl -X POST http://127.0.0.1:4800/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","mode":"fast"}'
```

```json
{
  "id": "req-abc123",
  "content": "Hello! I'm running on OpenOxygen...",
  "model": "qwen3:4b",
  "provider": "ollama",
  "mode": "fast",
  "usage": { "promptTokens": 5, "completionTokens": 32, "totalTokens": 37 },
  "durationMs": 118
}
```

See [docs/API.md](docs/API.md) for the full reference.

---

## Project Structure

```
openoxygen/
├── src/                          # TypeScript source
│   ├── core/
│   │   ├── gateway/              # HTTP server
│   │   ├── config/               # Config loader + env overrides
│   │   ├── runtime/              # Process lifecycle
│   │   ├── routing/              # Message → Agent routing
│   │   └── sessions/             # Session management
│   ├── inference/
│   │   ├── engine/               # Provider adapters (OpenAI, Anthropic …)
│   │   ├── router/               # Model selection & key rotation
│   │   ├── planner/              # Goal → step decomposition
│   │   └── reflection/           # Post-execution self-evaluation
│   ├── execution/
│   │   ├── windows/              # TS fallback for system ops
│   │   ├── vision/               # OxygenUltraVision dual pipeline
│   │   └── sandbox/              # Code isolation
│   ├── memory/
│   │   ├── vector/               # In-memory vector store + BM25
│   │   └── lifecycle/            # Indexing, chunking, TTL
│   ├── security/
│   │   ├── audit/                # Append-only audit log
│   │   └── permissions/          # Operation → privilege check
│   ├── compat/openclaw/          # OpenClaw config & plugin adapter
│   ├── plugins/
│   │   ├── loader/               # Discovery, validation, lifecycle
│   │   └── sdk/                  # Public SDK for plugin authors
│   ├── types/                    # Shared type definitions
│   ├── utils/                    # Helpers (ID gen, timing, events)
│   ├── logging/                  # Structured subsystem logger
│   ├── native-bridge.ts          # Rust ↔ TS binding layer
│   ├── entry.ts                  # CLI entry point
│   └── index.ts                  # Public API re-exports
│
├── packages/core-native/         # Rust native module (NAPI-RS)
│   ├── src/
│   │   ├── windows/              # capture, input, window, process,
│   │   │                         #   clipboard, registry
│   │   ├── memory/               # SIMD cosine similarity & search
│   │   ├── vision/               # crop, resize, edge detect, diff
│   │   ├── sandbox/              # Process-level isolation
│   │   └── lib.rs                # NAPI entry + system info
│   ├── Cargo.toml
│   └── build.rs
│
├── test/                         # Integration tests
│   └── e2e.mjs                   # 42-case end-to-end suite
├── tools/
│   └── mock-llm.mjs             # Local OpenAI-compat mock server
├── docs/                         # Extended documentation
│   └── API.md
│
├── openoxygen.json               # Default configuration
├── .env.example                  # Environment variable template
├── package.json
├── tsconfig.json
└── openoxygen.mjs                # CLI launcher
```

---

## OpenClaw Compatibility

Add this to `openoxygen.json`:

```json
{
  "compat": {
    "openclaw": {
      "enabled": true,
      "configPath": "~/.openclaw/openclaw.json"
    }
  }
}
```

OpenOxygen will automatically translate the OpenClaw config, load its skills and adapt its plugin protocol.

---

## Plugin SDK

```typescript
import { definePlugin } from "openoxygen/plugin-sdk";

export default definePlugin()
  .setManifest({ name: "my-plugin", version: "1.0.0", entryPoint: "index.js" })
  .addTool({
    name: "greet",
    description: "Say hello",
    parameters: { type: "object", properties: { name: { type: "string" } } },
    execute: async (params) => ({
      success: true,
      output: `Hello, ${params.name}!`,
      durationMs: 1,
    }),
  })
  .build();
```

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| **Privilege levels** | `minimal` → read-only; `standard` → write + input; `elevated` → process / registry |
| **Path allowlist** | File ops restricted to configured directories |
| **Executable blocklist** | Dangerous binaries (`format`, `diskpart`, `bcdedit` …) blocked |
| **Audit trail** | Every system op logged to `audit.jsonl` with rollback flag |
| **Sandbox** | Untrusted code runs in isolated child processes with timeout |

---

## Roadmap

- [x] Rust native core (Win32, SIMD, image, sandbox)
- [x] Multi-provider inference engine
- [x] Task planner + reflection loop
- [x] OpenClaw compatibility layer
- [x] 42/42 integration tests
- [ ] WebSocket streaming
- [ ] Plugin marketplace
- [ ] GUI dashboard
- [ ] macOS / Linux support

---

## Contributing

1. Fork → branch → commit → PR.
2. Run `npm test` before submitting.
3. Rust changes: `cargo build --release` in `packages/core-native`.

---

## License

[MIT](LICENSE) © 2026 ND-SailsIsHere
