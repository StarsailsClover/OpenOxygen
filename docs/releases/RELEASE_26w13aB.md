# OpenOxygen 26w13aB Release Notes

**Release Date**: 2026-03-15  
**Version**: 26w13aB_Phase0  
**Status**: Beta Release

---

## üéØ Release Focus: User Experience & Deployment

This release addresses the critical need for **easy deployment** and **clear documentation** for end users.

---

## üì¶ Installation Packages

### Windows x64

| Package | Size | Download | SHA256 |
|---------|------|----------|--------|
| `OpenOxygen-26w13aB-windows-x64.zip` | ~150MB | [Download](#) | `...` |
| `OpenOxygen-26w13aB-windows-x64.exe` | ~155MB | [Download](#) | `...` |

### System Requirements

- **OS**: Windows 10 (1903+) / Windows 11
- **CPU**: x64, 4 cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **GPU**: Optional (for local LLM acceleration)
- **Disk**: 2GB free space

---

## üöÄ Quick Start

### 1. Download & Extract

```powershell
# Download OpenOxygen-26w13aB-windows-x64.zip
# Extract to D:\OpenOxygen (or any path)
```

### 2. Run

```powershell
cd D:\OpenOxygen
.\start.bat
```

### 3. Access Dashboard

Open browser: http://localhost:4800

---

## üìö Documentation

New documentation for this release:

| Document | Purpose |
|----------|---------|
| [INSTALL.md](../INSTALL.md) | Complete installation guide |
| [docs/QUICKSTART.md](../docs/QUICKSTART.md) | 5-minute quick start |
| [docs/CONFIG.md](../docs/CONFIG.md) | Configuration reference |
| [docs/API.md](../docs/API.md) | API documentation |

---

## ‚ú?What's New in 26w13aB

### User Experience

- ‚ú?**One-click start**: `start.bat` for Windows
- ‚ú?**Auto-dependency check**: Detects missing Node.js/Rust
- ‚ú?**Auto-build**: Builds native modules on first run
- ‚ú?**Clear error messages**: Human-readable error guidance

### Documentation

- ‚ú?**INSTALL.md**: Step-by-step installation
- ‚ú?**QUICKSTART.md**: 5-minute getting started
- ‚ú?**Model configuration guide**: How to add local/remote models
- ‚ú?**Troubleshooting section**: Common issues and fixes

### Training Results (from 26w13aA)

- 9 rounds of training (R1-R9)
- 111 tasks executed
- 84 visual memory entries
- 26 applications tested
- 85% success rate (best round)

---

## üîß Configuration

### Default Configuration

```json
{
  "version": "26w13aB",
  "gateway": {
    "host": "127.0.0.1",
    "port": 4800,
    "auth": { "mode": "none" }
  },
  "models": [
    {
      "provider": "ollama",
      "model": "qwen3:4b",
      "baseUrl": "http://127.0.0.1:11434/v1"
    }
  ]
}
```

### Adding Models

See [docs/QUICKSTART.md](../docs/QUICKSTART.md) for detailed instructions.

---

## üß™ Testing

Run included tests to verify installation:

```powershell
# Browser compatibility
node test/26w13a-p1-browser-compat.mjs

# Software compatibility
node test/26w13a-p2-software-compat.mjs

# Multi-AI relay
node test/26w13a-p3-multi-ai.mjs
```

---

## üêõ Known Issues

| Issue | Workaround | Status |
|-------|------------|--------|
| Screen recorder interference | Close OBS/Bandicam before use | Investigating |
| VS Code save dialog handling | Manual confirmation needed | Planned fix |
| Mouse drag operations | Use click sequences instead | Native API limitation |

---

## üîí Security

- Default auth: `none` (localhost only)
- For production: Enable token auth
- See [docs/SECURITY.md](../docs/SECURITY.md)

---

## üìà Performance

| Metric | Value |
|--------|-------|
| Gateway startup | ~2s |
| LLM inference (local) | ~3-8s |
| Screenshot capture | ~85ms |
| UI element detection | ~250 elements |

---

## üó∫Ô∏?Roadmap

### 26w14a (Next)
- Visual model integration (UI-TARS, GPT-4V)
- Enhanced training mode (10min √ó 10 rounds)
- Risk prediction and event handling

### 26w15a
- Plugin marketplace
- Cross-platform support (macOS/Linux)
- Enterprise RBAC

---

## ü§ù Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## üìÑ License

MIT License - See [LICENSE](../LICENSE)

---

## üìû Support

- GitHub Issues: https://github.com/yourusername/openoxygen/issues
- Documentation: https://docs.openoxygen.dev
- Discord: https://discord.gg/openoxygen

---

**Full Changelog**: [CHANGELOG.md](../CHANGELOG.md)
