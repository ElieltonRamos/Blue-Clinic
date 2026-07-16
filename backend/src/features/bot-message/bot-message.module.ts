import { Module } from '@nestjs/common';
import { BotMessageService } from './bot-message.service';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ChatGatewayModule } from '../chat/chat-gateway.module.js';

@Module({
  imports: [ChatGatewayModule],
  controllers: [],
  providers: [BotMessageService, PrismaService],
  exports: [BotMessageService],
})
export class BotMessageModule {}
