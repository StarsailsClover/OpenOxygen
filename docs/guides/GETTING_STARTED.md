# OpenOxygen Getting Started Guide

## Quick Start

### Installation

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

### Basic Usage

```typescript
import { OpenOxygen } from "openoxygen";

const oxygen = new OpenOxygen();
await oxygen.initialize();

// Execute a task
const result = await oxygen.execute("List files in current directory");
console.log(result);
```

## Next Steps

- Read [API Documentation](../api/README.md)
- Check [Architecture](../architecture/26w14a_ARCHITECTURE.md)
