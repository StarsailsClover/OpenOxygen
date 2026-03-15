# OpenOxygen Release Builder
# Creates a clean release package for end users

param(
    [string]$Version = "26w13aB",
    [string]$OutputDir = "."
)

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  OpenOxygen Release Builder                                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "━━━ Checking Prerequisites ━━━" -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Error "Node.js not found. Please install Node.js 22+"
    exit 1
}
Write-Host "✓ Node.js: $nodeVersion"

$rustVersion = cargo --version 2>$null
if (-not $rustVersion) {
    Write-Error "Rust not found. Please install Rust"
    exit 1
}
Write-Host "✓ Rust: $rustVersion"

# Clean and install
Write-Host ""
Write-Host "━━━ Installing Dependencies ━━━" -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed"
    exit 1
}
Write-Host "✓ Dependencies installed"

# Build native module
Write-Host ""
Write-Host "━━━ Building Native Module ━━━" -ForegroundColor Yellow

cd packages\core-native
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Error "Native module build failed"
    exit 1
}
cd ..\..
Write-Host "✓ Native module built"

# Build TypeScript
Write-Host ""
Write-Host "━━━ Building TypeScript ━━━" -ForegroundColor Yellow

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "TypeScript build failed"
    exit 1
}
Write-Host "✓ TypeScript built"

# Create release directory
Write-Host ""
Write-Host "━━━ Creating Release Package ━━━" -ForegroundColor Yellow

$releaseDir = "OpenOxygen-$Version"
if (Test-Path $releaseDir) {
    Remove-Item -Recurse -Force $releaseDir
}
New-Item -ItemType Directory -Path $releaseDir | Out-Null

# Copy essential files
$filesToCopy = @(
    "package.json",
    "package-lock.json",
    "openoxygen.json",
    "start.bat",
    "INSTALL.md",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "RELEASE_26w13aB.md"
)

foreach ($file in $filesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file $releaseDir\
        Write-Host "  Copied: $file"
    }
}

# Copy directories
$dirsToCopy = @(
    "dist",
    "packages\core-native",
    "docs",
    "scripts"
)

foreach ($dir in $dirsToCopy) {
    if (Test-Path $dir) {
        Copy-Item -Recurse $dir $releaseDir\
        Write-Host "  Copied: $dir"
    }
}

# Create minimal package.json for production
$pkg = Get-Content "$releaseDir\package.json" | ConvertFrom-Json
$prodPkg = @{
    name = $pkg.name
    version = $pkg.version
    description = $pkg.description
    main = $pkg.main
    scripts = @{
        start = "node dist/entry.js"
    }
    dependencies = $pkg.dependencies
    engines = $pkg.engines
} | ConvertTo-Json -Depth 10

$prodPkg | Set-Content "$releaseDir\package.json"

# Create ZIP
$zipName = "OpenOxygen-$Version-windows-x64.zip"
Compress-Archive -Path $releaseDir\* -DestinationPath $zipName -Force

# Cleanup
Remove-Item -Recurse -Force $releaseDir

$size = (Get-Item $zipName).Length / 1MB
Write-Host ""
Write-Host "✅ Release package created: $zipName" -ForegroundColor Green
Write-Host "   Size: $([math]::Round($size, 2)) MB" -ForegroundColor Green
Write-Host ""
Write-Host "To install:" -ForegroundColor Cyan
Write-Host "  1. Extract $zipName" -ForegroundColor White
Write-Host "  2. Run: .\start.bat" -ForegroundColor White
Write-Host "  3. Open: http://localhost:4800" -ForegroundColor White
