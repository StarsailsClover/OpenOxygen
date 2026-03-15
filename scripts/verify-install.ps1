# OpenOxygen Installation Verification Script
# Run this after installation to verify everything is working

param(
    [int]$Port = 4800
)

$ErrorActionPreference = "Stop"

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  OpenOxygen 26w13aB - Installation Verification              ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$tests = @()
$passed = 0
$failed = 0

function Test-Step($Name, $ScriptBlock) {
    Write-Host "Testing: $Name..." -NoNewline
    try {
        $result = & $ScriptBlock
        if ($result.Success) {
            Write-Host " ✅ PASS" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host " ❌ FAIL" -ForegroundColor Red
            Write-Host "   Error: $($result.Message)" -ForegroundColor Red
            $script:failed++
        }
        return $result
    } catch {
        Write-Host " ❌ FAIL" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        $script:failed++
        return @{ Success = $false; Message = $_ }
    }
}

# Test 1: Node.js
Test-Step "Node.js Installation" {
    $version = node --version 2>$null
    if ($version) {
        @{ Success = $true; Message = "Node.js $version" }
    } else {
        @{ Success = $false; Message = "Node.js not found" }
    }
}

# Test 2: Package.json exists
Test-Step "Package.json" {
    if (Test-Path "package.json") {
        @{ Success = $true }
    } else {
        @{ Success = $false; Message = "package.json not found" }
    }
}

# Test 3: Dependencies installed
Test-Step "Dependencies (node_modules)" {
    if (Test-Path "node_modules") {
        $count = (Get-ChildItem "node_modules" -Directory).Count
        @{ Success = $true; Message = "$count packages installed" }
    } else {
        @{ Success = $false; Message = "node_modules not found. Run: npm install" }
    }
}

# Test 4: Native module
Test-Step "Native Module" {
    try {
        $native = node -e "console.log(Object.keys(require('@openoxygen/core-native')).length)" 2>$null
        if ($native -and [int]$native -gt 0) {
            @{ Success = $true; Message = "$native functions available" }
        } else {
            @{ Success = $false; Message = "Native module not loaded" }
        }
    } catch {
        @{ Success = $false; Message = $_ }
    }
}

# Test 5: Configuration
Test-Step "Configuration (openoxygen.json)" {
    if (Test-Path "openoxygen.json") {
        try {
            $config = Get-Content "openoxygen.json" | ConvertFrom-Json
            @{ Success = $true; Message = "Version: $($config.version)" }
        } catch {
            @{ Success = $false; Message = "Invalid JSON" }
        }
    } else {
        @{ Success = $false; Message = "openoxygen.json not found" }
    }
}

# Test 6: Service running
Test-Step "Service Health (port $Port)" {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5
        if ($response.status -eq "ok") {
            @{ Success = $true; Message = "Gateway running" }
        } else {
            @{ Success = $false; Message = "Unexpected status: $($response.status)" }
        }
    } catch {
        @{ Success = $false; Message = "Service not responding. Run: .\start.bat" }
    }
}

# Test 7: LLM Inference
Test-Step "LLM Inference" {
    try {
        $body = '{"messages":[{"role":"user","content":"Say OK"}],"mode":"fast"}'
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/chat" `
            -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
        if ($response.content -and $response.model) {
            @{ Success = $true; Message = "$($response.model) responded in $($response.durationMs)ms" }
        } else {
            @{ Success = $false; Message = "Invalid response" }
        }
    } catch {
        @{ Success = $false; Message = "LLM test failed: $_" }
    }
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Verification Complete" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ Passed: $passed" -ForegroundColor Green
Write-Host "  ❌ Failed: $failed" -ForegroundColor Red
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "🎉 All tests passed! OpenOxygen is ready to use." -ForegroundColor Green
    Write-Host "   Dashboard: http://127.0.0.1:$Port" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⚠️  Some tests failed. Please check the errors above." -ForegroundColor Yellow
    Write-Host "   Documentation: https://github.com/StarsailsClover/OpenOxygen/blob/main/INSTALL.md" -ForegroundColor White
}

exit $failed
