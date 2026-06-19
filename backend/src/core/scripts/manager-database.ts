#!/usr/bin/env node

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as mariadb from 'mariadb';
import * as bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================
// CONFIGURAÇÃO DO BANCO
// ============================================

const dbConfig = {
  host: (process.env.DATABASE_HOST || 'localhost').replace(
    'localhost',
    '127.0.0.1',
  ),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'db_blue_clinic',
  port: Number(process.env.DATABASE_PORT) || 3306,
};

// ============================================
// DETECÇÃO AUTOMÁTICA DE CAMINHOS
// ============================================

function findMigrationsDir(startDir: string): string | null {
  const searchPatterns = [
    ['migrations'],
    ['dist', 'prisma', 'migrations'],
    ['build', 'prisma', 'migrations'],
    ['prisma', 'migrations'],
  ];

  for (const pattern of searchPatterns) {
    const testPath = path.join(startDir, ...pattern);
    if (fs.existsSync(testPath) && fs.statSync(testPath).isDirectory()) {
      return testPath;
    }
  }

  return null;
}

const EXECUTION_DIR = process.cwd();
const migrationsDir = findMigrationsDir(EXECUTION_DIR);

console.log('🔍 Caminhos detectados:');
console.log(`   Diretório de execução: ${EXECUTION_DIR}`);
console.log(`   Migrations: ${migrationsDir || '❌ Não encontrado'}`);
console.log('');

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function ensureDatabaseExists(): Promise<void> {
  const conn = await mariadb.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port,
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
  await conn.end();
  console.log(`✅ Banco '${dbConfig.database}' verificado/criado`);
}

async function ensureMigrationsTable(conn: mariadb.Connection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id VARCHAR(36) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      finished_at DATETIME,
      migration_name VARCHAR(255) NOT NULL,
      logs TEXT,
      rolled_back_at DATETIME,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
    )
  `);
}

async function getExecutedMigrations(
  conn: mariadb.Connection,
): Promise<string[]> {
  const rows = await conn.query<{ migration_name: string }[]>(
    'SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL ORDER BY started_at',
  );
  return rows.map((row) => row.migration_name);
}

function getMigrationFolders(): string[] {
  if (!migrationsDir || !fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((name) => {
      const fullPath = path.join(migrationsDir, name);
      return (
        fs.statSync(fullPath).isDirectory() &&
        fs.existsSync(path.join(fullPath, 'migration.sql'))
      );
    })
    .sort();
}

function generateChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// CRIAR BANCO
// ============================================

async function createDatabase(): Promise<void> {
  console.log('\n📦 Criando banco de dados...\n');
  await ensureDatabaseExists();

  const conn = await mariadb.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
  });

  try {
    await conn.query('SELECT 1');
    console.log('✅ Conexão testada com sucesso!\n');
  } finally {
    await conn.end();
  }
}

// ============================================
// OPERAÇÕES DE MIGRATIONS
// ============================================

async function runMigrations(): Promise<void> {
  console.log('\n📦 Rodando migrations...\n');

  if (!migrationsDir) {
    console.log('❌ Pasta de migrations não encontrada.\n');
    return;
  }

  const conn = await mariadb.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
    multipleStatements: true,
  });

  try {
    await ensureMigrationsTable(conn);

    const executedMigrations = await getExecutedMigrations(conn);
    const allMigrations = getMigrationFolders();
    const pendingMigrations = allMigrations.filter(
      (m) => !executedMigrations.includes(m),
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ Todas as migrations já foram executadas.\n');
      return;
    }

    console.log(`📋 ${pendingMigrations.length} migrations pendentes:\n`);

    for (const migrationName of pendingMigrations) {
      const sqlPath = path.join(migrationsDir, migrationName, 'migration.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

      console.log(`   ⏳ Executando: ${migrationName}`);

      const migrationId = generateUUID();
      const checksum = generateChecksum(sqlContent);

      await conn.query(
        `INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count)
         VALUES (?, ?, ?, NOW(), 0)`,
        [migrationId, checksum, migrationName],
      );

      try {
        await conn.query(sqlContent);

        await conn.query(
          `UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = 1 WHERE id = ?`,
          [migrationId],
        );

        console.log(`   ✅ Concluída: ${migrationName}`);
      } catch (err) {
        await conn.query(
          `UPDATE _prisma_migrations SET logs = ? WHERE id = ?`,
          [err instanceof Error ? err.message : String(err), migrationId],
        );
        throw err;
      }
    }

    console.log(
      `\n✅ ${pendingMigrations.length} migrations executadas com sucesso!\n`,
    );
  } finally {
    await conn.end();
  }
}

// ============================================
// OPERAÇÕES DE SEEDS
// ============================================

async function runSeeds(): Promise<void> {
  console.log('\n🌱 Rodando seeds...\n');

  const conn = await mariadb.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
  });

  try {
    // Seed Company
    console.log('   ⏳ Executando: company-seed');
    await conn.query(`
  INSERT INTO company (tradeName, corporateName, cnpj, phone, email, street, number, neighborhood, city, state, cityCode, licenseKey, createdAt, updatedAt)
  VALUES ('Blue Clinic', 'Blue Clinic Ltda', '00000000000100', '(38) 99999-9999', 'contato@blueclinic.com.br', 'Rua Exemplo', '123', 'Centro', 'Espinosa', 'MG', '3124302', '53fd9d55780f1646ed650da9a0b465bbb1fa6da70c88f6f22c50ecf159170642', NOW(), NOW())
  ON DUPLICATE KEY UPDATE cnpj = cnpj
