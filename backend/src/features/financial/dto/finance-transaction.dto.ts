// finance-transaction.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FinanceTransactionDto {
  @ApiProperty({ example: 'payment-1' })
  id: string;

  @ApiProperty({ enum: ['entrada', 'saida'], example: 'entrada' })
  type: 'entrada' | 'saida';

  @ApiProperty({ example: '2024-10-14' })
  date: string;

  @ApiProperty({ example: '14:30' })
  time: string;

  @ApiProperty({ example: 'Pedro Alvares' })
  patient: string;

  @ApiProperty({ example: 'Dr. Ricardo Silva' })
  doctor: string;

  @ApiProperty({ example: 'Juliana M.' })
  registeredBy: string;

  @ApiProperty({ example: 450.0 })
  value: number;

  @ApiProperty({
    enum: ['pix', 'dinheiro', 'cartao', 'convenio'],
    isArray: true,
    example: ['pix', 'cartao'],
  })
  methods: Array<'pix' | 'dinheiro' | 'cartao' | 'convenio'>;
}
