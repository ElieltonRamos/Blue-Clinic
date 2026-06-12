/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// dto/conversation-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from '../../../../generated/prisma/client.js';

export class ConversationResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() phone: string;
  @ApiPropertyOptional() patientName: string | null;
  @ApiPropertyOptional() lastMessage: string | null;
  @ApiPropertyOptional() lastMessageAt: Date | null;
  @ApiProperty({ enum: ConversationStatus }) status: ConversationStatus;
  @ApiProperty() unread: number;

  constructor(conversation: any) {
    this.id = conversation.id;
    this.phone = conversation.phone;
    this.patientName = conversation.patient?.name ?? null;
    this.lastMessage = conversation.lastMessage;
    this.lastMessageAt = conversation.lastMessageAt;
    this.status = conversation.status;
    this.unread = conversation.unread;
  }
}
