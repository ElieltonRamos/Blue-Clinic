// dto/appointment-today.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentTodayDoctorDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Dr. João Silva' })
  name: string;
}

export class AppointmentTodayPatientDto {
  @ApiProperty({ example: 'Maria Souza' })
  name: string;
}

export class AppointmentTodayTypeDto {
  @ApiProperty({ example: 'Consulta Geral' })
  name: string;
}

export class AppointmentTodayDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '09:00' })
  startTime: string;

  @ApiProperty({
    example: 'confirmed',
    enum: [
      'confirmed',
      'pending',
      'checkin',
      'finished',
      'paid',
      'cancelled',
      'rescheduled',
    ],
  })
  status: string;

  @ApiProperty({ type: () => AppointmentTodayPatientDto })
  patient: AppointmentTodayPatientDto;

  @ApiPropertyOptional({ type: () => AppointmentTodayTypeDto, nullable: true })
  appointmentType: AppointmentTodayTypeDto | null;

  @ApiProperty({ type: () => AppointmentTodayDoctorDto })
  doctor: AppointmentTodayDoctorDto;
}
