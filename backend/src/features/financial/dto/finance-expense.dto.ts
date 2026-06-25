// finance-expense.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FinanceExpenseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Aluguel Consultório' })
  description: string;

  @ApiProperty({ example: 'Infraestrutura' })
  category: string;

  @ApiProperty({ example: 3 })
  registeredById: number;

  @ApiProperty({ example: 'Juliana Meirelles' })
  registeredByName: string;

  @ApiProperty({ example: 3500.0 })
  value: number;

  @ApiProperty({ example: '2024-10-05' })
  date: string;

  @ApiProperty({ enum: ['pago', 'pendente'], example: 'pago' })
  status: 'pago' | 'pendente';
}
