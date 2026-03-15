@echo off
chcp 65001 >nul
title OpenOxygen 26w13aB

echo.
echo =========================================
echo   OpenOxygen 26w13aB
echo   Windows Native AI Agent Framework  
echo =========================================
echo.

:: Set environment variables
set "OPENOXYGEN_CONFIG_PATH=%~dp0openoxygen.json"
set "OPENOXYGEN_STATE_DIR=%~dp0.state"

echo [INFO] Config: %OPENOXYGEN_CONFIG_PATH%

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found
    pause
    exit /b 1
)

:: Install dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
    if errorlevel 1 (
        echo [ERROR] Install failed
        pause
        exit /b 1
    )
)

:: Check native module
if not exist "packages\core-native\*.node" (
    echo [ERROR] Native module not found
    pause
    exit /b 1
)

echo [INFO] Starting OpenOxygen...
echo [INFO] Dashboard: http://127.0.0.1:4800
echo.

node dist\entry.js

if errorlevel 1 (
    echo [ERROR] Failed to start
    pause
)
