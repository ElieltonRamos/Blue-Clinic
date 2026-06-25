import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class AppointmentFiltersDto {
  @ApiPropertyOptional({
    description: 'Mês de referência no formato YYYY-MM',
    example: '2026-05',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'O mês deve estar no formato YYYY-MM' })
  month?: string;

  @ApiPropertyOptional({
    description: 'ID do médico',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number) // Converte a string do query param para Number
  @IsInt({ message: 'doctorId deve ser um número inteiro' })
  doctorId?: number;

  @ApiPropertyOptional({
    description: 'Status do agendamento',
    example: 'CONFIRMADO', // Altere para o seu enum de status caso possua
  })
  @IsOptional()
  @IsString()
  // @IsEnum(StatusEnum) // Descomente e use se você tiver um enum definido
  status?: string;
}
