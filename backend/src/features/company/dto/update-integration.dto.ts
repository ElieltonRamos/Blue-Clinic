import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateIntegrationDto {
  @ApiPropertyOptional({ example: '1082165641657424' })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @ApiPropertyOptional({ example: 'EAAVyy...' })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  botEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  autoConfirm?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoReminder?: boolean;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsNumber()
  reminderHours?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  humanFallback?: boolean;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  whatsappBusinessAccountId?: string;
}
