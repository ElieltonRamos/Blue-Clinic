import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { WhatssapModule } from '../whatssap/whatssap.module';

@Module({
  imports: [WhatssapModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
