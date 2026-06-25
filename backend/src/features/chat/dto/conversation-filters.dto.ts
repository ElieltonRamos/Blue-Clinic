// dto/conversation-filters.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ConversationStatus } from '../../../../generated/prisma/client.js';

export class ConversationFiltersDto {
  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;
}
