// update-commission.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsEnum, IsOptional } from 'class-validator';
import { CommissionType } from '../../../../generated/prisma/client.js';

export class UpdateCommissionDto {
  @ApiPropertyOptional({
    enum: CommissionType,
    description: 'Tipo de comissão do médico',
  })
  @IsOptional()
  @IsEnum(CommissionType, { message: 'Tipo de comissão do médico inválido' })
  doctorRateType?: CommissionType;

  @ApiPropertyOptional({
    description: 'Taxa de comissão do médico',
    example: 70,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Taxa do médico deve ser um número' })
  @IsPositive({ message: 'Taxa do médico deve ser maior que zero' })
  doctorRate?: number;

  @ApiPropertyOptional({
    enum: CommissionType,
    description: 'Tipo de comissão da clínica',
  })
  @IsOptional()
  @IsEnum(CommissionType, { message: 'Tipo de comissão da clínica inválido' })
  clinicRateType?: CommissionType;

  @ApiPropertyOptional({
    description: 'Taxa de comissão da clínica',
    example: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Taxa da clínica deve ser um número' })
  @IsPositive({ message: 'Taxa da clínica deve ser maior que zero' })
  clinicRate?: number;
}
