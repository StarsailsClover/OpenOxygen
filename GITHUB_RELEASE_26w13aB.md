# OpenOxygen 26w13aB Release

**Release Date**: 2026-03-16  
**Version**: 26w13aB  
**Status**: Production Ready

---

## 🎯 What's New

### Phase 0: Deployment Documentation (Critical Fix)
- ✅ **INSTALL.md** - Complete installation guide
- ✅ **docs/QUICKSTART.md** - 5-minute quick start
- ✅ **start.bat** - One-click Windows launcher
- ✅ **RELEASE_26w13aB.md** - Release notes

### Phase 1: Deployment Fixes
- ✅ **Port auto-detection** - Automatically switches if 4800 is in use
- ✅ **Config path fix** - Uses installation directory instead of user home
- ✅ **Native module loading** - Multiple fallback strategies
- ✅ **@openoxygen/core-native** - Local file dependency

---

## 📦 Installation

### Windows (x64)

1. **Download** `OpenOxygen-26w13aB-windows-x64.zip`
2. **Extract** to any directory (e.g., `D:\OpenOxygen`)
3. **Run** `start.bat`
4. **Open** http://localhost:4800

### Prerequisites
- Node.js 22+ (https://nodejs.org/)
- Ollama (optional, for local LLMs) (https://ollama.com/)

---

## 🚀 Quick Start

```powershell
# 1. Extract and enter directory
cd D:\OpenOxygen

# 2. Run
.\start.bat

# 3. Open Dashboard
# http://localhost:4800
```

---

## ✅ Verification

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

## 📁 Assets

| File | Size | Description |
|------|------|-------------|
| `OpenOxygen-26w13aB-windows-x64.zip` | 3.65 MB | Windows x64 Release |
| `OpenOxygen-26w13aB-source.zip` | 1.03 MB | Source code |

---

## 🐛 Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| OUV Native module warning | ⚠️ Minor | Does not affect basic functionality |
| Port 4800 in use | ✅ Fixed | Auto-switches to 4801-4810 |

---

## 📚 Documentation

- [INSTALL.md](INSTALL.md) - Installation guide
- [docs/QUICKSTART.md](docs/QUICKSTART.md) - Quick start
- [docs/API.md](docs/API.md) - API reference
- [CHANGELOG.md](CHANGELOG.md) - Full changelog

---

## 🔒 Security

- Default auth: `none` (localhost only)
- For production: Enable token auth in `openoxygen.json`

---

## 🙏 Credits

- **Training**: 9 rounds, 111 tasks, 84 memory entries
- **Applications tested**: 26 apps
- **Success rate**: 85% (best round)

---

## 📄 License

MIT License - See [LICENSE](LICENSE)
