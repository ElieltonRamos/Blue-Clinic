export interface AppointmentType {
  id: number;
  companyId: number;
  name: string;
  duration: number;
  active: boolean;
}

export interface DoctorScheduleSummary {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface DoctorCommissionSummary {
  appointmentTypeId: number;
  price: number;
}

export interface DoctorSummary {
  id: number;
  name: string;
  specialty: string;
  avatarUrl?: string | null;
  schedules: DoctorScheduleSummary[];
  commissions: DoctorCommissionSummary[];
}

export interface PatientSummary {
  id: number;
  name: string;
  phone?: string | null;
  cpf?: string | null;
}

export type SlotStatus = 'available' | 'booked' | 'blocked';

export interface Slot {
  startTime: string;
  endTime: string;
  status: SlotStatus;
  reason?: string;
}

export interface CreateAppointmentRequest {
  doctorId: number;
  patientId: number;
  appointmentTypeId: number;
  specialty?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  responsible?: string;
  notes?: string;
}

export interface AppointmentResponse {
  id: number;
  doctorId: number;
  patientId: number;
  appointmentTypeId?: number | null;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  feeOverride?: number | null;
  responsible?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Estado interno dos steps do modal
export type ModalStep = 'doctor' | 'type' | 'date' | 'slot' | 'patient' | 'confirm';
