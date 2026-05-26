import { PaymentMethod } from '../../financial/types/financial.types';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checkin'
  | 'paid'
  | 'finished'
  | 'cancelled'
  | 'blocked'
  | 'rescheduled'
  | 'external';

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  avatarUrl?: string;
}

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  currentMonth: boolean;
  isToday: boolean;
  label: string;
  appointments: Appointment[];
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  change: number;
}

export interface PaymentMethodConfig {
  method: PaymentMethod;
  label: string;
  icon: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  patientName: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  responsible?: string;
  notes?: string;
  cancellationReason?: string;
  price?: number;
}

export interface BlockedSlot {
  id: number;
  companyId: number;
  doctorId: number | null;
  startDate: string;
  endDate?: string | null;
  startTime: string;
  endTime: string;
  label: string;
  type: 'break' | 'external';
  recurrence: string;
  color?: string;
}

export interface BlockedHour {
  label: string;
  recurrence: string;
  color: 'error' | 'primary';
}

export interface AutoConfirmation {
  confirmed: number;
  total: number;
}

export interface PaymentResponseDto {
  id: number;
  appointmentId: number;
  date: string;
  patient: string;
  doctor: string;
  value: number;
  doctorEarnings: number;
  clinicEarnings: number;
  entries: PaymentEntry[];
}

export interface CreatePaymentRequest {
  entries: {
    method: string;
    amount: number;
    change?: number;
  }[];
}
