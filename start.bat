@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title OpenOxygen 26w13aB
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                                                               ║
echo ║   OpenOxygen 26w13aB - Windows Native AI Agent Framework     ║
echo ║                                                               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: Get current directory (resolve any symlinks)
for %%I in ("%~dp0.") do set "INSTALL_DIR=%%~fI"
cd /d "%INSTALL_DIR%"

:: Set config path to current directory
echo [INFO] Installation directory: %INSTALL_DIR%
set "OPENOXYGEN_CONFIG_PATH=%INSTALL_DIR%\openoxygen.json"
set "OPENOXYGEN_STATE_DIR=%INSTALL_DIR%\.state"
echo [INFO] Config path: %OPENOXYGEN_CONFIG_PATH%
echo [INFO] State directory: %OPENOXYGEN_STATE_DIR%

:: Export for Node.js process
set OPENOXYGEN_CONFIG_PATH=%OPENOXYGEN_CONFIG_PATH%
set OPENOXYGEN_STATE_DIR=%OPENOXYGEN_STATE_DIR%

:: Check Node.js
echo.
echo [INFO] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo [INFO] Please install Node.js 22+ from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%a in ('node --version') do echo [INFO] Node.js: %%a

:: Check dependencies
if not exist "node_modules" (
    echo.
    echo [INFO] First run detected. Installing dependencies...
    echo [INFO] This may take 2-5 minutes...
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [INFO] Dependencies installed successfully
)

:: Check native module
echo.
echo [INFO] Checking native module...
if not exist "packages\core-native\index.js" (
    echo [ERROR] Native module index.js not found!
    pause
    exit /b 1
)
if not exist "packages\core-native\*.node" (
    echo [ERROR] Native binary (.node) not found!
    pause
    exit /b 1
)
echo [INFO] Native module found

:: Check config file
echo.
echo [INFO] Checking configuration...
if not exist "openoxygen.json" (
    echo [ERROR] openoxygen.json not found in %INSTALL_DIR%
    pause
    exit /b 1
)
echo [INFO] Configuration file found

:: Get configured port
for /f "tokens=*" %%a in ('node -e "console.log(JSON.parse(require('fs').readFileSync('openoxygen.json')).gateway.port)"') do set "CONFIG_PORT=%%a"
echo [INFO] Configured port: %CONFIG_PORT%

:: Check port availability
echo.
echo [INFO] Checking port %CONFIG_PORT% availability...
netstat -ano | findstr ":%CONFIG_PORT%" >nul
if not errorlevel 1 (
    echo [WARN] Port %CONFIG_PORT% is already in use!
    echo.
    echo [INFO] Trying to find available port...
    
    set "NEW_PORT="
    for /L %%p in (4801,1,4810) do (
        if not defined NEW_PORT (
            netstat -ano | findstr ":%%p" >nul
            if errorlevel 1 (
                set "NEW_PORT=%%p"
            )
        )
    )
    
    if defined NEW_PORT (
        echo [INFO] Found available port: %NEW_PORT%
        echo [INFO] Updating configuration file...
        node -e "const fs=require('fs'); const c=JSON.parse(fs.readFileSync('openoxygen.json')); c.gateway.port=%NEW_PORT%; fs.writeFileSync('openoxygen.json', JSON.stringify(c,null,2));"
        echo [INFO] Port updated to %NEW_PORT%
        set "CONFIG_PORT=%NEW_PORT%"
    ) else (
        echo [ERROR] No available port found (4800-4810 all in use)
        echo [INFO] Please close other applications or manually edit openoxygen.json
        pause
        exit /b 1
    )
) else (
    echo [INFO] Port %CONFIG_PORT% is available
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo [INFO] Starting OpenOxygen...
echo [INFO] Dashboard URL: http://127.0.0.1:%CONFIG_PORT%
echo [INFO] Press Ctrl+C to stop
echo ═══════════════════════════════════════════════════════════════
echo.

:: Start the service
node dist\entry.js

set "EXIT_CODE=%ERRORLEVEL%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [ERROR] OpenOxygen exited with code %EXIT_CODE%
    echo.
    echo [TROUBLESHOOTING]
    echo 1. Check logs in .state\ directory
    echo 2. Ensure Ollama is running: ollama ps
    echo 3. Check port availability: netstat -ano ^| findstr :%CONFIG_PORT%
    echo 4. Try running as Administrator
    echo.
    echo [DOCUMENTATION] https://github.com/yourusername/openoxygen/blob/main/INSTALL.md
    echo.
    pause
)

exit /b %EXIT_CODE%
