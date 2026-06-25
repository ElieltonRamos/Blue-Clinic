// dto/reports-summary.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { ReportsStatDto } from './reports-stat.dto.js';
import { ReportsChartBarDto } from './reports-chart-bar.dto.js';
import { ReportsOriginChannelDto } from './reports-origin-channel.dto.js';
import { ReportsSpecialtyDto } from './reports-specialty.dto.js';

export class ReportsSummaryDto {
  @ApiProperty({ type: [ReportsStatDto] })
  stats: ReportsStatDto[];

  @ApiProperty({ type: [ReportsChartBarDto] })
  chartBars: ReportsChartBarDto[];

  @ApiProperty({ type: [ReportsOriginChannelDto] })
  originChannels: ReportsOriginChannelDto[];

  @ApiProperty({ example: 1284 })
  originTotal: number;

  @ApiProperty({ type: [ReportsSpecialtyDto] })
  specialties: ReportsSpecialtyDto[];
}
