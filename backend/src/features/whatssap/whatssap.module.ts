// whatssap.module.ts
import { Module } from '@nestjs/common';
import { WhatssapOfficialService } from './official/whatssap-official.service.js';
import { WhatssapBaileysProvider } from './baileys/whatssap-baileys.provider.js';
import { WhatssapCoreService } from './whatssap-core.service.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ChatModule } from '../chat/chat.module.js';
import { BotMessageModule } from '../bot-message/bot-message.module.js';
import { WhatssapController } from './whatssap.controller.js';

@Module({
  imports: [ChatModule, BotMessageModule],
  controllers: [WhatssapController],
  providers: [
    PrismaService,
    WhatssapOfficialService,
    WhatssapBaileysProvider,
    WhatssapCoreService,
  ],
  exports: [WhatssapCoreService],
})
export class WhatssapModule {}
