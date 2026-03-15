@echo off
chcp 65001 >nul
title OpenOxygen 26w13aB
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                                                               ║
echo ║   OpenOxygen 26w13aB - Windows Native AI Agent Framework     ║
echo ║                                                               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 22+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Check Ollama (optional but recommended)
ollama --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama not found. Local models will not be available.
    echo           Install from https://ollama.com for local LLM support.
    echo.
)

:: Install dependencies if node_modules missing
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Build if dist missing
if not exist "dist" (
    echo [INFO] Building OpenOxygen...
    npm run build
    if errorlevel 1 (
        echo [ERROR] Failed to build
        pause
        exit /b 1
    )
)

:: Check native module
if not exist "packages\core-native\index.js" (
    echo [INFO] Building native module...
    cd packages\core-native
    cargo build --release
    cd ..\..
    if errorlevel 1 (
        echo [ERROR] Failed to build native module
        echo           Make sure Rust is installed: https://rustup.rs/
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting OpenOxygen...
echo [INFO] Dashboard will be available at: http://127.0.0.1:4800
echo [INFO] Press Ctrl+C to stop
echo.

:: Start the service
node dist\entry.js

if errorlevel 1 (
    echo.
    echo [ERROR] OpenOxygen failed to start
    echo [INFO] Check logs in .state\ directory
    pause
)
