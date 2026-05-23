import { IsString, IsOptional, IsInt, IsEnum, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  BlockedSlotType,
  RecurrenceType,
} from '../../../../generated/prisma/client.js';

export class UpdateBlockedSlotDto {
  @ApiPropertyOptional({
    description: 'ID do médico. Envie null para tornar o bloqueio global',
    example: 1,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'doctorId deve ser um número inteiro' })
  doctorId?: number | null;

  @ApiPropertyOptional({
    description: 'Data de início do bloqueio (YYYY-MM-DD)',
    example: '2026-06-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate deve estar no formato YYYY-MM-DD',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Data de término do bloqueio (YYYY-MM-DD). Envie null para remover',
    example: '2026-06-30',
    nullable: true,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate deve estar no formato YYYY-MM-DD',
  })
  endDate?: string | null;

  @ApiPropertyOptional({
    description: 'Horário de início do bloqueio (HH:MM)',
    example: '12:00',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'startTime deve estar no formato HH:MM',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Horário de término do bloqueio (HH:MM)',
    example: '13:00',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime deve estar no formato HH:MM' })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Descrição/motivo do bloqueio',
    example: 'Almoço',
  })
  @IsOptional()
  @IsString({ message: 'label deve ser uma string' })
  label?: string;

  @ApiPropertyOptional({
    description: 'Tipo do bloqueio',
    enum: BlockedSlotType,
    example: 'break',
  })
  @IsOptional()
  @IsEnum(BlockedSlotType, { message: 'type deve ser: break ou external' })
  type?: BlockedSlotType;

  @ApiPropertyOptional({
    description: 'Recorrência do bloqueio',
    enum: RecurrenceType,
    example: 'weekly',
  })
  @IsOptional()
  @IsEnum(RecurrenceType, {
    message: 'recurrence deve ser: none, daily, weekly ou monthly',
  })
  recurrence?: RecurrenceType;

  @ApiPropertyOptional({
    description: 'Cor de exibição no calendário (hex). Envie null para remover',
    example: '#FF5733',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'color deve ser uma string' })
  color?: string | null;
}
