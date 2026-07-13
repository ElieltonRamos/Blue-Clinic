// update-commission.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsEnum, IsOptional, Min } from 'class-validator';
import { CommissionType } from '../../../../generated/prisma/client.js';
import { Type } from 'class-transformer';

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
  @Min(0, { message: 'Taxa do médico deve ser maior ou igual a zero' })
  @Type(() => Number)
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
  @Min(0, { message: 'Taxa da clínica deve ser maior ou igual a zero' })
  @Type(() => Number)
  clinicRate?: number;

  @ApiProperty({ description: 'Valor cobrado do paciente', example: 300.0 })
  @IsOptional()
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @IsPositive({ message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    enum: CommissionType,
    description:
      'Tipo de abatimento aplicado à comissão do médico quando há nota fiscal emitida. Envie null para remover o abatimento configurado.',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(CommissionType, { message: 'Tipo de abatimento fiscal inválido' })
  nfDeductionType?: CommissionType | null;

  @ApiPropertyOptional({
    description:
      'Valor abatido da comissão do médico quando há nota fiscal emitida. Envie null para remover o abatimento configurado.',
    example: 10,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Valor de abatimento fiscal deve ser um número' })
  @Min(0, { message: 'Valor de abatimento fiscal não pode ser negativo' })
  @Type(() => Number)
  nfDeductionValue?: number | null;
}
