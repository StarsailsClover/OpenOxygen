

## 2026-03-14T02:46:57.259Z

## Benchmark Summary (26w11aD)

### Screen Capture (Win32 BitBlt)
- P50: 63.4ms, P95: 102.0ms, P99: 102.0ms
- Mean: 66.8ms, Std: 13.9ms

### Vector Search (1000 docs, 128-dim, SIMD)
- P50: 13.839ms, P95: 20.323ms

### UI Automation
- Duration: 6555.1ms
- Elements detected: 43

### Inference Engine
- short (1 tokens): P50=9ms, P95=71ms
- medium (20 tokens): P50=6ms, P95=11ms
- long (150 tokens): P50=8ms, P95=10ms

### Concurrency
- c1: 1/1 success, 147.3 RPS
- c2: 2/2 success, 143.0 RPS
- c4: 4/4 success, 210.9 RPS
- c8: 8/8 success, 251.6 RPS

### End-to-End Pipeline
- Vision: P50=6698ms
- Inference: P50=9ms
- Input: P50=221ms
- Total: P50=6930ms, P95=62553ms
