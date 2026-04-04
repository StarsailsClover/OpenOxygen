# Contributing to OpenOxygen

Thank you for your interest in contributing to OpenOxygen! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 22+
- npm 10+
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/StarsailsClover/OpenOxygen.git
cd OpenOxygen

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### 2. Make Changes

- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 3. Test

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run linter
npm run lint

# Run type check
npm run typecheck
```

### 4. Commit

Follow conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
refactor: refactor code
test: add tests
chore: update dependencies
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Code Style

### TypeScript

- Use strict TypeScript
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public APIs
- Document public functions with JSDoc

Example:

```typescript
/**
 * Execute a task with the given instruction
 * @param instruction - Natural language instruction
 * @returns Task execution result
 */
export async function executeTask(
  instruction: string,
): Promise<TaskResult> {
  // Implementation
}
```

### Naming

- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names

### Error Handling

Always return standardized results:

```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Good
return {
  success: false,
  error: "File not found",
};

// Bad
throw new Error("File not found");
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-module";

describe("My Module", () => {
  it("should do something", () => {
    const result = myFunction();
    expect(result.success).toBe(true);
  });
});
```

### Test Coverage

- Aim for 70%+ coverage
- Test edge cases
- Test error conditions

## Documentation

- Update README.md for user-facing changes
- Update API docs for public API changes
- Add JSDoc comments to public functions
- Update CHANGELOG.md

## Pull Request Process

1. Ensure all tests pass
2. Update documentation
3. Add entry to CHANGELOG.md
4. Request review from maintainers
5. Address review feedback
6. Merge when approved

## Code Review

### As a Reviewer

- Check code quality and style
- Verify tests are adequate
- Ensure documentation is updated
- Test the changes locally if needed

### As an Author

- Respond to feedback promptly
- Explain your reasoning
- Be open to suggestions
- Make requested changes

## Release Process

1. Update version in package.json
2. Update VERSION.txt
3. Update CHANGELOG.md
4. Create git tag
5. Push to main
6. CI will create release automatically

## Getting Help

- Join our Discord: [link]
- Open an issue: https://github.com/StarsailsClover/OpenOxygen/issues
- Email: [email]

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
