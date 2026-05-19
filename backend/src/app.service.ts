// app.service.ts
import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { Cron } from '@nestjs/schedule';
import { version } from '../package.json';
import { PrismaService } from './core/database/prisma.service';
import { LicenseSystemService } from './features/license-system/license-system.service';

const INSTALADOR_INFO = {
  nome: 'BlueTech Informática',
  tecnico: 'Elielton',
  telefone: '(38) 98866-3580',
  email: 'elieltonramos14@gmail.com',
  instalacao: '22/12/2025',
};

interface DashboardData {
  timestamp: string;
  serverStatus: string;
  uptime: string;
  port: string | number;
  cpu: string;
  memoryUsed: string;
  memoryTotal: string;
  version: string;
  dbStatus: string;
  dbStatusClass: string;
  dbError: string;
  backupStatus: string;
  backupStatusClass: string;
  backupLast: string;
  backupDaysAgo: string;
  backupCount: number;
  licenseStatus: string;
  licenseStatusClass: string;
  licensePlan: string;
  licenseCnpj: string;
  licenseValidUntil: string;
  licenseAlert: string;
  instaladorNome: string;
  instaladorTecnico: string;
  instaladorData: string;
  instaladorTelefone: string;
  instaladorEmail: string;
  installationPath: string;
}

