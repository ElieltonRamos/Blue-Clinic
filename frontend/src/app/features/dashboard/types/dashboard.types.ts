export type Role = 'admin' | 'medico' | 'atendimento';

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
  status: 'Confirmado' | 'Pendente' | 'Cancelado' | 'Concluído' | 'Reagendado' | 'Bloqueado';
}

export interface NextPatient {
  name: string;
  type: string;
  time: string;
  initials: string;
  color: string;
}

export interface AppointmentChartData {
  agendados: number[]; // confirmed + pending + checkin
  concluidos: number[]; // finished + paid
  cancelados: number[]; // cancelled
  reagendados: number[]; // rescheduled
}

export interface ChatbotStats {
  percent: number;
  botInteractions: number;
  humanInteractions: number;
}

export interface DashboardStats {
  totalConsultasHoje: number;
  totalConsultasHojeTrend: number;
  receitaMensal: number;
  receitaMensalTrend: number;
  taxaFaltas: number;
  taxaFaltasTrend: number;
  chatsAtivos: number;
}

export interface DashboardData {
  stats: DashboardStats;
  appointments: Appointment[];
  nextPatient: NextPatient | null;
  chartMonths: string[];
  chartData: AppointmentChartData;
  chatbotStats: ChatbotStats;
}
