#!/bin/bash
# Build script for OLB

set -e

echo "Building OLB Core..."

# Check Rust toolchain
if ! command -v rustc &> /dev/null; then
    echo "Rust not found. Please install Rust: https://rustup.rs/"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Install maturin if not present
if ! command -v maturin &> /dev/null; then
    echo "Installing maturin..."
    pip install maturin
fi

# Build Rust library
echo "Building Rust library..."
cargo build --release

# Build Python bindings
echo "Building Python bindings..."
maturin develop --release

# Run tests
echo "Running Rust tests..."
cargo test --release

echo "Running Python tests..."
python -m pytest python/tests/ -v

echo "Build complete!"
