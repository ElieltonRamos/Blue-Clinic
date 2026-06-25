import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ExpenseStatus } from '../../../../generated/prisma/client.js';

export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: 'Aluguel Consultório' })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  description?: string;

  @ApiPropertyOptional({ example: 'Infraestrutura' })
  @IsOptional()
  @IsString({ message: 'Categoria deve ser um texto' })
  category?: string;

  @ApiPropertyOptional({ example: 3500.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  value?: number;

  @ApiPropertyOptional({ example: '2024-10-05' })
  @IsOptional()
  @IsDateString({}, { message: 'Data deve estar no formato YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus, { message: 'Status deve ser pago ou pendente' })
  status?: ExpenseStatus;
}
