// whatssap-provider.registry.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { WhatssapOfficialService } from './official/whatssap-official.service.js';
import { WhatssapBaileysProvider } from './baileys/whatssap-baileys.provider.js';
import { IWhatsappProvider } from './interfaces/whatsapp-provider.interface.js';

@Injectable()
export class WhatssapProviderRegistry {
  constructor(
    private readonly prisma: PrismaService,
    private readonly officialProvider: WhatssapOfficialService,
    private readonly baileysProvider: WhatssapBaileysProvider,
  ) {}

  async getConfig(
    companyId: number,
  ): Promise<{ provider: IWhatsappProvider; botEnabled: boolean }> {
    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
      select: { provider: true, botEnabled: true },
    });

    if (!config) {
      throw new Error(`WhatsApp não configurado para company ${companyId}`);
    }

    return {
      provider:
        config.provider === 'baileys'
          ? this.baileysProvider
          : this.officialProvider,
      botEnabled: config.botEnabled ?? false,
    };
  }

  async getProvider(companyId: number): Promise<IWhatsappProvider> {
    return (await this.getConfig(companyId)).provider;
  }
}
