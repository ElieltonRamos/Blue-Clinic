export type PatientStatus = 'Ativo' | 'Inativo';

export interface Patient {
  id: string;
  initials: string;
  avatarColor: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  lastVisit: string;
  status: PatientStatus;
}

export interface ConsultationHistory {
  title: string;
  date: string;
  doctor: string;
  note?: string;
  active: boolean;
}

export interface PatientDocument {
  name: string;
  size: string;
  type: 'pdf' | 'image';
}

export interface PatientDetail {
  id: string;
  name: string;
  memberSince: string;
  whatsappActive: boolean;
  lgpdConsent: boolean;
  consultationHistory: ConsultationHistory[];
  documents: PatientDocument[];
  nextAppointment?: {
    label: string;
    location: string;
  };
}
