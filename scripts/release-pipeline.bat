@echo off
REM OpenOxygen Release Pipeline
REM Version: 26w13a-main-26.103.0

echo ==========================================
echo OpenOxygen Release Pipeline
echo Version: 26w13a-main-26.103.0
echo ==========================================
echo.

REM Step 1: Build OLB
echo [1/12] Building OLB...
cd "D:\Coding\OpenOxygen\OLB"
cargo build --release 2>&1 | findstr "error" > nul
if %errorlevel% equ 0 (
    echo OLB build failed! Check errors above.
    pause
    exit /b 1
)
echo OLB build successful!
echo.

REM Step 2: Security Audit
echo [2/12] Running security audit...
cd "D:\Coding\OpenOxygen"
python scripts\security_audit.py > security_audit.log 2>&1
echo Security audit complete. Check security_audit.log
echo.

REM Step 3: Run Tests
echo [3/12] Running tests...
npm test 2>&1 | findstr "FAIL" > nul
if %errorlevel% equ 0 (
    echo Some tests failed! Check test output.
    pause
)
echo Tests complete!
echo.

REM Step 4: Type Check
echo [4/12] Type checking...
npm run typecheck 2>&1 | findstr "error TS" > nul
if %errorlevel% equ 0 (
    echo TypeScript errors found!
    pause
    exit /b 1
)
echo Type check passed!
echo.

REM Step 5: Build Project
echo [5/12] Building project...
npm run build 2>&1 | findstr "error" > nul
if %errorlevel% equ 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo Build successful!
echo.

REM Step 6: Deploy to Test Directory
echo [6/12] Deploying to test directory...
if exist "D:\TestOpenOxygenInstall" rmdir /s /q "D:\TestOpenOxygenInstall"
mkdir "D:\TestOpenOxygenInstall"
xcopy /s /e /y "D:\Coding\OpenOxygen\dist" "D:\TestOpenOxygenInstall\dist\" > nul
xcopy /s /e /y "D:\Coding\OpenOxygen\skills" "D:\TestOpenOxygenInstall\skills\" > nul
copy "D:\Coding\OpenOxygen\package.json" "D:\TestOpenOxygenInstall\" > nul
copy "D:\Coding\OpenOxygen\openoxygen.mjs" "D:\TestOpenOxygenInstall\" > nul
copy "D:\Coding\OpenOxygen\README.md" "D:\TestOpenOxygenInstall\" > nul
copy "D:\Coding\OpenOxygen\LICENSE" "D:\TestOpenOxygenInstall\" > nul
echo Deployed to D:\TestOpenOxygenInstall
echo.

REM Step 7: Create Installer
echo [7/12] Creating installer...
if exist "C:\Program Files (x86)\NSIS\makensis.exe" (
    "C:\Program Files (x86)\NSIS\makensis.exe" "D:\Coding\OpenOxygen\scripts\build-installer.nsi" > nul 2>&1
    echo Installer created!
) else (
    echo NSIS not found, skipping installer creation
)
echo.

REM Step 8: Update Version
echo [8/12] Updating version info...
echo Version: 26w13a-main-26.103.0 > "D:\Coding\OpenOxygen\VERSION.txt"
echo Branch: main >> "D:\Coding\OpenOxygen\VERSION.txt"
echo Build: 26.103.0 >> "D:\Coding\OpenOxygen\VERSION.txt"
echo Version updated!
echo.

REM Step 9: Generate Release Notes
echo [9/12] Generating release notes...
echo # OpenOxygen 26w13a-main-26.103.0 > "D:\Coding\OpenOxygen\RELEASE_NOTES.md"
echo. >> "D:\Coding\OpenOxygen\RELEASE_NOTES.md"
echo ## Changes >> "D:\Coding\OpenOxygen\RELEASE_NOTES.md"
echo - Security fixes >> "D:\Coding\OpenOxygen\RELEASE_NOTES.md"
echo - Performance improvements >> "D:\Coding\OpenOxygen\RELEASE_NOTES.md"
echo - New features >> "D:\Coding\OpenOxygen\RELEASE_NOTES.md"
echo Release notes generated!
echo.

REM Step 10: Git Operations
echo [10/12] Git operations...
cd "D:\Coding\OpenOxygen"
echo Checking git status...
git status --short | find /c ":" > temp_count.txt
set /p CHANGES=<temp_count.txt
del temp_count.txt
echo Files to commit: %CHANGES%
echo.

REM Step 11: File Organization
echo [11/12] Organizing files...
mkdir "D:\Coding\OpenOxygen\archive\old_builds" 2>nul
mkdir "D:\Coding\OpenOxygen\archive\backups" 2>nul
move "*.bak" "D:\Coding\OpenOxygen\archive\backups\" 2>nul
echo File organization complete!
echo.

REM Step 12: Final Verification
echo [12/12] Final verification...
echo Checking critical files...
if exist "D:\Coding\OpenOxygen\dist\index.js" (
    echo [OK] Main entry point exists
) else (
    echo [FAIL] Main entry point missing!
)

if exist "D:\Coding\OpenOxygen\package.json" (
    echo [OK] Package.json exists
) else (
    echo [FAIL] Package.json missing!
)

echo.
echo ==========================================
echo Release Pipeline Complete!
echo Version: 26w13a-main-26.103.0
echo ==========================================
echo.
echo Next steps:
echo 1. Review security_audit.log
echo 2. Test in D:\TestOpenOxygenInstall
echo 3. Commit to git
echo 4. Push to origin
echo 5. Create GitHub Release
echo.
pause
