import { Module } from '@nestjs/common';
import { WhatssapService } from './whatssap.service';
import { WhatssapController } from './whatssap.controller';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotService } from './bot.service';
import { ReminderJob } from './reminder.job';
import { ChatGatewayModule } from '../chat/chat-gateway.module';
import { DoctorReminderJob } from './doctor-reminder.job';

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
