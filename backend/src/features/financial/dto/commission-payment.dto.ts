import { ApiProperty } from '@nestjs/swagger';

export class CommissionPaymentDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Dr. Ricardo Silva' })
  doctorName: string;

  @ApiProperty({ example: 'João da Silva' })
  patientName: string;

  @ApiProperty({ example: 245.0 })
  value: number;

  @ApiProperty({ example: 'Maria Atendente' })
  paidByName: string;

  @ApiProperty({ example: '2025-06-18T14:30:00.000Z' })
  paidAt: string;
}
