// available-slots.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, Matches } from 'class-validator';

export class AvailableSlotsQueryDto {
  @ApiProperty({ description: 'ID do médico' })
  @IsInt({ message: 'ID do médico deve ser um número inteiro' })
  @IsPositive({ message: 'ID do médico deve ser maior que zero' })
  doctorId: number;

  @ApiProperty({ description: 'Data (YYYY-MM-DD)', example: '2025-06-10' })
  @IsString({ message: 'Data deve ser uma string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Data deve estar no formato YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({ description: 'ID do tipo de consulta' })
  @IsInt({ message: 'ID do tipo de consulta deve ser um número inteiro' })
  @IsPositive({ message: 'ID do tipo de consulta deve ser maior que zero' })
  appointmentTypeId: number;
}

export type SlotStatus = 'available' | 'booked' | 'blocked';

export class SlotDto {
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty({ enum: ['available', 'booked', 'blocked'] }) status: SlotStatus;
  @ApiProperty({ required: false }) reason?: string; // nome do paciente ou label do bloqueio
}
