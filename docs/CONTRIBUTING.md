# Contributing to OpenOxygen

Thank you for your interest in contributing to OpenOxygen! This document provides guidelines for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## How to Contribute

### Reporting Bugs

1. Check if the bug is already reported
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with:
   - Clear use case
   - Proposed solution
   - Alternative considerations

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit with clear messages
6. Push to your fork
7. Create a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- Rust toolchain (for OLB)
- Git

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/OpenOxygen.git
cd OpenOxygen

# Install dependencies
npm install

# Build OLB (optional)
cd OLB
cargo build --release
cd ..

# Run tests
npm test

# Start development
npm run dev
```

## Code Style

### TypeScript

- Use strict mode
- Prefer interfaces over types
- Use meaningful variable names
- Add JSDoc comments

Example:
```typescript
/**
 * Execute a skill with given parameters
 * @param skillId - Unique skill identifier
 * @param params - Execution parameters
 * @returns Tool execution result
 */
async function executeSkill(
  skillId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  // Implementation
}
```

### Rust (OLB)

- Follow Rust naming conventions
- Use `cargo fmt` for formatting
- Add documentation comments
- Write unit tests

Example:
```rust
/// Execute inference with optimized kernels
/// 
/// # Arguments
/// * `input` - Input tensor
/// * `config` - Inference configuration
/// 
/// # Returns
/// Inference result tensor
pub fn inference(
    &self,
    input: &Tensor,
    config: &Config
) -> Result<Tensor, Error> {
    // Implementation
}
```

## Testing

### Unit Tests

```typescript
import { describe, test, expect } from "vitest";

describe("Feature", () => {
  test("should do something", () => {
    const result = functionUnderTest();
    expect(result).toBe(expected);
  });
});
```

### Integration Tests

Place in `src/tests/` directory.

### Test Coverage

Aim for 70%+ coverage:
```bash
npm run test:coverage
```

## Documentation

- Update README for user-facing changes
- Update API.md for interface changes
- Update ARCHITECTURE.md for structural changes
- Add inline comments for complex logic

## Commit Messages

Format:
```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Example:
```
feat(skills): add Excel chart generation

- Add createChart skill
- Support multiple chart types
- Update documentation

Closes #123
```

## Versioning

We follow semantic versioning:
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

Version format: `YYwWWa-BRANCH-YY.BUILD.PATCH`

## Review Process

1. Automated checks must pass
2. At least one maintainer review
3. Address review comments
4. Squash commits if needed

## Areas for Contribution

### High Priority
- Test coverage improvement
- Documentation updates
- Bug fixes

### Medium Priority
- New skills
- Performance optimizations
- UI improvements

### Low Priority
- Refactoring
- Code cleanup
- Examples

## Questions?

- Join our [Discussions](https://github.com/StarsailsClover/OpenOxygen/discussions)
- Check [FAQ](docs/FAQ.md)
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

---

Thank you for contributing to OpenOxygen! 🚀
