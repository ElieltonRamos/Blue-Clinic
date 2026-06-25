import * as bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../../generated/prisma/client';

export async function seedUsers(prisma: PrismaClient, companyId: number) {
  const users = [
    { username: 'root', password: 'impostoeroubo', role: Role.admin },
    { username: 'medico', password: 'medico123', role: Role.medico },
    {
      username: 'atendimento',
      password: 'atendimento123',
      role: Role.atendimento,
    },
  ];

  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        companyId,
        username: user.username,
        password: hashed,
        role: user.role,
        active: true,
      },
    });
  }

  console.log('✓ Users seed');
}
