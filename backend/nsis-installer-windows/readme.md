# nsis-installer-windows

Gerador do instalador Windows para o Blue ERP Server.

## Arquivos necessários

Todos os arquivos abaixo devem estar na mesma pasta antes de executar o build:

| Arquivo | Descrição |
|---|---|
| `blue-erp-server.nsi` | Script do instalador NSIS |
| `node.exe` | Runtime Node.js (Windows x64) |
| `server.js` | Arquivo principal do servidor |
| `nssm.exe` | Gerenciador de serviço Windows |
| `blue-erp-server-icon.ico` | Ícone do instalador |
| `LICENSE.txt` | Licença exibida durante a instalação |
| `.env` | Variáveis de ambiente |
| `build.sh` | Script de build |

## Dependências

NSIS deve estar instalado na máquina Linux/WSL que executará o build:

```bash
sudo apt install nsis
```

## Build

### Via npm (recomendado)

A partir da raiz do projeto, executa o build do servidor e gera o instalador em um único comando:

```bash
npm run release:installer
```

Isso executa em sequência: `nest build` → `esbuild bundle` → copia `server.js` para esta pasta → compila o instalador NSIS.

### Manual

Dar permissão de execução ao script (necessário apenas na primeira vez):

```bash
chmod +x build.sh
```

Executar o build:

```bash
./build.sh
```

O arquivo gerado será: `BlueERPServer-Setup-1.0.0.exe`

## O que o instalador faz

- Copia os arquivos para `C:\Program Files\Blue ERP Server\`
- Registra o desinstalador no Windows (Painel de Controle → Programas)
- Instala e inicia o serviço `BlueERPServer` via NSSM com reinício automático
- Cria o diretório `logs\` com rotação automática de logs (limite 5MB por arquivo)

## Desinstalação

Via Painel de Controle → Programas → Blue ERP Server → Desinstalar.

O desinstalador para o serviço, remove o serviço do Windows e apaga todos os arquivos instalados.