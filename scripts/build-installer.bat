@echo off
REM Build OpenOxygen Installer
REM Creates NSIS installer for Windows

echo ==========================================
echo OpenOxygen Installer Builder
echo Version: 26w14a-main-26.113.0
echo ==========================================
echo.

cd /d "%~dp0\.."

REM Step 1: Build TypeScript
echo [1/5] Building TypeScript...
npm run build:ts
if %errorlevel% neq 0 (
    echo TypeScript build failed!
    pause
    exit /b 1
)
echo.

REM Step 2: Copy files to dist
echo [2/5] Preparing distribution files...
if not exist "dist" mkdir dist
xcopy /s /e /y /i "src\skills" "dist\skills\" >nul 2>&1
xcopy /s /e /y /i "src\types" "dist\types\" >nul 2>&1
copy "openoxygen.mjs" "dist\" >nul 2>&1
copy "package.json" "dist\" >nul 2>&1
copy "README.md" "dist\" >nul 2>&1
copy "LICENSE" "dist\" >nul 2>&1
copy "VERSION.txt" "dist\" >nul 2>&1
echo.

REM Step 3: Build OLB (optional)
echo [3/5] Building OLB (optional)...
if exist "OLB\Cargo.toml" (
    cd OLB
    cargo build --release --no-default-features 2>nul
    if %errorlevel% equ 0 (
        echo OLB build successful
        copy "target\release\olb_core.dll" "..\dist\" >nul 2>&1
    ) else (
        echo OLB build skipped (optional)
    )
    cd ..
) else (
    echo OLB not found, skipping
)
echo.

REM Step 4: Build NSIS installer
echo [4/5] Building installer...
if exist "C:\Program Files (x86)\NSIS\makensis.exe" (
    "C:\Program Files (x86)\NSIS\makensis.exe" "scripts\build-installer.nsi"
    if %errorlevel% neq 0 (
        echo NSIS build failed!
        pause
        exit /b 1
    )
) else if exist "C:\Program Files\NSIS\makensis.exe" (
    "C:\Program Files\NSIS\makensis.exe" "scripts\build-installer.nsi"
    if %errorlevel% neq 0 (
        echo NSIS build failed!
        pause
        exit /b 1
    )
) else (
    echo NSIS not found! Please install NSIS from https://nsis.sourceforge.io/
    pause
    exit /b 1
)
echo.

REM Step 5: Verify output
echo [5/5] Verifying installer...
if exist "OpenOxygen-Setup.exe" (
    echo.
    echo ==========================================
    echo Installer created successfully!
    echo ==========================================
    echo.
    echo File: OpenOxygen-Setup.exe
    for %%I in (OpenOxygen-Setup.exe) do (
        echo Size: %%~zI bytes
    )
    echo.
    echo Ready for distribution!
) else (
    echo ERROR: Installer not found!
    pause
    exit /b 1
)

echo.
pause
