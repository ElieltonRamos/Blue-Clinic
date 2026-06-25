// dto/update-conversation-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ConversationStatus } from '../../../../generated/prisma/client.js';

export class UpdateConversationStatusDto {
  @ApiProperty({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  status: ConversationStatus;
}
