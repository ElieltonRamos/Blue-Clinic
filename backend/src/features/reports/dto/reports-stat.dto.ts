// dto/reports-stat.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ReportsStatDto {
  @ApiProperty({ example: 'Total de Consultas' })
  label: string;

  @ApiProperty({ example: '1.284' })
  value: string;

  @ApiProperty({ example: 12 })
  trend: number;

  @ApiProperty({ enum: ['primary', 'success', 'danger', 'info'] })
  accent: 'primary' | 'success' | 'danger' | 'info';
}
