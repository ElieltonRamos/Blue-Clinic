/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client';
import { seedCompany } from './company-seed';
import { seedUsers } from './user-seed';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || '127.0.0.1',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'db_blue_clinic',
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  const companyId = await seedCompany(prisma);
  await seedUsers(prisma, companyId);

  console.log('✅ Seed concluído');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
