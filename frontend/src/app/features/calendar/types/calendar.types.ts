import { PaymentMethod } from '../../financial/types/financial.types';

export type AppointmentStatus =
  | 'confirmed'
  | 'pending'
  | 'checkin'
  | 'blocked'
  | 'external'
  | 'paid'
  | 'cancelled';

export interface Doctor {
  id: number;
  name: string;
  specialty: string;
  avatarUrl?: string;
}

export interface Appointment {
  id: number;
  doctorId: number;
  patientName: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  responsible?: string;
  notes?: string;
}

export interface BlockedSlot {
  id: number;
  companyId: number;
  doctorId: number | null;
  date?: string;
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

export interface PaymentMethodEntry {
  method: PaymentMethod;
  value: number;
}

export interface PaymentRecord {
  id: number;
  appointmentId: number;
  date: string;
  patient: string;
  doctor: string;
  value: number;
  entries: {
    id: number;
    method: PaymentMethod;
    amount: number;
    change: number;
  }[];
}

export interface CreatePaymentRequest {
  entries: {
    method: string;
    amount: number;
    change?: number;
  }[];
}
