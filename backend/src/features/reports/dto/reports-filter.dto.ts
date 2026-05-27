// dto/reports-filter.dto.ts

import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportsFilterDto {
  @ApiProperty({ example: '2024-01-01' })
  @IsDateString(
    {},
    { message: 'dateFrom deve ser uma data válida no formato YYYY-MM-DD' },
  )
  dateFrom: string;

  @ApiProperty({ example: '2024-01-31' })
  @IsDateString(
    {},
    { message: 'dateTo deve ser uma data válida no formato YYYY-MM-DD' },
  )
  dateTo: string;
}
