// update-appointment-type.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsPositive,
  MinLength,
  IsOptional,
} from 'class-validator';

export class UpdateAppointmentTypeDto {
  @ApiPropertyOptional({ description: 'Nome do tipo de consulta' })
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name?: string;

  @ApiPropertyOptional({ description: 'Duração em minutos' })
  @IsOptional()
  @IsInt({ message: 'Duração deve ser um número inteiro' })
  @IsPositive({ message: 'Duração deve ser maior que zero' })
  duration?: number;
}
