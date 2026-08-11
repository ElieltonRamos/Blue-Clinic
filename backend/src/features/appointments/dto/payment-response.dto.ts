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

  @ApiPropertyOptional({ example: 'Carlos Henrique', nullable: true })
  patient: string | null;

  @ApiPropertyOptional({ example: 'Dra. Ana Costa', nullable: true })
  doctor: string | null;

  @ApiProperty({ example: 150.0 })
  value: number;

  @ApiProperty({ example: 60.0 })
  doctorEarnings: number;

  @ApiProperty({ example: 90.0 })
  clinicEarnings: number;

  @ApiProperty({ example: 10.0 })
  discount: number;

  @ApiPropertyOptional({ example: 'Cardiologia', nullable: true })
  specialty: string | null;

  @ApiPropertyOptional({ example: '14:00', nullable: true })
  startTime: string | null;

  @ApiPropertyOptional({ example: 'Consulta de Retorno', nullable: true })
  appointmentTypeName: string | null;

  @ApiProperty({ type: () => [PaymentEntryDto] })
  entries: PaymentEntryDto[];

  @ApiProperty({
    description: 'Indica se a nota fiscal foi emitida (XML e PDF enviados)',
    example: false,
  })
  invoiceIssued: boolean;

  @ApiPropertyOptional({
    example: '/uploads/payments/1/123456-789.xml',
    nullable: true,
  })
  invoiceXmlUrl: string | null;

  @ApiPropertyOptional({
    example: '/uploads/payments/1/123456-789.pdf',
    nullable: true,
  })
  invoicePdfUrl: string | null;

  constructor(p: any) {
    this.id = p.id;
    this.appointmentId = p.appointmentId;
    this.date = p.date;
    this.patient = p.patient;
    this.doctor = p.doctor;
    this.value = Number(p.value);
    this.discount = Number(p.discount ?? 0);
    this.doctorEarnings = Number(p.doctorEarnings);
    this.clinicEarnings = Number(p.clinicEarnings);
    this.specialty = p.specialty ?? null;
    this.startTime = p.startTime ?? null;
    this.appointmentTypeName = p.appointmentTypeName ?? null;
    this.invoiceIssued = Boolean(p.invoiceIssued);
    this.invoiceXmlUrl = p.invoiceXmlUrl ?? null;
    this.invoicePdfUrl = p.invoicePdfUrl ?? null;
    this.entries = (p.entries ?? []).map((e: any) => ({
      id: e.id,
      method: e.method,
      amount: Number(e.amount),
      change: Number(e.change),
    }));
  }
}
