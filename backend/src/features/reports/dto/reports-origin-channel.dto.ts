// dto/reports-origin-channel.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ReportsOriginChannelDto {
  @ApiProperty({ example: 'WhatsApp' })
  label: string;

  @ApiProperty({ example: 60 })
  percent: number;

  @ApiProperty({ example: 'var(--color-primary)' })
  color: string;
}
