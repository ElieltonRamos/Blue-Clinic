import { Module } from '@nestjs/common';
import { WhatssapService } from './whatssap.service';
import { WhatssapController } from './whatssap.controller';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotService } from './bot.service';

@Module({
  controllers: [WhatssapController],
  providers: [WhatssapService, PrismaService, BotService],
})
export class WhatssapModule {}
