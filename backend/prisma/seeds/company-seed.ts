import { PrismaClient } from '../../generated/prisma/client';

export async function seedCompany(prisma: PrismaClient): Promise<number> {
  const company = await prisma.company.upsert({
    where: { cnpj: '00000000000100' },
    update: {},
    create: {
      tradeName: 'Blue Clinic',
      corporateName: 'Blue Clinic Ltda',
      cnpj: '00000000000100',
      phone: '(38) 99999-9999',
      email: 'contato@blueclinic.com.br',
      street: 'Rua Exemplo',
      number: '123',
      neighborhood: 'Centro',
      city: 'Espinosa',
      state: 'MG',
      cityCode: '3124302',
      licenseKey:
        '53fd9d55780f1646ed650da9a0b465bbb1fa6da70c88f6f22c50ecf159170642',
    },
  });

  console.log('✓ Company seed');
  return company.id;
}
