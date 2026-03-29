# Frequently Asked Questions

## General

### What is OpenOxygen?

OpenOxygen is a next-generation AI Agent platform optimized for Windows native environments, providing extreme performance and full-stack automation capabilities.

### What does "OLB" stand for?

**OLB = OxygenLLMBooster**, not "Oxygen Local Bridge". It's a Rust-based LLM acceleration engine with Flash Attention V3, TurboKV Cache, and Paged Memory Management.

### Is OpenOxygen free?

Yes, OpenOxygen is open-source under the MIT License.

### What platforms are supported?

Currently Windows is fully supported. macOS and Linux support is planned for future releases.

## Installation

### What are the system requirements?

**Minimum:**
- Windows 10/11
- 8GB RAM
- Node.js 18+
- 2GB free disk space

**Recommended:**
- Windows 11
- 16GB+ RAM
- NVIDIA GPU (for OLB CUDA)
- 5GB free disk space

### How do I install OpenOxygen?

```bash
# Clone repository
git clone https://github.com/StarsailsClover/OpenOxygen.git
cd OpenOxygen

# Install dependencies
npm install

# Build project
npm run build

# Run
npm start
```

### Do I need Rust installed?

Only if you want to build OLB from source. Pre-built binaries are available for Windows.

## Usage

### How do I create a custom skill?

```typescript
import { registerSkill } from "./skills/registry";

registerSkill({
  id: "my.skill",
  name: "My Skill",
  description: "Does something useful",
  category: "custom",
  handler: async (params) => {
    // Your logic here
    return { success: true, data: result };
  }
});
```

### How do I use the HTN planner?

```typescript
import { htnPlanner, HTNDomainBuilder } from "./planning/htn";

const domain = new HTNDomainBuilder("my-domain", "My Domain")
  .setInitialState({ ready: true })
  .addPrimitiveTask({
    id: "task-1",
    name: "Task 1",
    type: "primitive",
    executor: async () => ({ success: true })
  })
  .build();

htnPlanner.registerDomain(domain);
const plan = await htnPlanner.plan("my-domain", goalTask);
```

### How do I connect to an MCP server?

```typescript
import { mcpClient } from "./protocols/mcp";

await mcpClient.connect({
  id: "my-server",
  name: "My MCP Server",
  url: "http://localhost:3001"
});

const tools = await mcpClient.discoverTools("my-server");
const result = await mcpClient.callTool("my-server", "tool-name", args);
```

## Troubleshooting

### Build fails with "Rust not found"

Install Rust: https://rustup.rs/

Or skip OLB build:
```bash
npm run build:ts  # TypeScript only
```

### Tests fail

```bash
# Run specific test
npm test -- sandbox

# Run with coverage
npm run test:coverage

# Debug mode
npm run test:debug
```

### High memory usage

- Enable KV cache compression
- Reduce batch size
- Check for memory leaks with `npm run profile`

### Slow inference

- Enable OLB acceleration
- Use Flash Attention
- Check GPU utilization
- Enable dynamic batching

## Features

### What skills are included?

**Office:**
- Word document operations
- Excel spreadsheet operations
- PowerPoint presentations
- PDF conversion

**Browser:**
- Chrome/Edge automation
- Screenshot capture
- Form filling
- Cookie management

**System:**
- File operations
- Clipboard management
- Desktop organization
- System information

### Can I use OpenClaw skills?

Yes! Use the OpenClaw compatibility layer:

```typescript
import { migrateFromOpenClaw } from "./compat/openclaw";

await migrateFromOpenClaw("openclaw-config.json", "output.json");
```

### How do I integrate with my LLM?

Configure in `config.json`:
```json
{
  "inference": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "your-key"
  }
}
```

## Development

### How do I contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md)

### Where is the documentation?

- [API Reference](API.md)
- [Skills Guide](SKILLS.md)
- [Architecture](ARCHITECTURE.md)

### How do I report a bug?

Create an issue: https://github.com/StarsailsClover/OpenOxygen/issues

### How do I request a feature?

Create a feature request in GitHub Discussions.

## Performance

### How fast is OLB?

- **Inference**: ~21ms round-trip
- **Screenshot**: ~85ms (Win32 BitBlt)
- **Vector Search**: ~14ms (SIMD)

### Can I use CPU only?

Yes, OLB works on CPU. GPU acceleration is optional.

### How do I optimize performance?

1. Enable OLB
2. Use Flash Attention
3. Enable KV cache compression
4. Use batch processing
5. Monitor with performance tools

## Security

### Is code execution safe?

Yes, all code runs in Worker Thread sandbox with:
- No system access
- Resource limits
- Timeout enforcement
- Code validation

### How are permissions handled?

Zero-trust permission system:
- Every operation checked
- Fine-grained access control
- Audit logging

### Can I disable certain features?

Yes, configure in `security.json`:
```json
{
  "sandbox": {
    "enabled": true,
    "timeoutMs": 30000
  },
  "permissions": {
    "fileAccess": ["/allowed/path"]
  }
}
```

## Roadmap

### What's next?

- Desktop client completion
- CUDA optimization
- Knowledge graph
- Cross-platform support

### When will macOS/Linux be supported?

Target: Q3 2026

### Will there be a cloud version?

Yes, cloud-native deployment is planned.

---

**Still have questions?**

- [GitHub Discussions](https://github.com/StarsailsClover/OpenOxygen/discussions)
- [Issues](https://github.com/StarsailsClover/OpenOxygen/issues)
