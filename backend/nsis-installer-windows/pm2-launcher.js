'use strict';

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const OS = 'WINDOWS'; // 'WINDOWS' ou 'LINUX'

// ==================== CONFIGURAÇÃO ====================
const CONFIG = {
  OS,
  appName: 'blue-clinic',
  script: 'server.js',
  instances: 1,
  execMode: 'cluster',
  maxMemoryRestart: '500M',
  maxRestarts: 10,
  restartDelay: 5000,
  minUptime: '10s',
  pm2Home:
    process.env.PM2_HOME ??
    (OS === 'WINDOWS'
      ? 'C:\\blue-clinic-server\\pm2-home'
      : path.join(os.homedir(), '.pm2')),
  healthCheckIntervalMs: 60_000,
};
// ======================================================

process.env.PM2_HOME = CONFIG.pm2Home;

const globalRoot =
  process.env.NPM_GLOBAL_MODULES ?? execSync('npm root -g').toString().trim();
const pm2 = require(path.join(globalRoot, 'pm2'));

const SCRIPT_PATH = path.join(__dirname, CONFIG.script);

let healthCheckTimer;

function log(message) {
  process.stdout.write(
    `[pm2-launcher] ${new Date().toISOString()} ${message}\r\n`,
  );
}

function logError(message, err) {
  process.stderr.write(
    `[pm2-launcher] ${new Date().toISOString()} ${message} ${err ?? ''}\r\n`,
  );
}

function startHealthCheck() {
  healthCheckTimer = setInterval(() => {
    pm2.describe(CONFIG.appName, (err, processDescription) => {
      if (err) {
        logError('Falha ao consultar status do PM2.', err);
        return;
      }

      const proc = processDescription[0];
      if (!proc) {
        logError(`Processo "${CONFIG.appName}" nao encontrado no PM2.`);
        return;
      }

      const status = proc.pm2_env?.status ?? 'desconhecido';
      const restarts = proc.pm2_env?.restart_time ?? 0;
      const memory = proc.monit?.memory
        ? `${Math.round(proc.monit.memory / 1024 / 1024)}MB`
        : 'n/d';
      const cpu = proc.monit?.cpu ?? 'n/d';

      log(
        `Status: ${status} | PID: ${proc.pid} | Restarts: ${restarts} | Memoria: ${memory} | CPU: ${cpu}%`,
      );
    });
  }, CONFIG.healthCheckIntervalMs);
}

function shutdown(signal) {
  log(`Sinal ${signal} recebido. Finalizando "${CONFIG.appName}" via PM2...`);

  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }

  pm2.stop(CONFIG.appName, (err) => {
    if (err) {
      logError('Falha ao parar o app via PM2.', err);
    } else {
      log(`App "${CONFIG.appName}" parado.`);
    }
    pm2.disconnect();
    process.exit(0);
  });
}

log(`Iniciando launcher. PM2_HOME=${CONFIG.pm2Home}`);
log(`NPM_GLOBAL_MODULES=${globalRoot}`);
log(
  `Logs do app NAO aparecem aqui. Use: set PM2_HOME=${CONFIG.pm2Home} && pm2 logs ${CONFIG.appName}`,
);
log(`Monitoramento em tempo real: set PM2_HOME=${CONFIG.pm2Home} && pm2 monit`);
log(
  'Este log (NSSM AppStdout/AppStderr) mostra apenas status do launcher e do supervisor PM2.',
);

pm2.connect((err) => {
  if (err) {
    logError('Falha ao conectar no daemon PM2.', err);
    process.exit(1);
  }

  log('Conectado ao daemon PM2.');

  pm2.start(
    {
      script: SCRIPT_PATH,
      name: CONFIG.appName,
      cwd: path.dirname(SCRIPT_PATH),
      instances: CONFIG.instances,
      exec_mode: CONFIG.execMode,
      max_memory_restart: CONFIG.maxMemoryRestart,
      max_restarts: CONFIG.maxRestarts,
      restart_delay: CONFIG.restartDelay,
      min_uptime: CONFIG.minUptime,
      autorestart: true,
    },
    (startErr) => {
      if (startErr) {
        logError(`Falha ao iniciar "${CONFIG.appName}" via PM2.`, startErr);
        pm2.disconnect();
        process.exit(1);
      }

      log(`App "${CONFIG.appName}" iniciado via PM2.`);
      startHealthCheck();
    },
  );
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logError('Excecao nao tratada no launcher.', err);
});
