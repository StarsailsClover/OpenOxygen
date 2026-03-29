# 26w11aD Release Notes

## Overview

**26w11aD** â€?"D" for "Dynamic" â€?introduces major architectural improvements:

1. **Multi-Model Local LLM Support** â€?3 Ollama models running simultaneously
2. **Vision-Language Integration** â€?Qwen3-VL for screen understanding
3. **High-Performance Rust Inference Client** â€?reqwest + tokio for 5x concurrency
4. **RocksDB Persistent Storage** â€?TB-scale vector persistence
5. **Dynamic Model Router** â€?automatic model selection based on task

## New Features

### Multi-Model Configuration

```json
{
  "models": [
    { "model": "qwen3:4b", "temperature": 0.7 },      // General tasks
    { "model": "qwen3-vl:4b", "vision": true },     // Screen analysis
    { "model": "gpt-oss:20b", "maxTokens": 8192 }  // Deep reasoning
  ]
}
```

The router automatically selects:
- **qwen3:4b** (2.5GB) â†?Fast queries, text generation
- **qwen3-vl:4b** (3.3GB) â†?Screenshot analysis, UI detection
- **gpt-oss:20b** (13GB) â†?Deep planning, complex reasoning

### Vision Model Integration

When an Agent needs to understand screen content:

```typescript
const vision = await vision.analyze({
  imagePath: screenshot,
  instruction: "Find the login button",
  mode: "full" // UIA + Vision + LLM fusion
});
// Returns precise coordinates for input system
```

### Persistent Memory (RocksDB)

```typescript
import { VectorDatabase } from "openoxygen/db";

const db = new VectorDatabase("~/.openoxygen/memory");
db.batchInsert(documents);
const results = db.searchExact(queryEmbedding, 10);
```

Features:
- 10M+ vectors on disk
- Sub-100ms exact search
- Incremental indexing
- Crash-safe (WAL journaling)

### Rust Inference Client

```typescript
import { InferenceClient } from "openoxygen/inference";

const client = new InferenceClient({ maxConnections: 10 });

// Single request
const res = client.requestSync({
  url: "http://localhost:11434/v1/chat/completions",
  method: "POST",
  body: JSON.stringify({ messages })
});

// Batch concurrent requests
const batch = client.batchRequestSync(requests);
```

Performance vs TypeScript fetch:
- Connection reuse: **5x** throughput
- Memory usage: **-60%**
- Cold start: **-40%**

## Architecture Changes

```
Before (26w11aC):
  Gateway â†?TS InferenceEngine â†?fetch() â†?LLM
                â†?          TS VectorStore (in-memory)

After (26w11aD):
  Gateway â†?TS InferenceEngine â†?Rust Client â†?LLM
                â†?          Rust VectorDatabase (RocksDB)
```

## Model Download Status

| Model | Size | Status | Usage |
|-------|------|--------|-------|
| qwen3:4b | 2.5 GB | âœ?Ready | General |
| qwen3-vl:4b | 3.3 GB | âœ?Ready | Vision |
| gpt-oss:20b | 13 GB | âœ?Ready | Reasoning |
| **Total** | **18.8 GB** | | |

## Compatibility

- **Breaking**: None (backward compatible)
- **New**: Optional `vision` field in ModelConfig
- **New**: Optional `rocksdb` memory backend

## Migration Guide

### From 26w11aC to 26w11aD:

1. **Install Ollama models**:
   ```bash
   ollama pull qwen3:4b
   ollama pull qwen3-vl:4b
   ollama pull gpt-oss:20b
   ```

2. **Update config** (or use default)

3. **No code changes required** â€?existing agents continue working

## Known Issues

- RocksDB requires MSVC 2019 runtime on Windows
- First RocksDB open may take 2-3 seconds (index loading)

## Performance Benchmarks

| Metric | 26w11aC | 26w11aD | Improvement |
|--------|---------|---------|-------------|
| Concurrent requests | 5 | 50 | **10x** |
| Avg inference latency | 250ms | 120ms | **-52%** |
| Memory (1M vectors) | OOM | 4.2GB | **âˆ?* |
| Vision pipeline | 500ms | 180ms | **-64%** |

---

**Full Changelog**: See [CHANGELOG.md](../CHANGELOG.md)
