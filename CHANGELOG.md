# Changelog

All notable changes to OpenOxygen are documented here.

---

## 26w11aE (2026-03-14) — Release

**9-phase development cycle complete.**

### Phase 1: Security Foundation
- Dependency security manager with CVE pattern matching
- Temporary file security (0600 permissions, AES-256-GCM encryption, 3-pass secure delete)
- Windows privilege isolation (low-priv user, process isolation)
- Async compute stack (ThreadPool, GPU dispatcher, batch execution)
- AI thinking cluster (ThoughtRouter, ConsensusEngine, ReflectionLoop)
- "Beyond OpenClaw" architecture declaration

### Phase 2: Multi-Model Runtime
- 3-model Ollama configuration (qwen3:4b, qwen3-vl:4b, gpt-oss:20b)
- Dynamic model router with complexity-based selection
- Pool-integrated router with direct Ollama API

### Phase 3: Vision-Language Fusion
- OxygenUltraVision v2: 3-layer fusion (UIA + CV + VLM)
- Native VisionTokenizer (Rust JPEG compression + base64)
- Vision-Language fusion pipeline
- Input safety guard (anti-lock, auto-release, emergency stop)
- E2E verified: "打开Chrome并访问bilibili"

### Phase 4: Input System Hardening
- HMAC-SHA256 signed input sequences with nonce anti-replay
- Human-likeness scoring (timing + movement + pattern analysis)
- Multi-monitor DPI awareness with coordinate conversion
- 12/12 tests passing

### Phase 5: Persistent Storage
- SQLite persistence (WAL mode, sessions, audit, vector metadata, model stats, KV store)
- Int8 vector quantization (7.1x compression, <0.02 max error)
- LRU cache with configurable eviction
- 1000 chunks inserted in 83ms, 7829 writes/sec

### Phase 6: Distributed Gateway
- ClusterManager with multi-node process management
- LoadBalancer (round-robin, least-connections, sticky sessions)
- Prometheus-compatible metrics endpoint
- 130 RPS concurrent handling, SQLite shared state

### Phase 7: Plugin Marketplace
- Ed25519 plugin signing and verification
- OpenClaw skills import (9/10 imported from 2420 available)
- Plugin repository with install/uninstall/search/verify
- Permission audit (safe/warning/blocked classification)

### Phase 8: Web Dashboard
- Zero-dependency single HTML file (13.7KB)
- Gateway-hosted at / and /dashboard
- 8 pages: Overview, Chat, Models, Agents, Security, Plugins, Logs, Settings
- Auto-refresh, XSS prevention, dark theme

### Real LLM Integration
- qwen3:4b tested: Chinese greeting (23.5s), English query (3.2s), multi-turn (16.7s)
- Qwen3 thinking mode compatibility fix (reasoning field extraction)
- Agent task: Chrome → bilibili → search → video playback (39.8s)

### Statistics
- 44 TypeScript files, 17 Rust files, 11 test suites
- Native binary: 8.2MB (release + LTO)
- 130+ tests passing across all phases

---

## 26w11aE_Phase 4 (2026-03-14)

### Phase 4: Input System Hardening
- **Signed Input Sequences** (`src/input/signed.ts`)
  - HMAC-SHA256 signatures on all input action chains
  - Nonce-based anti-replay with automatic registry cleanup
  - Time-window expiry validation
  - Tamper detection (any modification invalidates signature)
  - Full execution audit logging
- **Human-Likeness Scoring** (`src/input/score.ts`)
  - Timing analysis: variance coefficient, micro-pauses, interval distribution
  - Movement analysis: path smoothness, acceleration/deceleration, overshoot detection
  - Pattern analysis: repetitiveness, hesitation, click precision
  - Robot input correctly scored 33/100; human input scored 81/100
  - Auto-generated improvement suggestions
- **Multi-Monitor DPI** (`src/input/dpi.ts`)
  - Monitor enumeration with per-monitor DPI detection
  - Logical ↔ Physical coordinate conversion
  - Screen bounds validation
  - Global bounds calculation across all monitors
