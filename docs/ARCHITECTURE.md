# OpenOxygen Architecture

## Overview

OpenOxygen follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Desktop   │  │    CLI      │  │      Gateway        │ │
│  │  (Tauri)    │  │             │  │  (HTTP/WebSocket)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Agent Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │Orchestrator │  │Communication│  │   Task Manager      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Planning Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ HTN Planner │  │   Router    │  │ Reflection Engine   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Execution Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Sandbox   │  │   Browser   │  │      Terminal       │ │
│  │(Worker Thr) │  │    (CDP)    │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Inference Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Engine    │  │ AI Cluster  │  │   OLB (Rust)        │ │
│  │             │  │             │  │  (Flash Attention)  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │Vector Store │  │   Memory    │  │    Security         │ │
│  │             │  │  Lifecycle  │  │  (Permissions)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Modularity
- Each layer is independent
- Clear interfaces between layers
- Easy to test and replace

### 2. Security First
- Zero-trust permission system
- Sandbox isolation
- Audit logging

### 3. Performance
- Rust core for compute-intensive tasks
- Async I/O throughout
- Memory-efficient design

### 4. Extensibility
- Plugin system
- Skill registry
- Protocol adapters

## Layer Details

### Presentation Layer
- **Desktop**: Tauri-based GUI
- **CLI**: Command-line interface
- **Gateway**: HTTP/WebSocket API

### Agent Layer
- **Orchestrator**: Multi-agent coordination
- **Communication**: Inter-agent messaging
- **Task Manager**: Task lifecycle

### Planning Layer
- **HTN Planner**: Hierarchical task decomposition
- **Router**: Dynamic model selection
- **Reflection**: Self-improvement

### Execution Layer
- **Sandbox**: Secure code execution
- **Browser**: Web automation
- **Terminal**: Shell execution

### Inference Layer
- **Engine**: LLM inference
- **AI Cluster**: Multi-model fusion
- **OLB**: Rust acceleration

### Data Layer
- **Vector Store**: Semantic search
- **Memory**: Short/Mid/Long term
- **Security**: Permissions & audit

## Data Flow

```
User Request
    ↓
Presentation Layer (validation)
    ↓
Agent Layer (orchestration)
    ↓
Planning Layer (decomposition)
    ↓
Execution Layer (sandboxed)
    ↓
Inference Layer (OLB optimized)
    ↓
Data Layer (persistence)
    ↓
Response
```

## Security Model

```
┌─────────────────────────────────────┐
│         Permission Check            │
│    (Zero-trust, every operation)    │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Sandbox Isolation           │
│    (Worker Thread, no system access)│
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│         Audit Logging               │
│    (Every action recorded)          │
└─────────────────────────────────────┘
```

## Performance Optimizations

### OLB (OxygenLLMBooster)
- Flash Attention V3
- TurboKV Cache (3-bit)
- Paged Memory
- Universal MoE

### Async Architecture
- Non-blocking I/O
- Worker pools
- Connection pooling

### Caching
- Vector cache
- Model cache
- Result cache

## Extension Points

### Skills
```typescript
interface Skill {
  id: string;
  name: string;
  handler: (params: any) => Promise<Result>;
}
```

### Protocols
```typescript
interface ProtocolAdapter {
  connect(config: Config): Promise<void>;
  execute(command: Command): Promise<Result>;
}
```

### Plugins
```typescript
interface Plugin {
  name: string;
  activate(): void;
  deactivate(): void;
}
```

## Deployment

### Standalone
```
OpenOxygen Core
├── Node.js Runtime
├── OLB (Rust binary)
└── Native modules
```

### Distributed
```
Gateway Server
├── Load Balancer
├── Multiple Workers
└── Shared Storage
```

## Future Evolution

### Phase 1: Core (Current)
- Basic functionality
- Single user
- Local execution

### Phase 2: Scale
- Multi-user
- Distributed
- Cloud-native

### Phase 3: Intelligence
- Self-learning
- Auto-optimization
- Predictive
