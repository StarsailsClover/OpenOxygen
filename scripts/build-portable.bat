@echo off
REM Build OpenOxygen Portable Version
REM Creates a portable ZIP distribution

echo ==========================================
echo OpenOxygen Portable Builder
echo Version: 26w14a-main-26.113.0
echo ==========================================
echo.

cd /d "%~dp0\.."

set PORTABLE_DIR=OpenOxygen-Portable
set OUTPUT_ZIP=OpenOxygen-26w14a-Portable.zip

echo [1/4] Cleaning previous build...
if exist "%PORTABLE_DIR%" rmdir /s /q "%PORTABLE_DIR%"
if exist "%OUTPUT_ZIP%" del "%OUTPUT_ZIP%"
echo.

echo [2/4] Building TypeScript...
npm run build:ts
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo.

echo [3/4] Creating portable directory...
mkdir "%PORTABLE_DIR%"

REM Copy core files
xcopy /s /e /y /i "dist" "%PORTABLE_DIR%\" >nul
copy "openoxygen.mjs" "%PORTABLE_DIR%\" >nul
copy "package.json" "%PORTABLE_DIR%\" >nul
copy "README.md" "%PORTABLE_DIR%\" >nul
copy "LICENSE" "%PORTABLE_DIR%\" >nul
copy "VERSION.txt" "%PORTABLE_DIR%\" >nul

REM Create start script
echo @echo off > "%PORTABLE_DIR%\Start OpenOxygen.bat"
echo cd /d "%%~dp0" >> "%PORTABLE_DIR%\Start OpenOxygen.bat"
echo node openoxygen.mjs >> "%PORTABLE_DIR%\Start OpenOxygen.bat"
echo pause >> "%PORTABLE_DIR%\Start OpenOxygen.bat"

REM Create README for portable version
echo # OpenOxygen Portable > "%PORTABLE_DIR%\PORTABLE-README.txt"
echo. >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo Version: 26w14a-main-26.113.0 >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo. >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo ## Quick Start >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo 1. Double-click "Start OpenOxygen.bat" >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo 2. Or run: node openoxygen.mjs >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo. >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo ## Requirements >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo - Node.js 18+ >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo - Windows 10/11 >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo. >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo ## Note >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo This is a portable version. No installation required. >> "%PORTABLE_DIR%\PORTABLE-README.txt"
echo All data is stored in the application folder. >> "%PORTABLE_DIR%\PORTABLE-README.txt"

echo.

echo [4/4] Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%PORTABLE_DIR%' -DestinationPath '%OUTPUT_ZIP%' -Force"

if exist "%OUTPUT_ZIP%" (
    echo.
    echo ==========================================
    echo Portable version created!
    echo ==========================================
    echo.
    echo File: %OUTPUT_ZIP%
    for %%I in (%OUTPUT_ZIP%) do (
        echo Size: %%~zI bytes
    )
    echo.
    echo Contents:
    echo   - Core application
    echo   - All skills
    echo   - Start script
    echo   - Documentation
    echo.
    echo Ready for distribution!
    
    REM Cleanup
    rmdir /s /q "%PORTABLE_DIR%"
) else (
    echo ERROR: Failed to create ZIP!
    pause
    exit /b 1
)

echo.
pause
