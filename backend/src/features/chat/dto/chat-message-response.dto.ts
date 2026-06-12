/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// dto/chat-message-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { MessageSender } from '../../../../generated/prisma/client.js';

export class ChatMessageResponseDto {
  @ApiProperty() id: number;
  @ApiProperty({ enum: MessageSender }) sender: MessageSender;
  @ApiProperty() text: string;
  @ApiProperty() sentAt: Date;

  constructor(msg: any) {
    this.id = msg.id;
    this.sender = msg.sender;
    this.text = msg.text;
    this.sentAt = msg.sentAt;
  }
}
