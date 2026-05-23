export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

export const DAY_SHORT: Record<DayOfWeek, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

export interface DoctorSchedule {
  id: number;
  doctorId: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface AppointmentTypeSummary {
  id: number;
  name: string;
  duration: number;
}

export interface DoctorCommission {
  id: number;
  appointmentTypeId: number;
  doctorRateType: 'percentage' | 'fixed';
  doctorRate: number;
  clinicRateType: 'percentage' | 'fixed';
  clinicRate: number;
  appointmentType: AppointmentTypeSummary;
}

export interface DoctorProfile {
  id: number;
  name: string;
  specialty: string;
  avatarUrl?: string | null;
  schedules: DoctorSchedule[];
  commissions: DoctorCommission[];
}

export interface DoctorSummary {
  id: number;
  name: string;
  specialty: string;
  avatarUrl?: string | null;
  schedules: DoctorSchedule[];
  commissions: DoctorCommission[];
}

export interface CreateScheduleRequest {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  active?: boolean;
}

export interface UpdateScheduleRequest {
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  active?: boolean;
}

export type CommissionRateType = 'percentage' | 'fixed';

export interface CreateCommissionRequest {
  appointmentTypeId: number;
  doctorRateType: CommissionRateType;
  doctorRate: number;
  clinicRateType: CommissionRateType;
  clinicRate: number;
}

export interface UpdateCommissionRequest {
  doctorRateType?: CommissionRateType;
  doctorRate?: number;
  clinicRateType?: CommissionRateType;
  clinicRate?: number;
}

export interface CommissionForm {
  appointmentTypeId: number | null;
  doctorRateType: CommissionRateType;
  doctorRate: number;
  clinicRateType: CommissionRateType;
  clinicRate: number;
}
