// create-expense.dto.ts
import { IsDateString, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExpenseStatus } from '../../../../generated/prisma/client.js';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Aluguel Consultório' })
  @IsString({ message: 'Descrição deve ser um texto' })
  description: string;

  @ApiProperty({ example: 'Infraestrutura' })
  @IsString({ message: 'Categoria deve ser um texto' })
  category: string;

  @ApiProperty({ example: 3500.0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  value: number;

  @ApiProperty({ example: '2024-10-05' })
  @IsDateString({}, { message: 'Data deve estar no formato YYYY-MM-DD' })
  date: string;

  @ApiProperty({ enum: ExpenseStatus, example: 'pendente' })
  @IsEnum(ExpenseStatus, { message: 'Status deve ser pago ou pendente' })
  status: ExpenseStatus;
}
