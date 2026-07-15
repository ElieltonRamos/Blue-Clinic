import { Module } from '@nestjs/common';
import { WhatssapService } from './official/whatssap.service';
import { WhatssapController } from './official/whatssap.controller';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotService } from '../bot-message/bot.service';
import { ReminderJob } from '../bot-message/reminder.job';
import { ChatGatewayModule } from '../chat/chat-gateway.module';
import { DoctorReminderJob } from '../bot-message/doctor-reminder.job';

@Module({
  imports: [ChatGatewayModule],
  controllers: [WhatssapController],
  providers: [
    WhatssapService,
    PrismaService,
    BotService,
    ReminderJob,
    DoctorReminderJob,
  ],
  exports: [WhatssapService],
})
export class WhatssapModule {}
