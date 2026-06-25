# nsis-installer-windows

Gerador do instalador Windows para o Blue Clinic Server.

## Arquivos necessários

| Arquivo | Descrição |
|---|---|
| `blue-clinic-server.nsi` | Script do instalador NSIS |
| `node-v24-x64.msi` | Instalador Node.js (Windows x64) |
| `server.js` | Arquivo principal do servidor |
| `nssm.exe` | Gerenciador de serviço Windows |
| `blue-clinic-server-icon.ico` | Ícone do instalador |
| `LICENSE.txt` | Licença exibida durante a instalação |
| `.env` | Variáveis de ambiente |
| `build.sh` | Script de build |

## Dependências

NSIS instalado na máquina Linux/WSL:

```bash
sudo apt install nsis
```

## Variáveis de ambiente (.env)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão completa do banco de dados |
| `DATABASE_USER` | Usuário do banco |
| `DATABASE_PASSWORD` | Senha do banco |
| `DATABASE_NAME` | Nome do banco (`db_blue_clinic`) |
| `DATABASE_HOST` | Host do banco |
| `DATABASE_PORT` | Porta do banco (padrão `3306`) |
| `JWT_SECRET` | Chave secreta para geração de tokens JWT |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token de verificação do webhook do WhatsApp |
| `PORT` | Porta do servidor (padrão `3003`) |

> `LICENSING_SERVER` e `LICENSE_PUBLIC_KEY` são fornecidos pela Blue Tech Informatica.

## Build

### Via npm (recomendado)

```bash
npm run installer:win
```

Executa em sequência: `nest build` → `esbuild bundle` → copia `server.js` → compila o instalador NSIS.

### Manual

```bash
chmod +x build.sh
./build.sh
```

O arquivo gerado será: `BlueClinicServer-Setup-{version}.exe`

## O que o instalador faz

- Copia os arquivos para `C:\blue-clinic-server\`
- Instala Node.js v24 caso não esteja instalado ou versão seja inferior
- Instala PM2 globalmente caso não esteja instalado
- Registra o desinstalador no Windows (Painel de Controle → Programas)
- Instala e inicia o serviço `BlueClinicServer` via NSSM com reinício automático
- Cria o diretório `logs\` com rotação automática de logs (limite 5MB por arquivo)

## Por que PM2 + NSSM?

O NSSM gerencia o ciclo de vida do **processo** no Windows (inicia com o sistema, reinicia se cair).
O PM2 gerencia o ciclo de vida da **aplicação** Node.js (reinício em caso de exceção não tratada).

### Fluxo

```
Windows → NSSM → cmd /c pm2 start server.js --no-daemon
```

O `--no-daemon` faz o PM2 rodar em foreground, mantendo o processo visível para o NSSM monitorar.

## Monitoramento

Servidor disponível em: `http://localhost:3003`

Logs em tempo real:

```bash
pm2 logs
```

Status dos processos:

```bash
pm2 status
```

Logs gravados em: `C:\blue-clinic-server\logs\`

## Reiniciar o serviço manualmente

`Serviços do Windows` (`services.msc`) → localizar `BlueClinicServer` → Reiniciar.

## Desinstalação

Via Painel de Controle → Programas → Blue Clinic Server → Desinstalar.

O desinstalador para o serviço, mata processos PM2, remove o serviço do Windows e apaga todos os arquivos instalados.