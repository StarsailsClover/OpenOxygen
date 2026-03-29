# OpenOxygen 26w14a-dev-26.114.0 Release Notes

**Release Date**: March 29, 2026  
**Version**: 26w14a-dev-26.114.0  
**Codename**: "Phoenix"  
**Status**: Development - Phase 1

---

## 🎉 What's New in 26.114.0

### 📡 Industry Standard Protocols (Phase 1)

#### OpenAI Tool Calling Protocol (NEW)
- Full OpenAI function calling standard implementation
- Tool schema definition and validation
- Function call parsing and execution
- Response formatting per OpenAI spec
- Compatible with GPT-4, GPT-3.5, and compatible models

#### Enhanced MCP Protocol (IMPROVED)
- Complete Model Context Protocol 2024-11-05 support
- Tool discovery and dynamic registration
- Resource URI handling
- Prompt template management
- Multi-server connection management

### 🔧 Type System Improvements
- Extended core type definitions
- Fixed import path issues
- Relaxed build configuration for faster iteration
- Foundation for full type safety (ongoing)

### 📦 Build System
- New tsconfig.build.json for production builds
- Portable ZIP distribution
- Automated build scripts

---

## 🚀 Quick Start

### Using OpenAI Protocol
```typescript
import { openAIProtocol } from "./protocols/openai";

// Define tools
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" },
        },
        required: ["location"],
      },
    },
  },
];

// Execute with OpenAI format
const result = await openAIProtocol.execute(tools, userRequest);
```

### Using MCP Protocol
```typescript
import { mcpClient } from "./protocols/mcp";

// Connect to MCP server
await mcpClient.connect({
  id: "my-server",
  name: "My MCP Server",
  url: "http://localhost:3001",
});

// Discover and use tools
const tools = await mcpClient.discoverTools("my-server");
const result = await mcpClient.callTool("my-server", "tool-name", args);
```

---

## 📋 Phase 1 Completion Status

| Feature | Status | Notes |
|---------|--------|-------|
| OpenAI Tool Calling | ✅ Complete | Full standard implementation |
| MCP Protocol | ✅ Enhanced | 2024-11-05 spec compliant |
| Protocol Tests | 🔄 In Progress | Core tests added |
| Documentation | ✅ Complete | API docs updated |

---

## 🔮 Coming in Next Phases

### Phase 2: Testing & Polish
- Complete test coverage for protocols
- Performance optimization
- Bug fixes

### Phase 3: Advanced Features
- Streaming support
- Batch operations
- Advanced error handling

---

## 🐛 Known Issues

- Some type errors in non-core modules (cosmetic, doesn't affect runtime)
- OLB CUDA build optional

---

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

**Made with ❤️ by the OpenOxygen Team**
