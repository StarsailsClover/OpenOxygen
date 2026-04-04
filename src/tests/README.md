# OpenOxygen Test Suite

## Overview

This directory contains the comprehensive test suite for OpenOxygen.

## Structure

```
src/tests/
├── unit/                    # Unit tests
│   ├── inference-engine.test.ts
│   ├── skill-system.test.ts
│   ├── htn-planner.test.ts
│   ├── multi-agent.test.ts
│   └── security.test.ts
├── integration/             # Integration tests
│   ├── integration.test.ts
│   └── mcp.test.ts
├── e2e/                     # End-to-end tests
│   └── (e2e test files)
├── performance/             # Performance benchmarks
│   └── benchmark.test.ts
└── README.md               # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
npx vitest run src/tests/unit/security.test.ts
```

### Run with coverage
```bash
npx vitest run --coverage
```

## Test Categories

### Unit Tests
Test individual modules in isolation:
- Inference Engine
- Skill System
- HTN Planner
- Multi-Agent System
- Security Module

### Integration Tests
Test module interactions:
- API integration
- MCP protocol
- Database operations

### E2E Tests
Test complete workflows:
- End-to-end task execution
- Browser automation
- GUI interactions

### Performance Tests
Benchmark critical paths:
- Inference speed
- Memory usage
- Throughput

## Writing Tests

### Basic Test Structure
```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../../path/to/module.js";

describe("Module Name", () => {
  it("should do something", () => {
    const result = myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### Async Tests
```typescript
it("should handle async operations", async () => {
  const result = await myAsyncFunction();
  expect(result.success).toBe(true);
});
```

### Setup and Teardown
```typescript
import { beforeEach, afterEach } from "vitest";

beforeEach(() => {
  // Setup code
});

afterEach(() => {
  // Cleanup code
});
```

## Coverage Requirements

- Lines: 70%
- Functions: 70%
- Branches: 60%
- Statements: 70%

## Best Practices

1. **Test one thing at a time** - Each test should verify a single behavior
2. **Use descriptive names** - Test names should explain what is being tested
3. **Clean up after tests** - Use `afterEach` to clean up state
4. **Mock external dependencies** - Use `vi.fn()` for mocking
5. **Test edge cases** - Include error cases and boundary conditions

## Troubleshooting

### Tests failing with timeout
Increase timeout in `vitest.config.ts` or use:
```typescript
it("slow test", { timeout: 30000 }, async () => {
  // test code
});
```

### Tests failing on Windows
Ensure proper path handling using `path.join()` and `fileURLToPath`.

### Coverage not generating
Check that `coverage` is enabled in `vitest.config.ts`.
