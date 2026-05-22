export type Role = 'admin' | 'medico' | 'atendimento';

enum Role2 {
  admin,
  medico,
  atendimento,
}

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface StatCard {
  label: string;
  value: string;
  trend: number;
  icon: string;
  highlight?: boolean;
  toggle?: boolean;
  roles: Role[];
}

export interface Appointment {
  initials: string;
  color: string;
  patient: string;
  type: string;
  time: string;
  doctorAvatar: string;
  doctor: string;
  doctorId: string;
  status: 'Confirmado' | 'Pendente' | 'Cancelado';
}

export interface NextPatient {
  name: string;
  type: string;
  time: string;
  initials: string;
  color: string;
}

export interface ChartData {
  newPatients: number[];
  completed: number[];
}

export interface ChatbotStats {
  percent: number;
  botInteractions: number;
  humanInteractions: number;
}
