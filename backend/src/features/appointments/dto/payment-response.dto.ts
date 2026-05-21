export class PaymentResponseDto {
  id: number;
  appointmentId: number;
  date: string;
  patient: string | null;
  doctor: string | null;
  value: number;
  entries: { method: string; amount: number; change: number }[];

  constructor(data: any) {
    this.id = data.id;
    this.appointmentId = data.appointmentId;
    this.date = (data.date as Date).toISOString();
    this.patient = data.patient;
    this.doctor = data.doctor;
    this.value = Number(data.value);
    this.entries = data.entries.map((e: any) => ({
      method: e.method,
      amount: Number(e.amount),
      change: Number(e.change),
    }));
  }
}
