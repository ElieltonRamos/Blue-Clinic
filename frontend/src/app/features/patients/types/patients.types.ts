// patients.types.ts
export type PatientStatus = 'Ativo' | 'Inativo';

export interface PatientFilters {
  search?: string;
  status?: PatientStatus;
  skip?: number;
  take?: number;
}

export interface UploadDocumentResponse {
  name: string;
  size: string;
  type: string;
  url: string;
}

export interface Patient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  status: PatientStatus;
  lastVisit: string | null; // ISO date
  // gerados no front:
  initials?: string;
  avatarColor?: string;
}

export interface PatientListResponse {
  data: Patient[];
  total: number;
}

export interface ConsultationHistory {
  title: string;
  date: string; // ISO date
  doctor: string;
  notes: string | null;
  active: boolean;
}

export interface PatientDocument {
  name: string;
  size: string;
  type: string;
  url: string;
}

export interface PatientDetail {
  id: number;
  name: string;
  memberSince: string; // ISO date
  whatsappActive: boolean;
  lgpdConsent: boolean;
  consultationHistory: ConsultationHistory[];
  documents: PatientDocument[];
  nextAppointment: {
    date: string;
    startTime: string;
  } | null;
}

export interface CreatePatientRequest {
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
}

export interface UpdatePatientRequest {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  status?: PatientStatus;
  whatsappActive?: boolean;
  lgpdConsent?: boolean;
}
