export type UserLevel = 'medico' | 'atendimento' | 'admin';

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
  name: string;
  role: string;
  detail: string;
  level: UserLevel;
  icon: string;
}

export interface CreateMemberRequest {
  companyId: number;
  name: string;
  specialty: string; // para médico
  role?: string; // para atendimento/admin (mapeado para username no backend)
  detail?: string;
  level: UserLevel;
  icon: string;
  username?: string;
  password?: string;
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

export interface NewMemberForm {
  name: string;
  role: string;
  detail: string;
  level: UserLevel;
  icon: string;
  username?: string;
  password?: string;
}
