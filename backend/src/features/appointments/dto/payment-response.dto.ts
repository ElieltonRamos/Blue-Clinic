/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../../generated/prisma/client.js';

export class PaymentEntryDto {
  @ApiProperty({ example: 1, description: 'ID do lançamento do pagamento' })
  id: number;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Forma de pagamento utilizada',
    example: 'PIX',
  })
  method: PaymentMethod;

  @ApiProperty({
    example: 150.0,
    description: 'Valor recebido nesta forma de pagamento',
  })
  amount: number;

  @ApiProperty({ example: 0.0, description: 'Valor de troco devolvido' })
  change: number;
}

export class PaymentResponseDto {
  @ApiProperty({ example: 12, description: 'ID do pagamento' })
  id: number;

  @ApiProperty({ example: 45, description: 'ID do agendamento vinculado' })
  appointmentId: number;

  @ApiProperty({
    example: '2026-05-23T13:49:00.000Z',
    description: 'Data e hora do pagamento',
  })
  date: Date;

  @ApiPropertyOptional({
    example: 'Carlos Henrique',
    description: 'Nome do paciente',
    nullable: true,
  })
  patient: string | null;

  @ApiPropertyOptional({
    example: 'Dra. Ana Costa',
    description: 'Nome do médico',
    nullable: true,
  })
  doctor: string | null;

  @ApiProperty({ example: 150.0, description: 'Valor total bruto cobrado' })
  value: number;

  @ApiProperty({
    example: 60.0,
    description: 'Repasse destinado ao médico (gorjetas são omitidas do lucro)',
  })
  doctorEarnings: number;

  @ApiProperty({
    example: 90.0,
    description: 'Faturamento retido pela clínica',
  })
  clinicEarnings: number;

  @ApiProperty({
    type: () => [PaymentEntryDto],
    description:
      'Detalhamento das formas de pagamento que compõem o valor total',
  })
  entries: PaymentEntryDto[];

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
