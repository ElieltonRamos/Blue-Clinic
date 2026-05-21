export class BlockedSlotResponseDto {
  id: number;
  doctorId: number | null;
  doctorName: string | null;
  label: string;
  startTime: string;
  endTime: string;
  type: string;
  recurrence: string;
  color: string | null;
  date: string | null;

  constructor(data: any) {
    this.id = data.id;
    this.doctorId = data.doctorId;
    this.doctorName = data.doctor?.name ?? null;
    this.label = data.label;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.type = data.type;
    this.recurrence = data.recurrence;
    this.color = data.color;
    this.date = data.date
      ? (data.date as Date).toISOString().split('T')[0]
      : null;
  }
}
