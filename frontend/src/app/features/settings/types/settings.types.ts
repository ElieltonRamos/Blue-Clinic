import { Role } from '../../dashboard/types/dashboard.types';

export type UserLevel = Role;

export interface CompanyData {
  id: number;
  tradeName: string;
  corporateName: string;
  cnpj: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cityCode: string;
  phone: string | null;
  email: string | null;
}

export interface TeamMember {
  id: number;
  companyId: number;
  username: string;
  role: UserLevel;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemberRequest {
  username: string;
  password: string;
  role: UserLevel;
  active?: boolean;
  name?: string;
  specialty?: string;
}

export interface NewMemberForm {
  username: string;
  password: string;
  role: UserLevel;
  name?: string;
  specialty?: string;
}

export interface IntegrationStatus {
  id: number;
  phoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  botEnabled: boolean;
  autoReminder: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertIntegrationDto {
  phoneNumberId?: string;
  accessToken?: string;
  whatsappBusinessAccountId?: string;
  botEnabled?: boolean;
  autoReminder?: boolean;
}
