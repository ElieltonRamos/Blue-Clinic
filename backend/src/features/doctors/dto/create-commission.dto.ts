import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { CommissionType } from '../../../../generated/prisma/client.js';
import { Type } from 'class-transformer';

export class CreateCommissionDto {
  @ApiProperty({ description: 'ID do tipo de consulta' })
  @IsInt({ message: 'ID do tipo de consulta deve ser um número inteiro' })
  @IsPositive({ message: 'ID do tipo de consulta deve ser maior que zero' })
  @Type(() => Number)
  appointmentTypeId: number;

  @ApiProperty({
    enum: CommissionType,
    description: 'Tipo de comissão do médico (percentage ou fixed)',
  })
  @IsEnum(CommissionType, { message: 'Tipo de comissão do médico inválido' })
  doctorRateType: CommissionType;

  @ApiProperty({ description: 'Taxa de comissão do médico', example: 70 })
  @IsNumber({}, { message: 'Taxa do médico deve ser um número' })
  @Min(0, { message: 'Taxa do médico não pode ser negativa' })
  @Type(() => Number)
  doctorRate: number;

  @ApiProperty({
    enum: CommissionType,
    description: 'Tipo de comissão da clínica (percentage ou fixed)',
  })
  @IsEnum(CommissionType, { message: 'Tipo de comissão da clínica inválido' })
  clinicRateType: CommissionType;

  @ApiProperty({ description: 'Taxa de comissão da clínica', example: 30 })
  @IsNumber({}, { message: 'Taxa da clínica deve ser um número' })
  @Min(0, { message: 'Taxa da clínica não pode ser negativa' })
  @Type(() => Number)
  clinicRate: number;

  @ApiProperty({ description: 'Valor cobrado do paciente', example: 300.0 })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @IsPositive({ message: 'Valor deve ser maior que zero' })
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    enum: CommissionType,
    nullable: true,
    description: 'Tipo de abatimento fiscal',
  })
  @IsOptional()
  @IsEnum(CommissionType, { message: 'Tipo de abatimento fiscal inválido' })
  nfDeductionType?: CommissionType | null;

  @ApiPropertyOptional({ nullable: true, example: 10 })
  @IsOptional()
  @IsNumber({}, { message: 'Valor de abatimento fiscal deve ser um número' })
  @Min(0, { message: 'Valor de abatimento fiscal não pode ser negativo' })
  @Type(() => Number)
  nfDeductionValue?: number | null;
}
