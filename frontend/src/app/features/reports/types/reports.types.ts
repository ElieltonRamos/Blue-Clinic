export interface ReportStat {
  label: string;
  value: string;
  trend: number;
  accent: 'primary' | 'success' | 'danger' | 'info';
}

export interface ChartBar {
  month: string;
  realized: number;
}

export interface OriginChannel {
  label: string;
  percent: number;
  color: string;
}

export interface Specialty {
  name: string;
  count: number;
  max: number;
}

export interface DoctorRow {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  appointments: number;
  revenue: string;
  rating: number;
}
