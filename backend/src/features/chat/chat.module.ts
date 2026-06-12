import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { WhatssapModule } from '../whatssap/whatssap.module';
import { ChatGatewayModule } from './chat-gateway.module';

@Module({
  imports: [WhatssapModule, ChatGatewayModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
