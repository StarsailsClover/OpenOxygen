# Configuration Reference

## File Location

Default: `~/.openoxygen/openoxygen.json`

Override with environment variable:
```bash
OPENOXYGEN_CONFIG_PATH=/path/to/config.json
```

## Full Schema

```json
{
  "version": "26w12aA",

  "gateway": {
    "host": "127.0.0.1",
    "port": 4800,
    "auth": {
      "mode": "none | token | password",
      "token": "your-secret-token",
      "password": "your-password"
    },
    "cors": {
      "origins": ["http://127.0.0.1", "http://localhost"]
    },
    "rateLimit": {
      "windowMs": 60000,
      "maxRequests": 100
    }
  },

  "security": {
    "privilegeLevel": "minimal | standard | elevated",
    "auditEnabled": true,
    "rollbackEnabled": true,
    "allowedPaths": ["C:\\Users\\*\\Documents"],
    "blockedExecutables": ["format", "diskpart"]
  },

  "memory": {
    "backend": "builtin",
    "hybridSearch": true,
    "maxChunks": 50000,
    "ttlDays": 30,
    "extraPaths": ["D:\\Projects"]
  },

  "vision": {
    "enabled": false,
    "captureIntervalMs": 5000,
    "confidenceThreshold": 0.7
  },

  "models": [
    {
      "provider": "ollama",
      "model": "qwen3:4b",
      "baseUrl": "http://127.0.0.1:11434/v1",
      "apiKey": "local",
      "temperature": 0.7,
      "maxTokens": 4096
    }
  ],

  "agents": {
    "default": "default",
    "list": [
      {
        "id": "default",
        "name": "OpenOxygen Default Agent",
        "skills": [],
        "tools": []
      }
    ]
  },

  "channels": [],
  "plugins": [],

  "compat": {
    "openclaw": {
      "enabled": false,
      "configPath": "~/.openclaw/openclaw.json"
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENOXYGEN_CONFIG_PATH` | Config file path | `~/.openoxygen/openoxygen.json` |
| `OPENOXYGEN_STATE_DIR` | State directory | `~/.openoxygen` |
| `OPENOXYGEN_GATEWAY_PORT` | Gateway port | `4800` |
| `OPENOXYGEN_GATEWAY_HOST` | Gateway host | `127.0.0.1` |
| `OPENOXYGEN_GATEWAY_TOKEN` | Auth token | — |
| `OPENOXYGEN_LOG_LEVEL` | Log level | `info` |
| `OPENOXYGEN_AUDIT_ENABLED` | Enable audit | `1` |
| `OPENAI_API_KEY` | OpenAI key | — |
| `ANTHROPIC_API_KEY` | Anthropic key | — |
| `GEMINI_API_KEY` | Gemini key | — |
| `OLLAMA_MODELS` | Ollama models path | — |

## Model Providers

| Provider | Base URL | Auth |
|----------|----------|------|
| `openai` | `https://api.openai.com/v1` | Bearer token |
| `anthropic` | `https://api.anthropic.com/v1` | x-api-key |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` | Bearer token |
| `openrouter` | `https://openrouter.ai/api/v1` | Bearer token |
| `ollama` | `http://127.0.0.1:11434/v1` | Optional |
| `stepfun` | `https://api.stepfun.com/v1` | Bearer token |
| `custom` | User-defined | User-defined |
