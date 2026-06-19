; Script NSIS - Instalação do Blue Clinic Server
; Compilar com: makensis blue-clinic-server.nsi

!include "MUI2.nsh"
!include "x64.nsh"
!include "LogicLib.nsh"

; ==================== DEFINIÇÕES ====================
!define APP_NAME "Blue Clinic Server"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "BlueClinic"
!define SERVICE_NAME "BlueClinicServer"
!define NODE_MSI "node-v24-x64.msi"
!define NODE_MIN_MAJOR "24"

; ==================== CONFIGURAÇÕES GERAIS ====================
Name "${APP_NAME} ${APP_VERSION}"
OutFile "BlueClinicServer-Setup-${APP_VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "Software\${APP_NAME}" "InstallDir"
RequestExecutionLevel admin
Unicode True

; ==================== INTERFACE ====================
!define MUI_ABORTWARNING
!define MUI_ICON "blue-clinic-server-icon.ico"
!define MUI_UNICON "blue-clinic-server-icon.ico"

; ==================== PÁGINAS ====================
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

; ==================== VARIÁVEIS ====================
Var NodeMajorVersion
Var NeedsNodeInstall
Var Pm2Path

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

; ==================== FUNÇÃO: CHECAR NODE ====================
Function CheckNodeVersion
    StrCpy $NeedsNodeInstall "1"

    nsExec::ExecToStack 'cmd /c node -v'
    Pop $0 ; exit code
    Pop $1 ; output, ex: "v22.11.0"

    ${If} $0 == 0
        StrCpy $1 $1 "" 1
        Push $1
        Call ExtractMajorVersion
        Pop $NodeMajorVersion

        DetailPrint "Node detectado: versão major $NodeMajorVersion"

        IntCmp $NodeMajorVersion ${NODE_MIN_MAJOR} node_ok node_old node_ok
        node_old:
            DetailPrint "Versão do Node é antiga (< ${NODE_MIN_MAJOR}). Será atualizada para a LTS."
            Goto node_check_done
        node_ok:
            StrCpy $NeedsNodeInstall "0"
            DetailPrint "Versão do Node é compatível (>= ${NODE_MIN_MAJOR}). Reinstalação não necessária."
        node_check_done:
    ${Else}
        DetailPrint "Node não encontrado no sistema."
    ${EndIf}
FunctionEnd

Function ExtractMajorVersion
    Exch $0
    Push $1
    Push $2
    Push $3
    StrCpy $2 0
    StrCpy $1 ""

    loop:
        StrCpy $3 $0 1 $2
        ${If} $3 == "."
            Goto done
        ${EndIf}
        ${If} $3 == ""
            Goto done
        ${EndIf}
        StrCpy $1 "$1$3"
        IntOp $2 $2 + 1
        Goto loop

    done:
        StrCpy $0 $1
        Pop $3
        Pop $2
        Pop $1
        Exch $0
FunctionEnd

Function TrimTrailingNewline
    Exch $0
    Push $1

    StrCpy $1 $0 1 -1
    ${If} $1 == "$\n"
        StrCpy $0 $0 -1
    ${EndIf}

    StrCpy $1 $0 1 -1
    ${If} $1 == "$\r"
        StrCpy $0 $0 -1
    ${EndIf}

    Pop $1
    Exch $0
FunctionEnd

