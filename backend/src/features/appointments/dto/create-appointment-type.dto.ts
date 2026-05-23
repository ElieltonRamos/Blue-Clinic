// create-appointment-type.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsPositive, MinLength } from 'class-validator';

export class CreateAppointmentTypeDto {
  @ApiProperty({ description: 'Nome do tipo de consulta', example: 'Consulta' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  name: string;

  @ApiProperty({ description: 'Duração em minutos', example: 30 })
  @IsInt({ message: 'Duração deve ser um número inteiro' })
  @IsPositive({ message: 'Duração deve ser maior que zero' })
  duration: number;
}