- **Tests**: 12/12 passing

### Phase 3: Vision-Language Fusion
- **OxygenUltraVision v2** — 3-layer fusion architecture
  - Layer 1: UI Automation (Win32 IUIAutomation COM) — 253 elements detected
  - Layer 2: Image Processing (Rust Sobel + connected components)
  - Layer 3: Vision LLM integration (qwen3-vl:4b)
- **Vision-Language Fusion Pipeline** (`src/execution/vision/fusion.ts`)
  - Screenshot → compression → base64 → multimodal prompt
  - UIA element tree serialization
  - Visual grounding (instruction → element → coordinates)
  - Action inference (click/type/scroll)
- **Native VisionTokenizer** (`packages/core-native/src/vision/tokenizer.rs`)
  - JPEG compression with configurable quality
  - Base64 encoding for LLM input
- **Input Safety Guard** (`src/input/safety.ts`)
  - Max 10 consecutive operations, 100ms minimum interval
  - 5-second auto-release timeout
  - Emergency stop function
  - SIGINT handler for cleanup
- **E2E Agent Test**: "打开Chrome并访问bilibili" — verified end-to-end

### Phase 2: Multi-Model Runtime
- **Model Configuration**: 3 Ollama models (qwen3:4b, qwen3-vl:4b, gpt-oss:20b)
- **Dynamic Model Router** (`src/inference/router/dynamic.ts`)
  - Task-type detection (vision/planning/file-ops/quick-answer)
  - Complexity-based model selection
  - Latency estimation and confidence scoring
- **Pool-Integrated Router** (`src/inference/router-pool.ts`)
  - Direct Ollama API integration
  - Fallback chain support

### Phase 1: Security Foundation
- **Dependency Security** (`src/security/deps.ts`)
  - CVE pattern matching, blocked package list
  - Plugin dependency whitelist
  - Integrity verification (SHA-256)
- **Temporary File Security** (`src/security/tempfs.ts`)
  - 0600 permissions, auto-cleanup, secure deletion (3-pass overwrite)
  - AES-256-GCM encryption for sensitive temp files
- **Windows Privilege Isolation** (`src/security/privilege.ts`)
  - Privilege level detection (system/admin/user/restricted)
  - Low-privilege user sandbox
  - Process isolation with resource limits
- **Async Compute Stack** (`src/core/async/index.ts`)
  - ThreadPool with priority scheduling
  - GPU task dispatcher
  - Batch concurrent execution
- **AI Thinking Cluster** (`src/core/ai-cluster/index.ts`)
  - ThoughtRouter: task decomposition and model routing
  - ConsensusEngine: majority/weighted/best/merge voting
  - ReflectionLoop: iterative self-improvement
- **Architecture Declaration**: "Beyond OpenClaw" manifesto

---

## 26w11aD (2026-03-14)

- Comprehensive benchmark suite with P50/P95/P99 statistics
- Multi-model configuration (3 Ollama models)
- Performance optimizations (UI Automation caching)
- Rust inference client (reqwest + tokio)

---

## 26w11aB (2026-03-13)

- Advanced Input System (3-layer: SendInput + smooth + virtual driver)
- OxygenUltraVision v2 (UIA + image processing + LLM)
- Security hardening against all known OpenClaw CVEs
- Chinese documentation

---

## 26w11aA (2026-03-08)

### Initial Release
- Rust + TypeScript hybrid architecture
- Win32 API bindings (screen capture, keyboard/mouse, window, process, clipboard, registry)
- Multi-provider inference engine (OpenAI, Anthropic, Gemini, OpenRouter, Ollama, StepFun)
- Task planner with ReAct-style reflection loop
- Memory system (vector store + BM25 hybrid search)
- Security (audit trail, permission system)
- OpenClaw compatibility layer
- Plugin SDK
- HTTP gateway with REST API
- 42/42 integration tests
