import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class FiscalFilterDto {
  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsDateString({}, { message: 'Data início inválida' })
  dateFrom: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsDateString({}, { message: 'Data fim inválida' })
  dateTo: string;

  @ApiPropertyOptional({ description: 'Filtrar por médico' })
  @IsOptional()
  @IsInt({ message: 'ID do médico deve ser um número inteiro' })
  @IsPositive({ message: 'ID do médico deve ser maior que zero' })
  @Type(() => Number)
  doctorId?: number;
}
