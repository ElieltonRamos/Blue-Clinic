// dto/reports-doctor.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportsDoctorDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Dr. Ricardo Alencar' })
  name: string;

  @ApiProperty({ example: 'RA' })
  avatar: string;

  @ApiProperty({ example: 'Cardiologia' })
  specialty: string;

  @ApiProperty({ example: 214 })
  appointments: number;

  @ApiProperty({ example: 'R$ 18.240,00' })
  revenue: string;

  @ApiPropertyOptional({ example: 4.9, nullable: true })
  rating: number | null;
}
