# OpenOxygen

<div align="center">

**The Next-Generation Windows-Native AI Agent Framework**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.94-orange)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-130%2B%20passing-brightgreen)]()
[![Version](https://img.shields.io/badge/Version-26w15aC-blue)]()

*Beyond OpenClaw · Kernel-Level Control · Multi-Model Fusion · Zero-Trust Security*

[**安装指南 →**](docs/install/INSTALL.md) · [**快速开始 →**](docs/QUICKSTART.md) · [**路线图 →**](ROADMAP_UNIFIED.md) · [API Reference](docs/API.md) · [Changelog](CHANGELOG.md)

</div>

---

## Why OpenOxygen?

OpenOxygen is not a fork or wrapper — it is a **from-scratch** AI Agent framework that **surpasses** OpenClaw in every dimension:

| | OpenClaw | OpenOxygen |
|---|---------|------------|
| **Core** | Python interpreter | Rust native + SIMD |
| **Speed** | ~500ms inference | **21ms** inference |
| **Vision** | Basic screenshot | 3-layer fusion (UIA + CV + VLM) |
| **Input** | SendKeys | Signed sequences + human-likeness scoring |
| **Security** | Basic auth | Zero-trust + CVE hardened + audit trail |
| **Models** | Single model | Multi-model cluster with consensus |
| **Scale** | Single machine | Distributed gateway (planned) |

We maintain **interface compatibility** with OpenClaw for migration, but our architecture is entirely independent.

### Performance

| Metric | Value | Method |
|--------|-------|--------|
| Inference round-trip | **21 ms** | Gateway → Engine → LLM |
| Screen capture | **85 ms** | Win32 BitBlt (2048×1152) |
| UI element detection | **253 elements** | Win32 UI Automation |
| Vector search (1000×128d) | **14 ms** | SIMD cosine similarity |
| Human-likeness score | **81/100** | Timing + movement + pattern |
| Security tests | **47/47** | CVE + injection + replay |
| Total tests | **130+** | E2E + security + P1-P4 |

---

## Architecture

```
                        ┌──────────────────────┐
                        │   Gateway (:4800)     │
                        │   Hardened HTTP/WS    │
                        └──────────┬───────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
┌─────────▼──────────┐  ┌─────────▼──────────┐  ┌─────────▼──────────┐
│  Inference Engine   │  │  Execution Layer   │  │   Memory System    │
├────────────────────┤  ├────────────────────┤  ├────────────────────┤
│ • Multi-Model Pool │  │ • Windows Control  │  │ • Vector Store     │
│ • Dynamic Router   │  │ • OUV v2 Vision    │  │ • BM25 Hybrid      │
│ • AI Think Cluster │  │ • Signed Input     │  │ • Lifecycle Mgr    │
│ • Reflection Loop  │  │ • DPI Awareness    │  │                    │
└────────┬───────────┘  └──────────┬─────────┘  └────────────────────┘
         │                         │
         └─────────────┬───────────┘
                       │
           ┌───────────▼───────────┐
           │   Rust Native Core    │
           │   8.2 MB · NAPI-RS    │
           ├───────────────────────┤
           │ • Win32 API (BitBlt,  │
           │   SendInput, UIA)     │
           │ • SIMD Vector Ops     │
           │ • Image Processing    │
           │ • Vision Tokenizer    │
           │ • HTTP Client (reqwest│
           │   + tokio)            │
           └───────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Windows 10/11** (x64)
- **Node.js 22+**
- **Rust 1.82+** (for native module)
- **(Optional) Ollama** for local LLM

### Install

```bash
git clone https://github.com/StarsailsClover/OpenOxygen.git
cd OpenOxygen
npm install
npm run build:native    # Rust → .node
npm run build:ts        # TypeScript → dist/
cp .env.example .env
npm start
```

### Verify

```bash
curl http://127.0.0.1:4800/health
# {"status":"ok","version":"0.1.0"}

curl -X POST http://127.0.0.1:4800/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","mode":"fast"}'
```

---

## Local LLM (Ollama)

```bash
ollama pull qwen3:4b        # 2.5GB — fast queries
ollama pull qwen3-vl:4b     # 3.3GB — vision tasks
ollama pull gpt-oss:20b     # 13GB  — deep reasoning
npm start
```

Models are auto-detected. The router selects the best model per task.

---

## Key Features

### OxygenUltraVision (3-Layer Vision)

| Layer | Technology | Speed | Accuracy |
|-------|-----------|-------|----------|
| 1. UI Automation | Win32 IUIAutomation COM | <50ms | 100% (standard controls) |
| 2. Image Processing | Rust Sobel + connected components | <200ms | ~80% |
| 3. Vision LLM | qwen3-vl:4b | ~500ms | ~85% |

### Signed Input Sequences

```typescript
const mgr = new SignedInputManager({ secretKey: "..." });
const seq = mgr.createSequence([
  { type: "move", params: { x: 400, y: 300 } },
  { type: "click", params: { x: 400, y: 300 } },
]);
// HMAC-SHA256 signed, nonce anti-replay, time-window expiry
await mgr.execute(seq, executor);
```

### AI Thinking Cluster

Multi-model consensus reasoning:
- **ThoughtRouter**: Routes sub-tasks to optimal models
- **ConsensusEngine**: Weighted voting across model outputs
- **ReflectionLoop**: Iterative self-improvement (max 3 rounds)

### Security

| Threat | Defense |
|--------|---------|
| CVE-2026-25253 (URL injection) | Query string stripping, bind validation |
| ClawJacked (WS hijack) | Origin whitelist, rate limiter, timing-safe auth |
| Command injection | Shell metachar filter, command blacklist |
| Prompt injection | 3-level detection, high-risk blocking |
| Supply chain | SHA-256 integrity, dependency audit |
| Credential leak | AES-256-GCM encryption, API key masking |
| Input replay | Nonce registry, HMAC signatures |
| Mouse lock | Safety guard, auto-release, emergency stop |

---

## Project Structure

```
openoxygen/
├── src/                          # TypeScript (40 files)
│   ├── core/
│   │   ├── gateway/              # Hardened HTTP server
│   │   ├── config/               # Config + env overrides
│   │   ├── runtime/              # Process lifecycle
│   │   ├── routing/              # Message → Agent routing
│   │   ├── sessions/             # Session management
│   │   ├── async/                # Thread pool + GPU dispatcher
│   │   └── ai-cluster/          # Multi-model consensus
│   ├── inference/
│   │   ├── engine/               # Provider adapters
│   │   ├── router/               # Model selection + key rotation
│   │   ├── planner/              # Goal → step decomposition
│   │   └── reflection/           # Post-execution evaluation
│   ├── execution/
│   │   └── vision/               # OUV v2 + fusion pipeline
│   ├── input/
│   │   ├── safety.ts             # Anti-lock safety guard
│   │   ├── signed.ts             # HMAC signed sequences
│   │   ├── score.ts              # Human-likeness scoring
│   │   └── dpi.ts                # Multi-monitor DPI
│   ├── memory/                   # Vector store + BM25 + lifecycle
│   ├── security/
│   │   ├── hardening.ts          # CVE defenses
│   │   ├── audit/                # Append-only audit log
│   │   ├── permissions/          # Privilege enforcement
│   │   ├── tempfs.ts             # Secure temp files
│   │   ├── privilege.ts          # Windows isolation
│   │   └── deps.ts               # Dependency audit
│   ├── compat/openclaw/          # Config + plugin adapter
│   ├── plugins/                  # Loader + SDK
│   └── types/                    # Shared type definitions
│
├── packages/core-native/         # Rust (17 files, 8.2MB binary)
│   └── src/
│       ├── input/                # SendInput + smooth + virtual driver
│       ├── vision/               # UIA + Sobel + tokenizer
│       ├── windows/              # Capture, clipboard, process, registry
│       ├── memory/               # SIMD vector search
│       ├── inference/            # reqwest HTTP client
│       └── sandbox/              # Process isolation
│
├── test/                         # 9 test suites
├── tools/                        # Mock LLM, utilities
├── docs/                         # API, CN docs, release notes
└── openoxygen.json               # Configuration
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/status` | System status |
| `GET` | `/api/v1/models` | List models |
| `POST` | `/api/v1/chat` | Chat inference |
| `POST` | `/api/v1/plan` | Task planning |

See [docs/API.md](docs/API.md) for full reference.

---

## Development

### Phase Status (26w11aE)

| Phase | Status | Key Deliverable |
|-------|--------|-----------------|
| P1: Security | ✅ | CVE hardening, AI cluster, async stack |
| P2: Multi-Model | ✅ | 3-model config, dynamic router |
| P3: Vision-Language | ✅ | OUV v2 fusion, tokenizer |
| P4: Input Hardening | ✅ | Signed sequences, human scoring |
| P5: Persistence | 🔄 | RocksDB vector store |
| P6: Distributed | ⏳ | Gateway cluster |
| P7: Marketplace | ⏳ | Plugin ecosystem |
| P8: GUI | ⏳ | Desktop dashboard |
| P9: Release | ⏳ | Production v26w11aE |

### Branch Strategy

- `main` — Stable releases only
- `dev` — Active development (P1-P8)
- `feature/*` — Individual features

---

## Contributing

1. Fork → branch → commit → PR
2. Run `npm test` before submitting
3. Rust changes: `cargo build --release` in `packages/core-native`

---

## License

[MIT](LICENSE) © 2026 ND-SailsIsHere
