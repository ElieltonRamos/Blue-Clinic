import { Module } from '@nestjs/common';
import { BotService } from './bot.service';

@Module({
  controllers: [],
  providers: [BotService],
})
export class BotMessageModule {}
