@echo off
REM Build script for OLB on Windows

echo Building OLB Core...

REM Check Rust toolchain
where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo Rust not found. Please install Rust: https://rustup.rs/
    exit /b 1
)

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python not found. Please install Python 3.8+
    exit /b 1
)

REM Install maturin if not present
where maturin >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing maturin...
    pip install maturin
)

REM Build Rust library
echo Building Rust library...
cargo build --release
if %errorlevel% neq 0 (
    echo Rust build failed!
    exit /b 1
)

REM Build Python bindings
echo Building Python bindings...
maturin develop --release
if %errorlevel% neq 0 (
    echo Python bindings build failed!
    exit /b 1
)

REM Run tests
echo Running Rust tests...
cargo test --release
if %errorlevel% neq 0 (
    echo Rust tests failed!
    exit /b 1
)

echo Running Python tests...
python -m pytest python/tests/ -v
if %errorlevel% neq 0 (
    echo Python tests failed!
    exit /b 1
)

echo Build complete!
pause
