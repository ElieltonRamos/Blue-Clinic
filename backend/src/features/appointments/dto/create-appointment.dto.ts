import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { AppointmentOrigin } from '../../../../generated/prisma/client';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsInt({ message: 'ID do médico deve ser um número inteiro' })
  @IsPositive({ message: 'ID do médico deve ser maior que zero' })
  @Type(() => Number)
  doctorId: number;

  @ApiProperty()
  @IsInt({ message: 'ID do paciente deve ser um número inteiro' })
  @IsPositive({ message: 'ID do paciente deve ser maior que zero' })
  @Type(() => Number)
  patientId: number;

  @ApiProperty()
  @IsInt({ message: 'ID do tipo de consulta deve ser um número inteiro' })
  @IsPositive({ message: 'ID do tipo de consulta deve ser maior que zero' })
  @Type(() => Number)
  appointmentTypeId: number;

  @ApiProperty({ example: '2025-06-10' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Data deve estar no formato YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'startTime deve estar no formato HH:MM',
  })
  startTime: string;

  @ApiProperty({ example: '08:30' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime deve estar no formato HH:MM' })
  endTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsible?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    enum: AppointmentOrigin,
    description: 'Canal de origem do agendamento. Padrão: presencial',
    example: AppointmentOrigin.whatsapp,
  })
  @IsOptional()
  @IsEnum(AppointmentOrigin, { message: 'Origem inválida' })
  origin?: AppointmentOrigin;
}
