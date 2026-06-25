import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BlockedSlotType,
  RecurrenceType,
} from '../../../../generated/prisma/client.js';

export class CreateBlockedSlotDto {
  @ApiPropertyOptional({
    description: 'ID do médico. Se omitido, o bloqueio é global para a clínica',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'doctorId deve ser um número inteiro' })
  doctorId?: number;

  @ApiProperty({
    description: 'Data de início do bloqueio (YYYY-MM-DD)',
    example: '2026-06-01',
  })
  @IsNotEmpty({ message: 'startDate é obrigatório' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate deve estar no formato YYYY-MM-DD',
  })
  startDate: string;

  @ApiPropertyOptional({
    description:
      'Data de término do bloqueio (YYYY-MM-DD). Para bloqueio pontual, omita ou repita startDate. Para recorrências, define o "até quando"',
    example: '2026-06-30',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate deve estar no formato YYYY-MM-DD',
  })
  endDate?: string;

  @ApiProperty({
    description: 'Horário de início do bloqueio (HH:MM)',
    example: '12:00',
  })
  @IsNotEmpty({ message: 'startTime é obrigatório' })
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'startTime deve estar no formato HH:MM',
  })
  startTime: string;

  @ApiProperty({
    description: 'Horário de término do bloqueio (HH:MM)',
    example: '13:00',
  })
  @IsNotEmpty({ message: 'endTime é obrigatório' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime deve estar no formato HH:MM' })
  endTime: string;

  @ApiProperty({
    description: 'Descrição/motivo do bloqueio',
    example: 'Almoço',
  })
  @IsNotEmpty({ message: 'label é obrigatório' })
  @IsString({ message: 'label deve ser uma string' })
  label: string;

  @ApiProperty({
    description: 'Tipo do bloqueio',
    enum: BlockedSlotType,
    example: 'break',
  })
  @IsNotEmpty({ message: 'type é obrigatório' })
  @IsEnum(BlockedSlotType, { message: 'type deve ser: break ou external' })
  type: BlockedSlotType;

  @ApiPropertyOptional({
    description: 'Recorrência do bloqueio',
    enum: RecurrenceType,
    default: 'none',
    example: 'weekly',
  })
  @IsOptional()
  @IsEnum(RecurrenceType, {
    message: 'recurrence deve ser: none, daily, weekly ou monthly',
  })
  recurrence?: RecurrenceType;

  @ApiPropertyOptional({
    description: 'Cor de exibição no calendário (hex)',
    example: '#FF5733',
  })
  @IsOptional()
  @IsString({ message: 'color deve ser uma string' })
  color?: string;
}
