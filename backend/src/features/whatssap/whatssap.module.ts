import { Module } from '@nestjs/common';
import { WhatssapService } from './whatssap.service';
import { WhatssapController } from './whatssap.controller';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotService } from './bot.service';
import { ReminderJob } from './reminder.job';

@Module({
  controllers: [WhatssapController],
  providers: [WhatssapService, PrismaService, BotService, ReminderJob],
})
export class WhatssapModule {}
