import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({
    description: 'Status do agendamento',
    example: 'CONFIRMADO',
  })
  @IsOptional()
  @IsString({ message: 'O status deve ser uma string' })
  status?: string;

  @ApiPropertyOptional({
    description: 'Data do atendimento no formato YYYY-MM-DD',
    example: '2026-05-23',
  })
  @IsOptional()
  @IsString({ message: 'A data deve ser uma string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data deve estar no formato YYYY-MM-DD',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Horário de início no formato HH:mm',
    example: '14:30',
  })
  @IsOptional()
  @IsString({ message: 'O horário de início deve ser uma string' })
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'O horário de início deve estar no formato HH:mm',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Horário de término no formato HH:mm',
    example: '15:00',
  })
  @IsOptional()
  @IsString({ message: 'O horário de término deve ser uma string' })
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'O horário de término deve estar no formato HH:mm',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Observações ou notas internas sobre o agendamento',
    example: 'Paciente necessita de retorno em 15 dias.',
  })
  @IsOptional()
  @IsString({ message: 'As observações devem ser uma string' })
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Nome do responsável pelo paciente (caso menor de idade ou dependente)',
    example: 'Carlos Henrique (Pai)',
  })
  @IsOptional()
  @IsString({ message: 'O nome do responsável deve ser uma string' })
  responsible?: string;
}
