# OpenOxygen Release Checklist

**Version**: 26w13a-main-26.103.0  
**Date**: 2026-03-28  
**Branch**: main

---

## Pre-Release Checklist

### 1. Code Quality ✅
- [x] TypeScript strict mode enabled
- [x] All type errors fixed
- [x] Security vulnerabilities patched
- [x] Code review completed

### 2. Testing ✅
- [x] Unit tests written (51+ tests)
- [x] Integration tests prepared
- [ ] Full test suite run
- [ ] Performance benchmarks

### 3. Documentation ✅
- [x] README updated
- [x] API documentation complete
- [x] Skills documentation complete
- [x] Changelog updated

### 4. Build ✅
- [x] TypeScript compilation
- [ ] OLB Rust build
- [ ] Native modules compiled
- [ ] Installer created

---

## Release Steps

### Step 1: Version Update
```bash
node scripts/update-version.js
```
- [ ] package.json updated
- [ ] README.md updated
- [ ] Cargo.toml updated
- [ ] VERSION.txt created

### Step 2: Security Audit
```bash
python scripts/security_audit.py
```
- [ ] Security audit run
- [ ] Critical issues fixed
- [ ] Report reviewed

### Step 3: Test Deployment
```bash
mkdir D:\TestOpenOxygenInstall
xcopy dist D:\TestOpenOxygenInstall\dist\
xcopy skills D:\TestOpenOxygenInstall\skills\
```
- [ ] Test directory created
- [ ] Files copied
- [ ] Smoke test passed

### Step 4: Full Test Suite
```bash
npm test
npm run test:integration
```
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Browser tests pass
- [ ] OUV tests pass

### Step 5: Build Installer
```bash
"C:\Program Files (x86)\NSIS\makensis.exe" scripts\build-installer.nsi
```
- [ ] NSIS installer built
- [ ] Installer tested
- [ ] Digital signature (optional)

### Step 6: File Organization
```bash
mkdir archive\old_builds
mkdir archive\backups
move *.bak archive\backups\
```
- [ ] Old builds archived
- [ ] Backups organized
- [ ] Temp files cleaned

### Step 7: Git Operations

#### Check Status
```bash
git status
git diff --stat
```
- [ ] Uncommitted changes reviewed
- [ ] Sensitive files not staged
- [ ] .gitignore updated

#### Commit to dev
```bash
git checkout dev
git merge main
git add .
git commit -m "Release 26w13a-dev-26.110.0"
git push origin dev
```
- [ ] Dev branch updated
- [ ] Committed
- [ ] Pushed

#### Commit to main
```bash
git checkout main
git add .
git commit -m "Release 26w13a-main-26.103.0"
git tag -a v26.103.0 -m "Version 26w13a-main-26.103.0"
git push origin main
git push origin v26.103.0
```
- [ ] Main branch committed
- [ ] Tag created
- [ ] Pushed to origin

### Step 8: GitHub Release
- [ ] Release notes written
- [ ] Assets uploaded
- [ ] Published

---

## Post-Release

### Verification
- [ ] Installation tested
- [ ] Upgrade path tested
- [ ] Documentation links work
- [ ] Download links work

### Communication
- [ ] Announcement prepared
- [ ] Social media updated
- [ ] Community notified

---

## Version Naming Convention

Format: `YYwWWa-BRANCH-YY.BUILD.PATCH`

Example: `26w13a-main-26.103.0`

- `26` - Year (2026)
- `w13` - Week 13
- `a` - Iteration
- `main` - Branch name
- `26.103.0` - Build number

### Branches
- `main` - Production
- `dev` - Development
- `feature/*` - Features
- `hotfix/*` - Hotfixes

---

## Files to Include in Release

### Required
- [ ] dist/ (compiled code)
- [ ] skills/ (skill definitions)
- [ ] docs/ (documentation)
- [ ] README.md
- [ ] LICENSE
- [ ] package.json
- [ ] openoxygen.mjs

### Optional
- [ ] OLB/ (if built)
- [ ] examples/
- [ ] scripts/
- [ ] CHANGELOG.md

### Exclude
- [x] node_modules/
- [x] .git/
- [x] *.log
- [x] *.bak
- [x] test/
- [x] coverage/

---

## Quick Commands

```bash
# Full release pipeline
scripts\release-pipeline.bat

# Update version
node scripts/update-version.js

# Security audit
python scripts/security_audit.py

# Run tests
npm test

# Build
npm run build

# Create installer
"C:\Program Files (x86)\NSIS\makensis.exe" scripts\build-installer.nsi
```

---

## Emergency Contacts

- **Maintainer**: StarsailsClover
- **Repository**: https://github.com/StarsailsClover/OpenOxygen
- **Issues**: https://github.com/StarsailsClover/OpenOxygen/issues

---

**Release Status**: 🔄 In Progress  
**Last Updated**: 2026-03-28
