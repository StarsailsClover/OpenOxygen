# OpenOxygen 26w13aB Release

**Release Date**: 2026-03-16  
**Version**: 26w13aB  
**Status**: Production Ready

---

## üéØ What's New

### Phase 0: Deployment Documentation (Critical Fix)
- ‚ú?**INSTALL.md** - Complete installation guide
- ‚ú?**docs/QUICKSTART.md** - 5-minute quick start
- ‚ú?**start.bat** - One-click Windows launcher
- ‚ú?**RELEASE_26w13aB.md** - Release notes

### Phase 1: Deployment Fixes
- ‚ú?**Port auto-detection** - Automatically switches if 4800 is in use
- ‚ú?**Config path fix** - Uses installation directory instead of user home
- ‚ú?**Native module loading** - Multiple fallback strategies
- ‚ú?**@openoxygen/core-native** - Local file dependency

---

## üì¶ Installation

### Windows (x64)

1. **Download** `OpenOxygen-26w13aB-windows-x64.zip`
2. **Extract** to any directory (e.g., `D:\OpenOxygen`)
3. **Run** `start.bat`
4. **Open** http://localhost:4800

### Prerequisites
- Node.js 22+ (https://nodejs.org/)
- Ollama (optional, for local LLMs) (https://ollama.com/)

---

## üöÄ Quick Start

```powershell
# 1. Extract and enter directory
cd D:\OpenOxygen

# 2. Run
.\start.bat

# 3. Open Dashboard
# http://localhost:4800
```

---

## ‚ú?Verification

Run these commands to verify installation:

```powershell
# Health check
curl http://127.0.0.1:4800/health

# LLM test
curl -X POST http://127.0.0.1:4800/api/v1/chat `
  -H "Content-Type: application/json" `
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

---

## üìÅ Assets

| File | Size | Description |
|------|------|-------------|
| `OpenOxygen-26w13aB-windows-x64.zip` | 3.65 MB | Windows x64 Release |
| `OpenOxygen-26w13aB-source.zip` | 1.03 MB | Source code |

---

## üêõ Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| OUV Native module warning | ‚ö†Ô∏è Minor | Does not affect basic functionality |
| Port 4800 in use | ‚ú?Fixed | Auto-switches to 4801-4810 |

---

## üìö Documentation

- [INSTALL.md](INSTALL.md) - Installation guide
- [docs/QUICKSTART.md](docs/QUICKSTART.md) - Quick start
- [docs/API.md](docs/API.md) - API reference
- [CHANGELOG.md](CHANGELOG.md) - Full changelog

---

## üîí Security

- Default auth: `none` (localhost only)
- For production: Enable token auth in `openoxygen.json`

---

## üôè Credits

- **Training**: 9 rounds, 111 tasks, 84 memory entries
- **Applications tested**: 26 apps
- **Success rate**: 85% (best round)

---

## üìÑ License

MIT License - See [LICENSE](LICENSE)
