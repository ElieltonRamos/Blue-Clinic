export type BotStep =
  | 'MENU'
  | 'REGISTER_NAME'
  | 'REGISTER_CPF'
  | 'SELECT_SPECIALTY'
  | 'SELECT_APPOINTMENT_TYPE'
  | 'SELECT_DOCTOR'
  | 'SELECT_DATE'
  | 'SELECT_SLOT'
  | 'CONFIRM_APPOINTMENT'
  | 'CANCEL_CONFIRM'
  | 'IDLE';

export interface BotData {
  patientId?: number;
  name?: string;
  specialty?: string;
  appointmentTypeId?: number;
  appointmentTypeName?: string;
  appointmentTypeDuration?: number;
  doctorId?: number;
  doctorName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  cancelAppointmentId?: number;
}

export type SendFn = (msg: string) => Promise<void>;
