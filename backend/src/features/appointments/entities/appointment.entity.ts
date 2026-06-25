import {
  AppointmentStatus,
  BlockedSlotType,
  PaymentMethod,
  RecurrenceType,
} from '../../../../generated/prisma/client.js';

export class AppointmentEntity {
  id: number;
  doctorId: number;
  patientId: number;
  specialty: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  responsible: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentEntryEntity {
  id: number;
  paymentId: number;
  method: PaymentMethod;
  amount: number;
  change: number;
}

export class PaymentEntity {
  id: number;
  appointmentId: number;
  date: Date;
  patient: string | null;
  doctor: string | null;
  registeredById: number;
  value: number;
  entries?: PaymentEntryEntity[];
}

export class BlockedSlotEntity {
  id: number;
  companyId: number;
  doctorId: number | null;
  date: Date | null;
  startTime: string;
  endTime: string;
  label: string;
  type: BlockedSlotType;
  recurrence: RecurrenceType;
  color: string | null;
  createdAt: Date;
}
