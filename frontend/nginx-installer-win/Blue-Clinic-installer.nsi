; Script NSIS - Instalação do Blue Clinic (Nginx)
; Compilar com: makensis Blue-Clinic-installer.nsi

!include "MUI2.nsh"
!include "x64.nsh"

; ==================== DEFINIÇÕES ====================
!define APP_NAME "Blue Clinic"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "BlueERP"
!define SERVICE_NAME "BlueClinicApp"

; ==================== CONFIGURAÇÕES GERAIS ====================
Name "${APP_NAME} ${APP_VERSION}"
OutFile "App-Blue-Clinic-Setup-${APP_VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "Software\${APP_NAME}" "InstallDir"
RequestExecutionLevel admin
Unicode True

; ==================== INTERFACE ====================
!define MUI_ABORTWARNING
!define MUI_ICON "app-blue-clinic-icon.ico"
!define MUI_UNICON "app-blue-clinic-icon.ico"

; ==================== PÁGINAS ====================
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

; ==================== INIT ====================
Function .onInit
    ${If} ${RunningX64}
        SetRegView 64
        StrCpy $INSTDIR "$PROGRAMFILES64\${APP_NAME}"
    ${Else}
        MessageBox MB_OK|MB_ICONSTOP "Este instalador requer Windows 64-bit."
        Abort
    ${EndIf}
FunctionEnd

; ==================== INSTALAÇÃO ====================
Section
    SetOutPath "$INSTDIR\nginx"
    File /r "nginx\*.*"

    SetOutPath "$INSTDIR\nginx\html\frontend"
    File /r "dist\frontend\browser\*.*"

    SetOutPath "$INSTDIR"
    File "nssm.exe"
    File "app-blue-clinic-icon.ico"

    CreateDirectory "$INSTDIR\logs"

    WriteRegStr HKLM "Software\${APP_NAME}" "InstallDir" "$INSTDIR"
    WriteRegStr HKLM "Software\${APP_NAME}" "Version" "${APP_VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon" "$INSTDIR\app-blue-clinic-icon.ico"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1

    WriteUninstaller "$INSTDIR\uninstall.exe"

    DetailPrint "Instalando serviço ${SERVICE_NAME}..."
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" install ${SERVICE_NAME} "$INSTDIR\nginx\nginx.exe"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppDirectory "$INSTDIR\nginx"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} Start SERVICE_AUTO_START'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppRestartDelay 5000'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} Description "Servidor Blue Clinic (Nginx)"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStopMethodSkip 6'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStdout "$INSTDIR\logs\service.log"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStderr "$INSTDIR\logs\error.log"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStdoutCreationDisposition 4'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStderrCreationDisposition 4'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppRotateFiles 1'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppRotateOnline 1'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppRotateBytes 5242880'

    DetailPrint "Iniciando serviço..."
    nsExec::ExecToLog 'net start ${SERVICE_NAME}'
SectionEnd

; ==================== DESINSTALAÇÃO ====================
Section "Uninstall"
    DetailPrint "Parando serviço ${SERVICE_NAME}..."
    nsExec::ExecToLog 'net stop ${SERVICE_NAME}'
    Sleep 3000

    DetailPrint "Removendo serviço..."
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" remove ${SERVICE_NAME} confirm'

    Delete "$INSTDIR\nssm.exe"
    Delete "$INSTDIR\app-blue-clinic-icon.ico"
    Delete "$INSTDIR\uninstall.exe"
    Delete "$INSTDIR\logs\*.log"
    RMDir "$INSTDIR\logs"
    RMDir /r "$INSTDIR\nginx"
    RMDir "$INSTDIR"

    SetRegView 64
    DeleteRegKey HKLM "Software\${APP_NAME}"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd