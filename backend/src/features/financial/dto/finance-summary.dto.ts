// finance-summary.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FinanceSummaryDto {
  @ApiProperty({ example: 14250.0 })
  totalEntradas: number;

  @ApiProperty({
    example: 12,
    description: 'Variação percentual em relação ao período anterior',
  })
  entradasChange: number;

  @ApiProperty({ example: 2410.5 })
  totalSaidas: number;

  @ApiProperty({ example: 14 })
  saidasCount: number;
}
