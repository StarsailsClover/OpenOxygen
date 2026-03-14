# OpenOxygen 26w11aE Development Roadmap

## Overview

**26w11aE** — "E" for "Enterprise" — 9-phase development plan targeting production-ready AI Agent framework with comprehensive security hardening and multi-model support.

---

## Phase 1: Risk Mitigation & Security Foundation (Current)
**Duration**: 2-3 days
**Goal**: Address all risks from risks.md

### Tasks
- [ ] Dependency security manager (deps.ts) — ✅ WIP
- [ ] gRPC authentication interceptor
- [ ] Temporary file permission enforcement (0600)
- [ ] Windows privilege isolation (low-priv user)
- [ ] CLI argument validation layer
- [ ] Plugin sandbox namespace isolation
- [ ] Tool data flow isolation
- [ ] Plugin execution timeout & anomaly detection
- [ ] Cross-platform path normalization
- [ ] Empty result anomaly alerting

### Deliverables
- `src/security/deps.ts` — Dependency audit
- `src/security/tempfs.ts` — Temp file hardening
- `src/security/privilege.ts` — Windows privilege isolation
- `src/security/sandbox.ts` — Enhanced sandbox

---

## Phase 2: Multi-Model Runtime (26w11aE_P2)
**Duration**: 3-4 days
**Goal**: Run 3 downloaded models concurrently

### Tasks
- [ ] Model process pool management
- [ ] Dynamic GPU/CPU allocation
- [ ] Model warm-up & preloading
- [ ] A/B testing framework for model comparison
- [ ] Fallback chain (qwen3 → qwen3-vl → gpt-oss)

### Deliverables
- `src/inference/pool.ts` — Model process pool
- `src/inference/allocator.ts` — Resource allocator
- Benchmark: 3 models concurrent throughput

---

## Phase 3: Vision-Language Fusion (26w11aE_P3)
**Duration**: 4-5 days
**Goal**: Full OUV v2 integration with qwen3-vl

### Tasks
- [ ] Screenshot → vision tokens pipeline
- [ ] UI element description generation
- [ ] Visual grounding (point to element)
- [ ] Multi-frame context (temporal reasoning)
- [ ] On-device vision encoding (Rust)

### Deliverables
- `src/execution/vision/fusion.ts`
- Native vision encoding (ONNX Runtime)
- Demo: "Click the blue button next to the login field"

---

## Phase 4: Input System Hardening (26w11aE_P4)
**Duration**: 2-3 days
**Goal**: Production input automation

### Tasks
- [ ] Signed input sequence (anti-tamper)
- [ ] Replay attack prevention
- [ ] Human-likeness scoring
- [ ] Multi-monitor DPI awareness
- [ ] Accessibility API compliance

### Deliverables
- `src/input/signed.ts`
- `src/input/score.ts`

---

## Phase 5: Persistence & State (26w11aE_P5)
**Duration**: 3-4 days
**Goal**: RocksDB production ready

### Tasks
- [ ] Complete RocksDB compilation
- [ ] Migration from memory store
- [ ] Vector compression (quantization)
- [ ] LRU eviction policy
- [ ] Backup & restore

### Deliverables
- Native RocksDB module compiled
- `src/memory/persistent.ts`

---

## Phase 6: Distributed Gateway (26w11aE_P6)
**Duration**: 5-7 days
**Goal**: Multi-instance deployment

### Tasks
- [ ] Redis pub/sub for gateway cluster
- [ ] Session affinity
- [ ] Load balancing strategy
- [ ] Health check propagation
- [ ] Metrics aggregation (Prometheus)

### Deliverables
- `src/core/cluster.ts`
- Docker Compose setup

---

## Phase 7: Plugin Marketplace (26w11aE_P7)
**Duration**: 4-5 days
**Goal**: Secure plugin ecosystem

### Tasks
- [ ] Plugin signing (Ed25519)
- [ ] Verified publisher system
- [ ] Plugin scoring/rating
- [ ] Auto-update mechanism
- [ ] WASM sandbox runtime

### Deliverables
- `src/plugins/marketplace.ts`
- Plugin CLI: `openoxygen plugin install <name>`

---

## Phase 8: GUI Dashboard (26w11aE_P8)
**Duration**: 5-6 days
**Goal**: Web-based management

### Tasks
- [ ] Tauri/Electron wrapper
- [ ] Real-time system metrics
- [ ] Agent workflow visualization
- [ ] Model performance comparison charts
- [ ] Security audit log viewer

### Deliverables
- `packages/gui/` directory
- Standalone desktop app

---

## Phase 9: Production Release (26w11aE_P9)
**Duration**: 3-4 days
**Goal**: v26w11aE Release

### Tasks
- [ ] Security audit (3rd party)
- [ ] Documentation completion
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Release notes
- [ ] Signed binaries
- [ ] Homebrew/Chocolatey packages

### Deliverables
- GitHub Release v26w11aE
- Published packages

---

## Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| P1: Security | 2-3d | 3d |
| P2: Multi-Model | 3-4d | 7d |
| P3: Vision | 4-5d | 12d |
| P4: Input | 2-3d | 15d |
| P5: Persistence | 3-4d | 19d |
| P6: Distributed | 5-7d | 26d |
| P7: Marketplace | 4-5d | 31d |
| P8: GUI | 5-6d | 37d |
| P9: Release | 3-4d | 41d |

**Total**: ~6 weeks to v26w11aE Release

---

## Development Workflow

```
Feature Branch → dev Branch → main Branch ↓
                    ↓              ↓
                CI Build      Release Build
                    ↓              ↓
               Integration     Signed Binaries
                    ↓              ↓
                 Pull Request   GitHub Release
```

### Branch Strategy
- `main`: Stable releases only (P9 push)
- `dev`: Integration branch (all P1-P8 push)
- `feature/*`: Individual feature branches

### Commit Convention
```
phase1(deps): Add dependency security manager

- Implement dependency version lock
- Add CVE pattern matching
- Block malicious package names

Refs: risks.md#供应链风险
```

---

## Success Metrics

| Phase | Key Metric | Target |
|-------|-----------|--------|
| P1 | CVE coverage | 100% of listed CVEs mitigated |
| P2 | Concurrent models | 3 models, <2GB RAM each |
| P3 | Vision accuracy | >85% element detection |
| P4 | Input success | >99% on standard UI |
| P5 | Vector capacity | 1M+ docs, <100ms search |
| P6 | Cluster nodes | 5 gateway instances |
| P7 | Plugin installs | Zero malware detected |
| P8 | Dashboard coverage | 100% API exposed |
| P9 | Release install | <5min, any Windows 10+ |
