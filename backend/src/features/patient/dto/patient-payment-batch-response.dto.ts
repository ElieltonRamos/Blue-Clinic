// dto/patient-payment-batch-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../../../generated/prisma/enums';

export class PatientPaymentBatchItemDto {
  @ApiProperty({ example: 12 })
  appointmentId: number;

  @ApiProperty({ example: '2024-03-15T10:00:00.000Z' })
  date: string;

  @ApiProperty({ example: 'Dr. Carlos Silva' })
  doctor: string;

  @ApiProperty({ example: 'Cardiologia', nullable: true })
  specialty: string | null;

  @ApiProperty({ example: 'Consulta de Rotina', nullable: true })
  appointmentTypeName: string | null;

  @ApiProperty({ example: 150.0 })
  value: number;

  @ApiProperty({ example: 0 })
  discount: number;
}

export class PaymentEntryDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.pix })
  method: PaymentMethod;

  @ApiProperty({ example: 150.0 })
  amount: number;

  @ApiProperty({ example: 0 })
  change: number;
}

export class PatientPaymentBatchResponseDto {
  @ApiProperty({ example: 'João da Silva' })
  patient: string;

  @ApiProperty({ type: [PatientPaymentBatchItemDto] })
  items: PatientPaymentBatchItemDto[];

  @ApiProperty({ example: 300.0 })
  totalValue: number;

  @ApiProperty({ example: 0 })
  totalDiscount: number;

  @ApiProperty({ type: [PaymentEntryDto] })
  entries: PaymentEntryDto[];
}
