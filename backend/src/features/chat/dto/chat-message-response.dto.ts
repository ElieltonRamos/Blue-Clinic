/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// dto/chat-message-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MessageSender,
  MessageStatus,
} from '../../../../generated/prisma/client.js';

export class ChatMessageResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() conversationId: number;
  @ApiProperty({ enum: MessageSender }) sender: MessageSender;
  @ApiProperty() text: string;
  @ApiProperty() sentAt: Date;
  @ApiPropertyOptional() senderName: string | null;
  @ApiPropertyOptional() senderRole: string | null;
  @ApiPropertyOptional() wamid: string | null;
  @ApiPropertyOptional({ enum: MessageStatus }) status: MessageStatus | null;

  constructor(msg: any) {
    this.id = msg.id;
    this.conversationId = msg.conversationId;
    this.sender = msg.sender;
    this.text = msg.text;
    this.sentAt = msg.sentAt;
    this.senderName = msg.senderName ?? null;
    this.senderRole = msg.senderRole ?? null;
    this.wamid = msg.wamid ?? null;
    this.status = msg.status ?? null;
  }
}
