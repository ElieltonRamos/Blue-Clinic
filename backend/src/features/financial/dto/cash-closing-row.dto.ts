// cash-closing-row.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CashClosingRowDto {
  @ApiProperty({ example: 'Maria Costa' })
  operator: string;

  @ApiProperty({ example: 450.0 })
  pix: number;

  @ApiProperty({ example: 100.0 })
  dinheiro: number;

  @ApiProperty({ example: 200.0 })
  cartao: number;

  @ApiProperty({ example: 0.0 })
  convenio: number;
}
