/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../../../generated/prisma/client.js';

export class PaymentEntryDto {
  @ApiProperty() id: number;
  @ApiProperty({ enum: PaymentMethod }) method: PaymentMethod;
  @ApiProperty() amount: number;
  @ApiProperty() change: number;
}

export class PaymentResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() appointmentId: number;
  @ApiProperty() date: Date;
  @ApiProperty() patient: string | null;
  @ApiProperty() doctor: string | null;
  @ApiProperty() value: number;
  @ApiProperty() doctorEarnings: number;
  @ApiProperty() clinicEarnings: number;
  @ApiProperty({ type: () => [PaymentEntryDto] }) entries: PaymentEntryDto[];

  constructor(p: any) {
    this.id = p.id;
    this.appointmentId = p.appointmentId;
    this.date = p.date;
    this.patient = p.patient;
    this.doctor = p.doctor;
    this.value = Number(p.value);
    this.doctorEarnings = Number(p.doctorEarnings);
    this.clinicEarnings = Number(p.clinicEarnings);
    this.entries = (p.entries ?? []).map((e: any) => ({
      id: e.id,
      method: e.method,
      amount: Number(e.amount),
      change: Number(e.change),
    }));
  }
}
