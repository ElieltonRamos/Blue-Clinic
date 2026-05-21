/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export class AppointmentResponseDto {
  id: string;
  doctorId: string;
  patientName: string;
  specialty: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string;
  endTime: string;
  status: string;
  responsible?: string;

  constructor(data: any) {
    this.id = String(data.id);
    this.doctorId = String(data.doctorId);
    this.patientName = data.patient.name;
    this.specialty = data.specialty;
    this.date = data.date.toISOString().split('T')[0];
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.status = data.status;
    this.responsible = data.responsible ?? undefined;
  }
}