; ==================== INSTALAÇÃO ====================
Section "Instalar"
    SetOutPath "$INSTDIR"

    File "server.js"
    File "nssm.exe"
    File "blue-clinic-server-icon.ico"
    File ".env"
    File "${NODE_MSI}"

    CreateDirectory "$INSTDIR\logs"

    WriteRegStr HKLM "Software\${APP_NAME}" "InstallDir" "$INSTDIR"
    WriteRegStr HKLM "Software\${APP_NAME}" "Version" "${APP_VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon" "$INSTDIR\blue-clinic-server-icon.ico"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1

    WriteUninstaller "$INSTDIR\uninstall.exe"

    ; ---------- NODE.JS ----------
    Call CheckNodeVersion

    ${If} $NeedsNodeInstall == "1"
        DetailPrint "Instalando Node.js LTS..."
        nsExec::ExecToLog 'msiexec /i "$INSTDIR\${NODE_MSI}" /qn /norestart'
        Pop $0
        ${If} $0 != 0
            MessageBox MB_OK|MB_ICONSTOP "Falha ao instalar o Node.js (código $0). Abortando instalação."
            Abort
        ${EndIf}

        StrCpy $0 "$PROGRAMFILES64\nodejs"
        System::Call 'Kernel32::SetEnvironmentVariable(t "PATH", t "$0;$%PATH%") i'
    ${EndIf}

    Delete "$INSTDIR\${NODE_MSI}"

    ; ---------- SERVIÇO EXISTENTE ----------
    nsExec::ExecToStack '"$INSTDIR\nssm.exe" status ${SERVICE_NAME}'
    Pop $0
    ${If} $0 == 0
        DetailPrint "Serviço ${SERVICE_NAME} já existe. Parando e removendo antes de reinstalar..."
        nsExec::ExecToLog 'net stop ${SERVICE_NAME}'
        Sleep 2000
        nsExec::ExecToLog '"$INSTDIR\nssm.exe" remove ${SERVICE_NAME} confirm'
    ${EndIf}

    ; ---------- PM2 ----------
    DetailPrint "Instalando PM2 globalmente (requer internet)..."
    nsExec::ExecToLog 'cmd /c npm install -g pm2'
    Pop $0
    ${If} $0 != 0
        MessageBox MB_OK|MB_ICONSTOP "Falha ao instalar o PM2 (código $0). Verifique a conexão com a internet."
        Abort
    ${EndIf}

    ; ---------- SERVIÇO WINDOWS (NSSM + pm2 start --no-daemon) ----------
    DetailPrint "Instalando serviço ${SERVICE_NAME}..."

    nsExec::ExecToStack 'cmd /c npm prefix -g'
    Pop $0
    Pop $1

    Push $1
    Call TrimTrailingNewline
    Pop $1

    ; Alterado para buscar o pm2.cmd padrão
    StrCpy $Pm2Path "$1\pm2.cmd"

    IfFileExists "$Pm2Path" pm2_found pm2_missing
    pm2_missing:
        MessageBox MB_OK|MB_ICONSTOP "pm2.cmd não encontrado em $Pm2Path. Instalação abortada."
        Abort
    pm2_found:

    ; Modificado o comando de inicialização do NSSM para usar "pm2 start server.js --no-daemon"
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" install ${SERVICE_NAME} "$WINDIR\System32\cmd.exe" "/c $\"$Pm2Path$\" start server.js -i max --no-daemon"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppDirectory "$INSTDIR"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} Start SERVICE_AUTO_START'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppRestartDelay 5000'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} Description "Servidor Blue Clinic - Sistema de Gestão Clínica (via PM2)"'

    DetailPrint "Configurando logs..."
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStdout "$INSTDIR\logs\service.log"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStderr "$INSTDIR\logs\error.log"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStdoutCreationDisposition 4'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppStderrCreationDisposition 4'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppRotateFiles 1'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppRotateOnline 1'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set ${SERVICE_NAME} AppRotateBytes 5242880'

    DetailPrint "Iniciando serviço..."
    nsExec::ExecToLog 'net start ${SERVICE_NAME}'
    Pop $0
    ${If} $0 != 0
        MessageBox MB_OK|MB_ICONEXCLAMATION "O serviço foi instalado, mas falhou ao iniciar (código $0). Verifique $INSTDIR\logs\error.log."
    ${EndIf}
SectionEnd

; ==================== DESINSTALAÇÃO ====================
Section "Uninstall"
    DetailPrint "Parando serviço ${SERVICE_NAME}..."
    nsExec::ExecToLog 'net stop ${SERVICE_NAME}'
    Sleep 3000

    DetailPrint "Removendo serviço..."
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" remove ${SERVICE_NAME} confirm'

    Delete "$INSTDIR\server.js"
    Delete "$INSTDIR\nssm.exe"
    Delete "$INSTDIR\blue-clinic-server-icon.ico"
    Delete "$INSTDIR\.env"
    Delete "$INSTDIR\uninstall.exe"
    Delete "$INSTDIR\logs\*.log"
    RMDir "$INSTDIR\logs"
    RMDir "$INSTDIR"

    SetRegView 64
    DeleteRegKey HKLM "Software\${APP_NAME}"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd