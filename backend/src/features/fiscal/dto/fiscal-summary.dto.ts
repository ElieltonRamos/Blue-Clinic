import { ApiProperty } from '@nestjs/swagger';

export class FiscalSummaryDto {
  @ApiProperty({ description: 'Notas emitidas no período' })
  issuedCount: number;

  @ApiProperty({ description: 'Pagamentos sem nota emitida no período' })
  pendingCount: number;

  @ApiProperty({ description: 'Total de comissão abatida no período (R$)' })
  totalDeducted: number;
}
