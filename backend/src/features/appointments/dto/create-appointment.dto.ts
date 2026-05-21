export class CreateAppointmentDto {
  doctorId: number;
  patientId: number;
  date: string; // ISO date string
  startTime: string; // 'HH:MM'
  endTime: string;
  specialty?: string;
  responsible?: string;
  notes?: string;
}
