import { Role } from "../../dashboard/types/dashboard.types";

export type UserLevel = Role;

export interface CompanyData {
  id: number;
  name: string;
  cnpj: string;
  phone: string | null;
  email: string | null;
  address: string | null;
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
}

export interface NewMemberForm {
  username: string;
  password: string;
  role: UserLevel;
}

export interface IntegrationStatus {
  instanceId: string;
  botEnabled: boolean;
  autoConfirm: boolean;
  autoReminder: boolean;
  reminderHours: number;
  humanFallback: boolean;
  syncInfo?: string;
}
