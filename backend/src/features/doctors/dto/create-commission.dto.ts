// create-commission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, IsEnum } from 'class-validator';
import { CommissionType } from '../../../../generated/prisma/client.js';

export class CreateCommissionDto {
  @ApiProperty({ description: 'ID do tipo de consulta' })
  @IsInt({ message: 'ID do tipo de consulta deve ser um número inteiro' })
  @IsPositive({ message: 'ID do tipo de consulta deve ser maior que zero' })
  appointmentTypeId: number;

  @ApiProperty({
    enum: CommissionType,
    description: 'Tipo de comissão do médico (percentage ou fixed)',
  })
  @IsEnum(CommissionType, { message: 'Tipo de comissão do médico inválido' })
  doctorRateType: CommissionType;

  @ApiProperty({ description: 'Taxa de comissão do médico', example: 70 })
  @IsNumber({}, { message: 'Taxa do médico deve ser um número' })
  @IsPositive({ message: 'Taxa do médico deve ser maior que zero' })
  doctorRate: number;

  @ApiProperty({
    enum: CommissionType,
    description: 'Tipo de comissão da clínica (percentage ou fixed)',
  })
  @IsEnum(CommissionType, { message: 'Tipo de comissão da clínica inválido' })
  clinicRateType: CommissionType;

  @ApiProperty({ description: 'Taxa de comissão da clínica', example: 30 })
  @IsNumber({}, { message: 'Taxa da clínica deve ser um número' })
  @IsPositive({ message: 'Taxa da clínica deve ser maior que zero' })
  clinicRate: number;
}
