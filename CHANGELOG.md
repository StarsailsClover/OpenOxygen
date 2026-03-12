# Changelog

## 26w11aB (2026-03-13)

### New Features

- **Advanced Input System** — 3-layer architecture replacing `windows/input.rs`
  - **SendInput** (user-mode): standard keyboard/mouse, full backward compat
  - **Smooth Input**: Bézier/ease/linear curve interpolation for human-like mouse movement; `mouseMoveSmooth()`, `mouseClickSmooth()`, `replayInputSequence()`
  - **Virtual Driver**: `sendMessageToWindow()` WM_KEYDOWN/WM_CHAR/WM_SETTEXT direct injection; `clickInWindow()` per-window mouse messages
  - **Privilege System**: `isElevated()`, `getPrivilegeInfo()`, `requestElevation()` (UAC ShellExecuteW runas), `allowSetForeground()` UIPI bypass
  - **DPI Awareness**: `getScreenMetrics()`, `logicalToPhysical()`, `physicalToLogical()`

- **OxygenUltraVision v2** — 3-layer fusion architecture
  - Layer 1: **UI Automation** (Rust, Win32 IUIAutomation COM) — 86 elements in <50ms, 100% accurate for standard controls
  - Layer 2: **Image Processing** (Rust) — Otsu adaptive Sobel, connected component analysis with auto-classification, NCC template matching + NMS
  - Layer 3: **LLM Understanding** (TypeScript) — sends UIA element tree + instruction to inference engine for semantic screen comprehension
  - Three layers fuse into unified `ScreenAnalysis` with deduplication

- **Security Hardening** — defenses against all known OpenClaw CVEs
  - [CVE-2026-25253] Gateway URL injection → query string stripping, binding validation
  - [ClawJacked] WebSocket hijack → Origin whitelist, rate limiter with auth-failure auto-block, timing-safe token comparison
  - [CVE-2026-24763/25157] Command injection → shell metachar filter, command blacklist, env var sanitization
  - [CVE-2026-25593] Log poisoning → 3-level prompt injection detection, high-risk request blocking
  - [CNCERT Advisory] Plugin supply chain → SHA-256 integrity, permission audit
  - [CNCERT Advisory] Credential exposure → AES-256-GCM runtime encryption, API key masking
  - Request body 1MB limit, security headers (CSP, X-Frame-Options, nosniff), no wildcard CORS

- **Chinese Documentation** — full `docs/README_CN.md` with architecture, API, quick start

### Improvements

- Native binary: 6.27MB (release + LTO), up from 6.16MB due to UI Automation + Shell features
- Screen capture: 85ms (down from 103ms)
- 130 total tests passing (42 e2e + 47 security + 41 llm-integration)
- `native-bridge.ts` v2 covers all new input/vision/privilege APIs

### Architecture

```
Rust native (6.27MB)
├── input/           ← NEW: 3-layer input (SendInput + smooth + virtual driver)
│   ├── mod.rs       ← privilege, DPI, smooth move, replay
│   └── driver.rs    ← PostMessage injection, UIPI bypass
├── vision/
│   ├── mod.rs       ← Sobel, connected components, template match
│   └── ui_automation.rs  ← NEW: Win32 IUIAutomation COM
├── windows/         ← capture, clipboard, process, registry, window
├── memory/          ← SIMD cosine similarity, vector search
└── sandbox/         ← process isolation

TypeScript (26 files)
├── core/            ← gateway (hardened), config, runtime, routing, sessions
├── inference/       ← engine, router, planner, reflection
├── execution/
│   ├── vision/      ← OxygenUltraVision v2 (3-layer fusion)
│   ├── windows/     ← TS fallback
│   └── sandbox/
├── memory/          ← vector store, lifecycle
├── security/
│   ├── hardening.ts ← NEW: CVE defenses, rate limiter, prompt injection
│   ├── audit/
│   └── permissions/
├── compat/openclaw/ ← config translation, skill validation
└── plugins/         ← loader, SDK
```

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
