import { PrismaClient } from '../../generated/prisma/client';

export async function seedCompany(prisma: PrismaClient): Promise<number> {
  const company = await prisma.company.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      name: 'Blue Clinic',
      cnpj: '00.000.000/0001-00',
      phone: '(38) 99999-9999',
      email: 'contato@blueclinic.com.br',
      address: 'Rua Exemplo, 123',
    },
  });

  console.log('✓ Company seed');
  return company.id;
}
