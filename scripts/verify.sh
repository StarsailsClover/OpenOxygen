#!/bin/bash
# OpenOxygen Verification Script

echo "=========================================="
echo "OpenOxygen Verification Script"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Function to check command
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        ((FAILED++))
    fi
}

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing"
        ((FAILED++))
    fi
}

# Function to check directory
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing"
        ((FAILED++))
    fi
}

echo ""
echo "Checking dependencies..."
echo "------------------------"
check_command node
check_command npm
check_command cargo
check_command rustc
check_command python3

echo ""
echo "Checking core files..."
echo "----------------------"
check_file "package.json"
check_file "tsconfig.json"
check_file "README.md"
check_file "LICENSE"

echo ""
echo "Checking source directories..."
echo "------------------------------"
check_dir "src/core"
check_dir "src/execution"
check_dir "src/inference"
check_dir "src/agent"
check_dir "src/memory"
check_dir "src/security"
check_dir "src/skills"
check_dir "src/compat"
check_dir "src/multimodal"
check_dir "src/browser"

echo ""
echo "Checking OLB..."
echo "---------------"
check_dir "OLB/src"
check_file "OLB/Cargo.toml"
check_file "OLB/README.md"

echo ""
echo "Checking documentation..."
echo "-------------------------"
check_file "docs/API.md"
check_file "docs/SKILLS.md"
check_file "ROADMAP_UNIFIED.md"
check_file "CHANGELOG.md"

echo ""
echo "Running TypeScript check..."
echo "---------------------------"
if npm run typecheck 2>&1 | grep -q "error TS"; then
    echo -e "${RED}✗${NC} TypeScript errors found"
    ((FAILED++))
else
    echo -e "${GREEN}✓${NC} TypeScript check passed"
    ((PASSED++))
fi

echo ""
echo "Running tests..."
echo "----------------"
if npm test 2>&1 | grep -q "FAIL"; then
    echo -e "${RED}✗${NC} Some tests failed"
    ((FAILED++))
else
    echo -e "${GREEN}✓${NC} Tests passed"
    ((PASSED++))
fi

echo ""
echo "=========================================="
echo "Verification Results"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed! ✓${NC}"
    exit 0
else
    echo -e "${YELLOW}Some checks failed. Please review.${NC}"
    exit 1
fi
