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
  instanceId: string;
  phoneNumberId: string | null;
  botEnabled: boolean;
  autoConfirm: boolean;
  autoReminder: boolean;
  reminderHours: number;
  humanFallback: boolean;
}

export interface UpsertIntegrationDto {
  phoneNumberId?: string;
  accessToken?: string;
  botEnabled?: boolean;
  autoConfirm?: boolean;
  autoReminder?: boolean;
  reminderHours?: number;
  humanFallback?: boolean;
}
