import { Prisma } from '../../../../generated/prisma/client';

export class Financial {}

export type ExpenseWithRegisteredBy = Prisma.ExpenseGetPayload<{
  include: { registeredBy: { select: { id: true; username: true } } };
}>;
