import { Role } from '../../../../generated/prisma/client';

export class UserResponseDto {
  id: number;
  companyId: number;
  username: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
