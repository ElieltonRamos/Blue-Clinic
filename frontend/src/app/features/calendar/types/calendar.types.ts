export type AppointmentStatus = 'confirmed' | 'pending' | 'checkin' | 'blocked' | 'external';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatarUrl?: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientName: string;
  specialty: string;
  startTime: string; // 'HH:MM'
  endTime: string;
  status: AppointmentStatus;
  responsible?: string;
  startSlot: number; // px offset from top
  height: number;   // px height
}

export interface BlockedSlot {
  doctorId: string | 'all';
  label: string;
  startSlot: number;
  height: number;
  type: 'break' | 'external';
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
