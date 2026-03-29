@echo off
REM OLB Build Script for Windows
REM Fixes and builds OxygenLLMBooster

echo ==========================================
echo OLB (OxygenLLMBooster) Build Script
echo ==========================================
echo.

cd "%~dp0\..\OLB"

echo [1/5] Checking Rust toolchain...
where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo Rust not found. Please install Rust: https://rustup.rs/
    exit /b 1
)

for /f "tokens=*" %%a in ('rustc --version') do echo Rust version: %%a
for /f "tokens=*" %%a in ('cargo --version') do echo Cargo version: %%a
echo.

echo [2/5] Cleaning previous build...
cargo clean
if %errorlevel% neq 0 (
    echo Clean failed!
    exit /b 1
)
echo.

echo [3/5] Checking dependencies...
cargo check --no-default-features 2>&1
if %errorlevel% neq 0 (
    echo Dependency check failed!
    exit /b 1
)
echo.

echo [4/5] Building OLB (CPU version)...
cargo build --release --no-default-features 2>&1
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)
echo.

echo [5/5] Running tests...
cargo test --release --no-default-features 2>&1
if %errorlevel% neq 0 (
    echo Tests failed!
    exit /b 1
)
echo.

echo ==========================================
echo OLB Build Complete!
echo ==========================================
echo.
echo Output: target\release\olb_core.dll
echo.

REM Optional: Build Python bindings
echo Building Python bindings...
cd python
pip install maturin
maturin develop --release --no-default-features
if %errorlevel% neq 0 (
    echo Python bindings build failed!
    exit /b 1
)
echo.

echo ✅ OLB ready for use!
pause
