import { ApiProperty } from '@nestjs/swagger';

export class ProfessionalRevenueAppointmentDto {
  @ApiProperty({ example: '2025-06-18' })
  date: string;

  @ApiProperty({ example: '09:00' })
  startTime: string;

  @ApiProperty({ example: 'Clínico Geral' })
  specialty: string;

  @ApiProperty({ example: 'Consulta Padrão', nullable: true })
  appointmentType: string | null;

  @ApiProperty({ example: 'João da Silva' })
  patientName: string;

  @ApiProperty({ example: 350.0 })
  paymentValue: number;

  @ApiProperty({ example: 245.0 })
  doctorEarnings: number;

  @ApiProperty({ example: 0.0 })
  discount: number;

  @ApiProperty({ example: '2025-06-18' })
  paymentDate: string;
}

export class ProfessionalRevenueDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Dr. Ricardo Silva' })
  name: string;

  @ApiProperty({
    example: '👨‍⚕️',
    description: 'URL do avatar ou emoji fallback',
  })
  avatar: string;

  @ApiProperty({ example: 8450.0 })
  value: number;

  @ApiProperty({ type: () => [ProfessionalRevenueAppointmentDto] })
  appointments: ProfessionalRevenueAppointmentDto[];
}
