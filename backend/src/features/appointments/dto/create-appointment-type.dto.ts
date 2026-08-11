// create-appointment-type.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  IsPositive,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateAppointmentTypeDto {
  @ApiProperty({ description: 'Nome do tipo de consulta', example: 'Consulta' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiProperty({ description: 'Duração em minutos', example: 30 })
  @IsInt({ message: 'Duração deve ser um número inteiro' })
  @IsPositive({ message: 'Duração deve ser maior que zero' })
  @Type(() => Number)
  duration: number;

  @ApiPropertyOptional({
    description: 'Marca este tipo como consulta de retorno',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isRetorno deve ser um booleano' })
  isRetorno?: boolean;
}
