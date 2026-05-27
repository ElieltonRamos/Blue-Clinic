// dto/reports-specialty.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ReportsSpecialtyDto {
  @ApiProperty({ example: 'Cardiologia' })
  name: string;

  @ApiProperty({ example: 452 })
  count: number;

  @ApiProperty({ example: 452 })
  max: number;
}
