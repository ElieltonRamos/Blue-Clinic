#!/bin/bash

set -e

echo "================================================"
echo "  Blue Clinic - Build do Instalador NSIS"
echo "================================================"
echo ""

if ! command -v makensis &> /dev/null; then
    echo "ERRO: NSIS não está instalado."
    echo "Instale com: sudo apt install nsis"
    exit 1
fi

REQUIRED_PATHS=(
    "nssm.exe"
    "app-blue-clinic-icon.ico"
    "LICENSE.txt"
    "Blue-Clinic-installer.nsi"
    "nginx/nginx.exe"
    "nginx/conf/nginx.conf"
    "dist/frontend/browser"
)

echo "Verificando arquivos necessários..."
for path in "${REQUIRED_PATHS[@]}"; do
    if [ ! -e "$path" ]; then
        echo "ERRO: Não encontrado: $path"
        exit 1
    fi
    echo "  ✓ $path"
done

echo ""
echo "Compilando instalador..."
makensis Blue-Clinic-installer.nsi

echo ""
echo "================================================"
echo "  Build concluído com sucesso!"
echo "  Arquivo gerado: App-Blue-Clinic-Setup-1.0.0.exe"
echo "================================================"