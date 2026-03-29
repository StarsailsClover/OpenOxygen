#!/bin/bash
# OLB Build Script
# Fixes and builds OxygenLLMBooster

set -e

echo "=========================================="
echo "OLB (OxygenLLMBooster) Build Script"
echo "=========================================="
echo ""

cd "$(dirname "$0")/../OLB"

echo "[1/5] Checking Rust toolchain..."
if ! command -v rustc &> /dev/null; then
    echo "Rust not found. Please install Rust: https://rustup.rs/"
    exit 1
fi

echo "Rust version: $(rustc --version)"
echo "Cargo version: $(cargo --version)"
echo ""

echo "[2/5] Cleaning previous build..."
cargo clean
echo ""

echo "[3/5] Checking dependencies..."
cargo check 2>&1 | tee check.log
if grep -q "error" check.log; then
    echo "Dependency check failed! See check.log"
    exit 1
fi
rm check.log
echo ""

echo "[4/5] Building OLB (CPU version)..."
cargo build --release --no-default-features 2>&1 | tee build.log
if grep -q "error" build.log; then
    echo "Build failed! See build.log"
    exit 1
fi
rm build.log
echo ""

echo "[5/5] Running tests..."
cargo test --release --no-default-features
echo ""

echo "=========================================="
echo "OLB Build Complete!"
echo "=========================================="
echo ""
echo "Output: target/release/olb_core.dll"
echo ""

# Optional: Build Python bindings
echo "Building Python bindings..."
cd python
pip install maturin
maturin develop --release
echo ""

echo "✅ OLB ready for use!"
