export type UserLevel = 'medico' | 'atendimento' | 'admin';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  detail: string;
  level: UserLevel;
  icon: string;
}

export interface CompanyData {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
}

export interface SecurityAlert {
  message: string;
}

export interface IntegrationStatus {
  label: string;
  status: 'connected' | 'disconnected';
  syncInfo: string;
}

export interface SecurityConfig {
  backupLabel: string;
  backupStatus: string;
}

export interface NewMemberForm {
  name: string;
  role: string;
  detail: string;
  level: UserLevel;
  icon: string;
}
