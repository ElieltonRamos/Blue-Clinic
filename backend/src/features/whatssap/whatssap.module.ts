// whatssap.module.ts
import { Module } from '@nestjs/common';
import { WhatssapOfficialService } from './official/whatssap-official.service.js';
import { WhatssapOfficialController } from './official/whatssap-official.controller.js';
import { WhatssapBaileysProvider } from './baileys/whatssap-baileys.provider.js';
import { WhatssapBaileysController } from './baileys/whatssap-baileys.controller.js';
import { WhatssapCoreService } from './whatssap-core.service.js';
import { WhatssapProviderRegistry } from './whatssap-provider.registry.js';
import { WhatssapEventsBridge } from './whatssap-events.bridge.js';
import { WHATSAPP_PROVIDER_REGISTRY } from './whatssap.constants.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ChatModule } from '../chat/chat.module.js';
import { BotMessageModule } from '../bot-message/bot-message.module.js';

@Module({
  imports: [ChatModule, BotMessageModule],
  controllers: [WhatssapOfficialController, WhatssapBaileysController],
  providers: [
    PrismaService,
    WhatssapOfficialService,
    WhatssapBaileysProvider,
    WhatssapCoreService,
    WhatssapEventsBridge,
    WhatssapProviderRegistry,
    {
      provide: WHATSAPP_PROVIDER_REGISTRY,
      useClass: WhatssapProviderRegistry,
    },
  ],
  exports: [WHATSAPP_PROVIDER_REGISTRY, WhatssapCoreService],
})
export class WhatssapModule {}