`);
    console.log('   ✅ Concluído: company-seed');

    // Seed User (admin)
    console.log('   ⏳ Executando: user-seed');
    const [company] = await conn.query<{ id: number }[]>(
      `SELECT id FROM company WHERE cnpj = '00000000000100'`,
    );
    const hashAdmin = await bcrypt.hash('impostoeroubo', 10);
    await conn.query(
      `INSERT INTO user (companyId, username, password, role, active, createdAt, updatedAt)
      VALUES (?, 'root', ?, 'admin', true, NOW(), NOW())
      ON DUPLICATE KEY UPDATE username = username`,
      [company.id, hashAdmin],
    );
    console.log('   ✅ Concluído: user-seed');
  } finally {
    await conn.end();
  }
}

// ============================================
// OPERAÇÕES DE RESET
// ============================================

async function dropAllTables(): Promise<void> {
  const conn = await mariadb.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
  });

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = await conn.query<{ Tables_in_database: string }[]>(
      `SELECT TABLE_NAME as Tables_in_database FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [dbConfig.database],
    );

    for (const row of tables) {
      const tableName = row.Tables_in_database;
      console.log(`   🗑️  Removendo tabela: ${tableName}`);
      await conn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await conn.end();
  }
}

async function resetDatabase(): Promise<void> {
  console.log('\n🔴 RESETANDO banco de dados...\n');

  await ensureDatabaseExists();

  console.log('📋 Removendo tabelas existentes...\n');
  await dropAllTables();

  await runMigrations();
  await runSeeds();

  console.log('✅ Banco resetado com sucesso!\n');
}

// ============================================
// STATUS
// ============================================

