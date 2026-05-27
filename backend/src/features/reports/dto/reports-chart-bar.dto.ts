// dto/reports-chart-bar.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ReportsChartBarDto {
  @ApiProperty({ example: 'JAN' })
  month: string;

  @ApiProperty({ example: 42390.5 })
  realized: number;
}
