import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PatientStatus } from '../../../../generated/prisma/client.js';

export class PatientFiltersDto {
  @ApiPropertyOptional({ example: 'João' })
  @IsString({ message: 'Busca deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: PatientStatus, example: PatientStatus.Ativo })
  @IsEnum(PatientStatus, { message: 'Status inválido.' })
  @IsOptional()
  status?: PatientStatus;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsInt({ message: 'Skip deve ser um número inteiro.' })
  @Min(0, { message: 'Skip não pode ser negativo.' })
  @IsOptional()
  @Type(() => Number)
  skip?: number = 0;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsInt({ message: 'Take deve ser um número inteiro.' })
  @Min(1, { message: 'Take deve ser no mínimo 1.' })
  @IsOptional()
  @Type(() => Number)
  take?: number = 20;
}