async function showStatus(): Promise<void> {
  console.log('\n📊 Status do banco de dados:\n');

  let dbOnline = false;
  try {
    const conn = await mariadb.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
    });

    dbOnline = true;
    await ensureMigrationsTable(conn);

    const executedMigrations = await getExecutedMigrations(conn);
    const allMigrations = getMigrationFolders();
    const pendingMigrations = allMigrations.filter(
      (m) => !executedMigrations.includes(m),
    );

    console.log('🔹 Conexão:');
    console.log(
      `   ✅ Online: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`,
    );

    console.log('\n🔹 Migrations:');
    console.log(`   ✅ Executadas: ${executedMigrations.length}`);
    console.log(`   ⏳ Pendentes: ${pendingMigrations.length}`);

    if (executedMigrations.length > 0) {
      console.log('\n   Últimas executadas:');
      executedMigrations.slice(-5).forEach((m) => console.log(`      - ${m}`));
    }

    if (pendingMigrations.length > 0) {
      console.log('\n   Pendentes:');
      pendingMigrations.forEach((m) => console.log(`      - ${m}`));
    }

    await conn.end();
  } catch (err) {
    if (!dbOnline) {
      console.log('🔹 Conexão:');
      console.log(`   ❌ Offline: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log('');
}

// ============================================
// BACKUP E RESTORE
// ============================================

function getBackupDir(): string {
  return path.join(EXECUTION_DIR, 'backups');
}

function manageBackupFiles(backupDir: string, maxBackups: number = 5): void {
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
    console.log(`   🗑️  Backup antigo removido: ${file}`);
  });
}

async function execBackup(): Promise<void> {
  console.log('\n💾 Iniciando backup do banco de dados...\n');

  const backupDir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  manageBackupFiles(backupDir, 5);

  const command = `mysqldump -h 127.0.0.1 -P ${dbConfig.port} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} > "${backupFile}"`;

  try {
    await execAsync(command);
    const stats = fs.statSync(backupFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`   ✅ Backup concluído!`);
    console.log(`   📁 Arquivo: ${backupFile}`);
    console.log(`   📊 Tamanho: ${sizeMB} MB\n`);
  } catch (err) {
    console.log(
      `   ❌ Erro no backup: ${err instanceof Error ? err.message : err}\n`,
    );
    throw err;
  }
}

async function restoreBackup(): Promise<void> {
  console.log('\n🔄 Restaurando backup...\n');

  const backupFile = path.join(EXECUTION_DIR, 'backup.sql');

  if (!fs.existsSync(backupFile)) {
    console.log('   ❌ Arquivo backup.sql não encontrado na raiz.\n');
    console.log('   📍 Esperado em: ' + backupFile);
    console.log(
      '   💡 Coloque o arquivo backup.sql na pasta raiz e tente novamente.\n',
    );
    return;
  }

  const stats = fs.statSync(backupFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   📁 Arquivo encontrado: ${backupFile}`);
  console.log(`   📊 Tamanho: ${sizeMB} MB\n`);

  const command = `mysql -h 127.0.0.1 -P ${dbConfig.port} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} < "${backupFile}"`;

  try {
    await execAsync(command);
    console.log(`   ✅ Backup restaurado com sucesso!\n`);
  } catch (err) {
    console.log(
      `   ❌ Erro na restauração: ${err instanceof Error ? err.message : err}\n`,
    );
    throw err;
  }
}

// ============================================
// MENU INTERATIVO
// ============================================

function showMenu(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   🗄️  GERENCIADOR DE BANCO - BLUE CLINIC  ║');
  console.log('╠════════════════════════════════════════╣');
  console.log('║  1 - Criar banco de dados              ║');
  console.log('║  2 - Rodar migrations                  ║');
  console.log('║  3 - Rodar seeds                       ║');
  console.log('║  4 - Resetar banco (drop + migrate)    ║');
  console.log('║  5 - Ver status                        ║');
  console.log('║  6 - Fazer backup                      ║');
  console.log('║  7 - Restaurar backup (backup.sql)     ║');
  console.log('║  8 - Sair                              ║');
  console.log('╚════════════════════════════════════════╝\n');
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  console.log('\n🚀 Blue Clinic - Gerenciador de Banco de Dados\n');
  console.log(
    `📍 Banco: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`,
  );

  while (true) {
    showMenu();
    const choice = await promptUser('Escolha uma opção: ');

    try {
      switch (choice) {
        case '1':
          await createDatabase();
          break;
        case '2':
          await runMigrations();
          break;
        case '3':
          await runSeeds();
          break;
        case '4': {
          const confirm = await promptUser(
            '⚠️  ATENÇÃO: Isso vai DELETAR todos os dados! Confirma? (sim/não): ',
          );
          if (confirm.toLowerCase() === 'sim') {
            await resetDatabase();
          } else {
            console.log('❌ Operação cancelada.\n');
          }
          break;
        }
        case '5':
          await showStatus();
          break;
        case '6':
          await execBackup();
          break;
        case '7': {
          const confirmRestore = await promptUser(
            '⚠️  ATENÇÃO: Isso vai SOBRESCREVER os dados atuais! Confirma? (sim/não): ',
          );
          if (confirmRestore.toLowerCase() === 'sim') {
            await restoreBackup();
          } else {
            console.log('❌ Operação cancelada.\n');
          }
          break;
        }
        case '8':
          console.log('\n👋 Até logo!\n');
          process.exit(0);
          break;
        default:
          console.log('\n❌ Opção inválida! Escolha de 1 a 8.\n');
      }
    } catch (err) {
      console.error('\n❌ Erro:', err instanceof Error ? err.message : err);
      console.log('');
    }
  }
}

// ============================================
// EXECUÇÃO
// ============================================

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
