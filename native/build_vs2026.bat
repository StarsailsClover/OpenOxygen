@echo off
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat" x64
cd /d "D:\Coding\OpenOxygen\native"
set MSVS_VERSION=2022
npm run build
