// whatssap-events.bridge.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { WhatssapBaileysProvider } from './baileys/whatssap-baileys.provider.js';
import { WhatssapCoreService } from './whatssap-core.service.js';
import { NormalizedIncomingMessage } from './interfaces/whatsapp-provider.interface.js';

@Injectable()
export class WhatssapEventsBridge implements OnModuleInit {
  private readonly logger = new Logger(WhatssapEventsBridge.name);

  constructor(
    private readonly baileysProvider: WhatssapBaileysProvider,
    private readonly core: WhatssapCoreService,
  ) {}

  onModuleInit(): void {
    this.baileysProvider.events.on(
      'message',
      (companyId: number, msg: NormalizedIncomingMessage) => {
        this.core.handleIncomingMessage(companyId, msg).catch((err) => {
          this.logger.error(
            `Erro ao processar mensagem Baileys [company ${companyId}]: ${(err as Error).message}`,
          );
        });
      },
    );

    this.baileysProvider.events.on(
      'status',
      (companyId: number, status: string) => {
        this.logger.log(`Baileys status [company ${companyId}]: ${status}`);
      },
    );
  }
}