const execAsync = promisify(exec);

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private licenseService: LicenseSystemService,
  ) {}

  @Cron('0 5 * * *', { name: 'scheduled-backup' })
  async scheduledBackup() {
    console.log('🕐 Executando backup agendado...');
    await this.execBackup();
  }

  async getDashboardData() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const packageVersion = version;

    let dbStatus = '🔴 Offline';
    let dbStatusClass = 'status-red';
    let dbError = '';

    try {
      await this.prisma.client.$executeRaw`SELECT 1`;
      dbStatus = '🟢 Online';
      dbStatusClass = 'status-green';
    } catch (error: unknown) {
      dbError = error instanceof Error ? error.message : 'Erro desconhecido';
    }

    let backupInfo = {
      lastBackup: 'Nenhum',
      daysAgo: 'Nunca',
      status: '❌ Sem backups',
      statusClass: 'status-red',
      totalBackups: 0,
    };

    try {
      const backupDir = path.join(process.cwd(), 'backups');
      if (fs.existsSync(backupDir)) {
        const allBackups = fs
          .readdirSync(backupDir)
          .filter((file) => file.endsWith('.sql') && file.startsWith('backup-'))
          .sort(
            (a, b) =>
              fs.statSync(path.join(backupDir, b)).mtime.getTime() -
              fs.statSync(path.join(backupDir, a)).mtime.getTime(),
          );

        if (allBackups.length > 0) {
          const latestBackup = allBackups[0];
          const stats = fs.statSync(path.join(backupDir, latestBackup));
          const daysAgo = Math.floor(
            (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24),
          );
          backupInfo = {
            lastBackup: stats.mtime.toLocaleDateString('pt-BR'),
            daysAgo: daysAgo === 0 ? 'Hoje' : `${daysAgo} dias`,
            status: '🟢 OK',
            statusClass: 'status-green',
            totalBackups: allBackups.length,
          };
        } else {
          backupInfo.status = '⚪ Pasta vazia';
          backupInfo.statusClass = 'status-yellow';
        }
      } else {
        backupInfo.status = '📁 Pasta não existe';
        backupInfo.statusClass = 'status-gray';
      }
    } catch {
      backupInfo.status = '❌ Erro';
      backupInfo.statusClass = 'status-red';
    }

    const licenseInfo = {
      status: '❌ Inválida',
      statusClass: 'status-red',
      plan: '-',
      cnpj: '-',
      validUntil: '-',
      alert: '',
    };

    try {
      const licenseStatus = await this.licenseService.getStatus();
      if (licenseStatus.isValid) {
        licenseInfo.status =
          licenseStatus.mode === 'online' ? '🟢 Online' : '🟡 Offline';
        licenseInfo.statusClass =
          licenseStatus.mode === 'online' ? 'status-green' : 'status-yellow';
      } else {
        licenseInfo.status = '🔴 Expirada';
        licenseInfo.statusClass = 'status-red';
      }
      licenseInfo.plan =
        licenseStatus.plan === 'pro'
          ? 'Pro'
          : licenseStatus.plan === 'basic'
            ? 'Basic'
            : '-';
      licenseInfo.alert = licenseStatus.message || '';
      const tokenInfo = await this.licenseService.getTokenInfo();
      licenseInfo.cnpj = tokenInfo.cnpj;
      licenseInfo.validUntil = new Date(
        tokenInfo.licenseValidUntil,
      ).toLocaleDateString('pt-BR');
    } catch {
      // Mantém valores padrão
    }

    return {
      serverStatus: '🟢 Online',
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      version: packageVersion,
      port: process.env.PORT || 3000,
      cpu: os.cpus()[0].model.split(' ')[0],
      memoryTotal: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
      memoryUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      installationPath: __dirname,
      timestamp: new Date().toLocaleString('pt-BR'),
      dbStatus,
      dbStatusClass,
      dbError,
      backupLast: backupInfo.lastBackup,
      backupDaysAgo: backupInfo.daysAgo,
      backupStatus: backupInfo.status,
      backupStatusClass: backupInfo.statusClass,
      backupCount: backupInfo.totalBackups,
      instaladorNome: INSTALADOR_INFO.nome,
      instaladorTecnico: INSTALADOR_INFO.tecnico,
      instaladorTelefone: INSTALADOR_INFO.telefone,
      instaladorEmail: INSTALADOR_INFO.email,
      instaladorData: INSTALADOR_INFO.instalacao,
      licenseStatus: licenseInfo.status,
      licenseStatusClass: licenseInfo.statusClass,
      licensePlan: licenseInfo.plan,
      licenseCnpj: licenseInfo.cnpj,
      licenseValidUntil: licenseInfo.validUntil,
      licenseAlert: licenseInfo.alert,
    };
  }

  renderDashboard(data: DashboardData): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blue Clinic - Dashboard Admin</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-card: #1c2333;
            --bg-card-hover: #21293d;
            --border: #30363d;
            --border-accent: #1f6feb;
            --cyan: #58d6e8;
            --cyan-dim: #1e4a52;
            --blue-accent: #1f6feb;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --text-muted: #484f58;
            --green: #3fb950;
            --green-dim: #1a3a20;
            --yellow: #d29922;
            --red: #f85149;
            --gray: #6e7681;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background-color: var(--bg-primary);
            color: var(--text-primary);
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .topbar {
            height: 52px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 32px;
            flex-shrink: 0;
        }

        .topbar-brand {
            font-size: 15px;
            font-weight: 700;
            color: var(--cyan);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .topbar-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--green-dim);
            border: 1px solid var(--green);
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 11px;
            font-weight: 600;
            color: var(--green);
        }

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--green);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }

        .content {
            flex: 1;
            padding: 32px;
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
        }

        .page-header {
            margin-bottom: 24px;
        }

        .page-header h1 {
            font-size: 22px;
            font-weight: 700;
            color: var(--text-primary);
        }

        .page-header p {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 20px;
        }

        .card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            transition: border-color 0.2s, background 0.2s;
        }

        .card:hover {
            border-color: var(--border-accent);
            background: var(--bg-card-hover);
        }

        .card-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-secondary);
            margin-bottom: 12px;
        }

        .card-value {
            font-size: 26px;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 6px;
        }

        .card-sub {
            font-size: 12px;
            color: var(--text-secondary);
        }

        .card-meta {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .card-meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
        }

        .card-meta-row span:first-child { color: var(--text-secondary); }
        .card-meta-row span:last-child { color: var(--text-primary); font-weight: 500; }

        .status-green { color: var(--green); }
        .status-yellow { color: var(--yellow); }
        .status-red { color: var(--red); }
        .status-gray { color: var(--gray); }

        .section-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .section-card.accent-cyan {
            border-color: var(--cyan-dim);
            background: linear-gradient(135deg, #0d1f23 0%, var(--bg-card) 100%);
        }

        .section-card.accent-blue {
            border-color: #1a2a4a;
            background: linear-gradient(135deg, #0d1625 0%, var(--bg-card) 100%);
        }

        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-title .icon {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }

        .icon-cyan { background: var(--cyan-dim); }
        .icon-blue { background: #1a2a4a; }

        .grid-license {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }

        .license-item p:first-child {
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: 4px;
        }

        .license-item p:last-child {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .alert-box {
            margin-top: 14px;
            padding: 10px 14px;
            background: rgba(210, 153, 34, 0.1);
            border: 1px solid rgba(210, 153, 34, 0.3);
            border-radius: 6px;
            font-size: 12px;
            color: var(--yellow);
        }

        .installer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 24px;
        }

        .installer-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            padding: 6px 0;
        }

        .installer-row .icon-label { color: var(--text-secondary); font-size: 12px; }
        .installer-row .value { color: var(--text-primary); font-weight: 500; }

        .version-tag {
            font-size: 11px;
            color: var(--cyan);
            background: var(--cyan-dim);
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 600;
        }

        .footer {
            padding: 16px 32px;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-secondary);
        }

        .footer p {
            font-size: 11px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>

    <div class="topbar">
        <div class="topbar-brand">🏥 Blue Clinic</div>
        <div class="topbar-right">
            <div class="status-badge">
                <div class="status-dot"></div>
                Monitoramento Ativo
            </div>
            <span style="font-size:12px;color:var(--text-secondary)">${data.timestamp}</span>
        </div>
    </div>

    <div class="content">
        <div class="page-header">
            <h1>Dashboard Admin</h1>
            <p>Monitore o status do servidor, banco de dados, backup e licença em tempo real.</p>
        </div>

        <div class="grid-4">
            <div class="card">
                <div class="card-label">Servidor</div>
                <div class="card-value status-green">${data.serverStatus}</div>
                <div class="card-sub">Uptime: ${data.uptime}</div>
                <div class="card-meta">
                    <div class="card-meta-row"><span>Porta</span><span>${data.port}</span></div>
                    <div class="card-meta-row"><span>CPU</span><span>${data.cpu}</span></div>
                </div>
            </div>

            <div class="card">
                <div class="card-label">Sistema</div>
                <div class="card-value" style="font-size:18px;color:var(--cyan)">${data.memoryUsed}</div>
                <div class="card-sub">de ${data.memoryTotal} RAM</div>
                <div class="card-meta">
                    <div class="card-meta-row"><span>Versão</span><span class="version-tag">v${data.version}</span></div>
                    <div class="card-meta-row"><span>Plataforma</span><span>Windows</span></div>
                </div>
            </div>

            <div class="card">
                <div class="card-label">Banco de Dados</div>
                <div class="card-value ${data.dbStatusClass}">${data.dbStatus}</div>
                <div class="card-sub">MySQL</div>
                ${data.dbError ? `<div class="card-meta"><div class="card-meta-row"><span style="color:var(--red);font-size:11px">${data.dbError}</span></div></div>` : ''}
            </div>

            <div class="card">
                <div class="card-label">Backup</div>
                <div class="card-value ${data.backupStatusClass}" style="font-size:18px">${data.backupStatus}</div>
                <div class="card-sub">Último: ${data.backupLast}</div>
                <div class="card-meta">
                    <div class="card-meta-row"><span>Há quanto tempo</span><span>${data.backupDaysAgo}</span></div>
                    ${data.backupCount > 0 ? `<div class="card-meta-row"><span>Total salvo</span><span>${data.backupCount} arquivo(s)</span></div>` : ''}
                </div>
            </div>
        </div>

        <div class="section-card accent-cyan">
            <div class="section-title">
                <span class="icon icon-cyan">🔑</span>
                Licença do Sistema
            </div>
            <div class="grid-license">
                <div class="license-item">
                    <p>Status</p>
                    <p class="${data.licenseStatusClass}">${data.licenseStatus}</p>
                </div>
                <div class="license-item">
                    <p>Plano</p>
                    <p>${data.licensePlan}</p>
                </div>
                <div class="license-item">
                    <p>CNPJ</p>
                    <p>${data.licenseCnpj}</p>
                </div>
                <div class="license-item">
                    <p>Validade</p>
                    <p>${data.licenseValidUntil}</p>
                </div>
            </div>
            ${data.licenseAlert ? `<div class="alert-box">⚠️ ${data.licenseAlert}</div>` : ''}
        </div>

        <div class="section-card accent-blue">
            <div class="section-title">
                <span class="icon icon-blue">👨‍💻</span>
                Instalação por
            </div>
            <div class="installer-grid">
                <div class="installer-row">
                    <span class="icon-label">Empresa</span>
                    <span class="value">${data.instaladorNome}</span>
                </div>
                <div class="installer-row">
                    <span class="icon-label">Técnico</span>
                    <span class="value">${data.instaladorTecnico}</span>
                </div>
                <div class="installer-row">
                    <span class="icon-label">Data</span>
                    <span class="value">${data.instaladorData}</span>
                </div>
                <div class="installer-row">
                    <span class="icon-label">Telefone</span>
                    <span class="value">${data.instaladorTelefone}</span>
                </div>
                <div class="installer-row">
                    <span class="icon-label">E-mail</span>
                    <span class="value">${data.instaladorEmail}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Instalado em: ${data.installationPath}</p>
        <p>BlueTech Informática Ltda · Espinosa, MG · Blue Clinic v${data.version}</p>
    </div>

<script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>`;
  }

  private manageBackupFiles(backupDir: string, maxBackups: number = 3): void {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const allBackups = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith('.sql') && file.startsWith('backup-'))
      .sort();

    const toDelete = allBackups.slice(0, -maxBackups);
    toDelete.forEach((file) => {
      const filePath = path.join(backupDir, file);
      fs.unlinkSync(filePath);
      console.log(`🗑️  Backup antigo removido: ${file}`);
    });

    console.log(
      `📊 Total de backups mantidos: ${allBackups.length - toDelete.length + 1}`,
    );
  }

  async execBackup(): Promise<void> {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, '-')
        .slice(0, 19);
      const backupDir = path.join(process.cwd(), 'backups');
      const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

      console.log('🔄 Iniciando backup do banco de dados...');

      this.manageBackupFiles(backupDir, 3);

      const dbName = process.env.DATABASE_NAME || 'db_blue_clinic';
      const dbUser = process.env.DATABASE_USER || 'root';
      const dbPassword = process.env.DATABASE_PASSWORD || 'password';
      const dbHost = '127.0.0.1';
      const dbPort = process.env.DATABASE_PORT || '3306';

      const command = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPassword} ${dbName} > "${backupFile}"`;

      await execAsync(command);

      console.log(`✅ Backup concluído com sucesso!`);
      console.log(`📁 Arquivo: ${backupFile}`);
    } catch (error) {
      console.log('❌ Falha no backup do banco de dados:', error);
      throw error;
    }
  }
}
