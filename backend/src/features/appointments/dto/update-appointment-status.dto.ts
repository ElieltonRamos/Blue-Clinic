import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../../generated/prisma/client.js';

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    enum: AppointmentStatus,
    description: 'Novo status do agendamento',
  })
  @IsEnum(AppointmentStatus, { message: 'Status inválido' })
  status: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Motivo do cancelamento ou remarcação' })
  @IsOptional()
  @IsString({ message: 'Motivo deve ser um texto' })
  cancellationReason?: string;
}
