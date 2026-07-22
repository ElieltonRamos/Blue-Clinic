import { Role } from '../../dashboard/types/dashboard.types';

export type UserLevel = Role;
export type WhatsappProviderType = 'official' | 'baileys';

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
  phone?: string | null;
  role: UserLevel;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMemberRequest {
  username: string;
  password: string;
  role: UserLevel;
  phone?: string | null;
  active?: boolean;
  name?: string;
  specialty?: string;
}

export interface NewMemberForm {
  username: string;
  password: string;
  phone?: string | null;
  role: UserLevel;
  name?: string;
  specialty?: string;
}

export interface IntegrationStatus {
  id: number;
  provider: WhatsappProviderType;
  phoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  botEnabled: boolean;
  autoReminder: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertIntegrationDto {
  provider?: WhatsappProviderType;
  phoneNumberId?: string;
  accessToken?: string;
  whatsappBusinessAccountId?: string;
  botEnabled?: boolean;
  autoReminder?: boolean;
}

export interface BaileysStatus {
  status: string | null;
  qr: string | null;
}