; OpenOxygen Installer Script
; NSIS Installer for Windows

!include "MUI2.nsh"
!include "LogicLib.nsh"

; General
Name "OpenOxygen"
OutFile "OpenOxygen-Setup.exe"
InstallDir "$PROGRAMFILES64\OpenOxygen"
InstallDirRegKey HKCU "Software\OpenOxygen" ""
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"

; Sections
Section "OpenOxygen Core" SecCore
  SectionIn RO
  
  SetOutPath "$INSTDIR"
  
  ; Main files
  File /r "..\dist\*.*"
  File "..\openoxygen.mjs"
  File "..\package.json"
  File "..\README.md"
  File "..\LICENSE"
  
  ; Create directories
  CreateDirectory "$INSTDIR\skills"
  CreateDirectory "$INSTDIR\workspaces"
  CreateDirectory "$INSTDIR\logs"
  
  ; Write registry
  WriteRegStr HKCU "Software\OpenOxygen" "" $INSTDIR
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\OpenOxygen"
  CreateShortcut "$SMPROGRAMS\OpenOxygen\OpenOxygen.lnk" "$INSTDIR\openoxygen.mjs"
  CreateShortcut "$SMPROGRAMS\OpenOxygen\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\OpenOxygen.lnk" "$INSTDIR\openoxygen.mjs"
  
SectionEnd

Section "Node.js Runtime" SecNode
  ; Check if Node.js is installed
  nsExec::ExecToStack "node --version"
  Pop $0
  ${If} $0 != 0
    ; Download and install Node.js
    DetailPrint "Downloading Node.js..."
    inetc::get "https://nodejs.org/dist/v22.0.0/node-v22.0.0-x64.msi" "$TEMP\nodejs.msi"
    ExecWait "msiexec /i $TEMP\nodejs.msi /qn"
    Delete "$TEMP\nodejs.msi"
  ${Else}
    DetailPrint "Node.js already installed"
  ${EndIf}
SectionEnd

Section "Ollama Integration" SecOllama
  ; Check if Ollama is installed
  IfFileExists "$LOCALAPPDATA\Programs\Ollama\ollama.exe" OllamaExists
    DetailPrint "Ollama not found. Please install manually from https://ollama.com"
    MessageBox MB_OK "Ollama not detected. Please install from https://ollama.com to use local models."
  OllamaExists:
    DetailPrint "Ollama found"
SectionEnd

Section "Desktop Shortcut" SecDesktop
  CreateShortcut "$DESKTOP\OpenOxygen.lnk" "$INSTDIR\openoxygen.mjs"
SectionEnd

; Uninstaller
Section "Uninstall"
  ; Remove files
  RMDir /r "$INSTDIR\dist"
  RMDir /r "$INSTDIR\skills"
  RMDir /r "$INSTDIR\workspaces"
  RMDir /r "$INSTDIR\logs"
  
  Delete "$INSTDIR\openoxygen.mjs"
  Delete "$INSTDIR\package.json"
  Delete "$INSTDIR\README.md"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\Uninstall.exe"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\OpenOxygen\OpenOxygen.lnk"
  Delete "$SMPROGRAMS\OpenOxygen\Uninstall.lnk"
  RMDir "$SMPROGRAMS\OpenOxygen"
  Delete "$DESKTOP\OpenOxygen.lnk"
  
  ; Remove registry
  DeleteRegKey HKCU "Software\OpenOxygen"
  
  ; Remove install directory
  RMDir "$INSTDIR"
SectionEnd

; Descriptions
LangString DESC_SecCore ${LANG_ENGLISH} "OpenOxygen core files and runtime"
LangString DESC_SecNode ${LANG_ENGLISH} "Node.js runtime (required if not already installed)"
LangString DESC_SecOllama ${LANG_ENGLISH} "Check for Ollama local LLM support"
LangString DESC_SecDesktop ${LANG_ENGLISH} "Create desktop shortcut"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecCore} $(DESC_SecCore)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecNode} $(DESC_SecNode)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecOllama} $(DESC_SecOllama)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
!insertmacro MUI_FUNCTION_DESCRIPTION_END
