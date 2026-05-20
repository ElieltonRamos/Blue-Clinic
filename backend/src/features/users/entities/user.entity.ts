import { Role } from '../../../../generated/prisma/client';

export class User {
  id: number;
  companyId: number;
  username: string;
  password: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
