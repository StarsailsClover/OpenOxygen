@echo off
setlocal enabledelayedexpansion

echo === OpenOxygen Native Manual Build ===
echo.

:: ?? VS ??
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"

:: ????
set "VCTools=C:\Program Files\Microsoft Visual Studio\18\Community\VC\Tools\MSVC\14.50.35717"
set "WinSDK=C:\Program Files (x86)\Windows Kits\10"
set "NodeHeaders=C:\Users\Sails\AppData\Local\node-gyp\Cache\22.18.0\include\node"
set "NAPI=D:\Coding\OpenOxygen\native\node_modules\node-addon-api"
set "NodeLib=C:\Users\Sails\AppData\Local\node-gyp\Cache\22.18.0\x64"

:: ??????
if not exist "build\Release" mkdir "build\Release"

:: ????
set "INCLUDES=/I"include" /I"%NodeHeaders%" /I"%NAPI%" /I"%VCTools%\include" /I"%WinSDK%\Include\10.0.22621.0\ucrt" /I"%WinSDK%\Include\10.0.22621.0\um" /I"%WinSDK%\Include\10.0.22621.0\shared""
set "FLAGS=/c /EHsc /O2 /MD /DNAPI_DISABLE_CPP_EXCEPTIONS /DNAPI_VERSION=8"

:: ?????
echo Compiling core.cpp...
cl.exe %FLAGS% %INCLUDES% /Fo"build\Release\core.obj" "cpp\core\core.cpp"
if errorlevel 1 goto error

echo Compiling input_controller.cpp...
cl.exe %FLAGS% %INCLUDES% /Fo"build\Release\input_controller.obj" "cpp\input\input_controller.cpp"
if errorlevel 1 goto error

echo Compiling binding.cpp...
cl.exe %FLAGS% %INCLUDES% /Fo"build\Release\binding.obj" "binding.cpp"
if errorlevel 1 goto error

:: ??
echo Linking...
link.exe /DLL /OUT:"build\Release\openoxygen_native.node" "build\Release\core.obj" "build\Release\input_controller.obj" "build\Release\binding.obj" /LIBPATH:"%VCTools%\lib\x64" /LIBPATH:"%WinSDK%\Lib\10.0.22621.0\ucrt\x64" /LIBPATH:"%WinSDK%\Lib\10.0.22621.0\um\x64" /LIBPATH:"%NodeLib%" user32.lib kernel32.lib node.lib
if errorlevel 1 goto error

echo.
echo === Build Success ===
echo Output: build\Release\openoxygen_native.node
goto end

:error
echo.
echo === Build Failed ===

:end
pause
