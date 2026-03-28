@echo off
chcp 65001 >nul
title OpenOxygen 26w13aB

echo.
echo =========================================
echo   OpenOxygen 26w13aB
echo   Windows Native AI Agent Framework  
echo =========================================
echo.

:: Check for verify flag
if "%1"=="--verify" (
    echo [INFO] Running installation verification...
    powershell -ExecutionPolicy Bypass -File "%~dp0scripts\verify-install.ps1"
    exit /b %ERRORLEVEL%
)

:: Set environment variables
set "OPENOXYGEN_CONFIG_PATH=%~dp0openoxygen.json"
set "OPENOXYGEN_STATE_DIR=%~dp0.state"

echo [INFO] Config: %OPENOXYGEN_CONFIG_PATH%

:: Check Node.js
echo.
echo [INFO] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo [INFO] Please install from https://nodejs.org/
    pause
    exit /b 1
)
node --version

:: Install dependencies if needed
if not exist "node_modules" (
    echo.
    echo [INFO] Installing dependencies (first run)...
    echo [INFO] This may take 2-5 minutes...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

:: Check native module
echo.
echo [INFO] Checking native module...
if not exist "packages\core-native\*.node" (
    echo [ERROR] Native module not found!
    pause
    exit /b 1
)
echo [INFO] Native module found

:: Get current port from config
for /f "tokens=*" %%a in ('node -e "console.log(JSON.parse(require('fs').readFileSync('openoxygen.json')).gateway.port)"') do set "CURRENT_PORT=%%a"
echo [INFO] Configured port: %CURRENT_PORT%

:: Check port availability
echo.
echo [INFO] Checking port %CURRENT_PORT%...
netstat -ano | findstr ":%CURRENT_PORT%" >nul
if not errorlevel 1 (
    echo [WARN] Port %CURRENT_PORT% is in use!
    
    :: Find available port
    for /L %%p in (4801,1,4810) do (
        netstat -ano | findstr ":%%p" >nul
        if errorlevel 1 (
            echo [INFO] Switching to port: %%p
            node -e "const fs=require('fs'); const c=JSON.parse(fs.readFileSync('openoxygen.json')); c.gateway.port=%%p; fs.writeFileSync('openoxygen.json', JSON.stringify(c,null,2));"
            set "CURRENT_PORT=%%p"
            goto :port_ready
        )
    )
    echo [ERROR] No available port found!
    pause
    exit /b 1
)

:port_ready
echo [INFO] Using port: %CURRENT_PORT%

echo.
echo =========================================
echo [INFO] Starting OpenOxygen...
echo [INFO] Dashboard: http://127.0.0.1:%CURRENT_PORT%
echo =========================================
echo.

node dist\entry.js

if errorlevel 1 (
    echo.
    echo [ERROR] OpenOxygen failed to start
    echo.
    echo [TROUBLESHOOTING]
    echo 1. Check logs in .state\ directory
    echo 2. Run verification: start.bat --verify
    echo 3. Documentation: https://github.com/StarsailsClover/OpenOxygen/blob/main/INSTALL.md
    echo.
    pause
)
