// official/whatssap.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { IWhatsappProvider } from '../interfaces/whatsapp-provider.interface.js';

@Injectable()
export class WhatssapOfficialService implements IWhatsappProvider {
  private readonly logger = new Logger(WhatssapOfficialService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getCredentials(
    companyId: number,
  ): Promise<{ accessToken: string; phoneNumberId: string }> {
    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
      select: { accessToken: true, phoneNumberId: true },
    });

    if (!config?.accessToken || !config?.phoneNumberId) {
      throw new Error('WhatsApp não configurado');
    }

    return {
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
    };
  }

  async sendTemplate(
    companyId: number,
    to: string,
    templateName: string,
    components: object[],
  ): Promise<string | null> {
    const { accessToken, phoneNumberId } = await this.getCredentials(companyId);

    try {
      const response = await fetch(
        `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'pt_BR' },
              components,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        const code = error?.error?.code;

        if (code === 132001) {
          this.logger.warn(
            `Template "${templateName}" não existe ou ainda não foi aprovado pela Meta (pt_BR)`,
          );
          throw new Error(
            `Template "${templateName}" não aprovado/inexistente`,
          );
        }

        this.logger.error('Erro ao enviar template WhatsApp', error);
        throw new Error(error?.error?.message ?? 'Erro ao enviar template');
      }

      const body = await response.json();
      return (body?.messages?.[0]?.id as string) ?? null;
    } catch (err) {
      if (err instanceof Error) throw err;
      this.logger.error('Falha ao conectar com a API do WhatsApp', err);
      throw new Error('Falha ao conectar com a API do WhatsApp');
    }
  }

  async sendText(
    companyId: number,
    to: string,
    message: string,
  ): Promise<string | null> {
    const { accessToken, phoneNumberId } = await this.getCredentials(companyId);

    let response: Response;

    try {
      response = await fetch(
        `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message },
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch (err: any) {
      const code = err?.cause?.code ?? err?.code ?? 'UNKNOWN';
      this.logger.error(`Falha de rede ao enviar WhatsApp [${code}]: ${to}`);
      throw new Error(`WhatsApp network error: ${code}`);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error(
        `Erro HTTP ${response.status} ao enviar WhatsApp`,
        error,
      );
      throw new Error(`WhatsApp HTTP error: ${response.status}`);
    }

    const responseBody = await response.json().catch(() => ({}));
    return responseBody?.messages?.[0]?.id ?? null;
  }

  async getTemplates(companyId: number): Promise<any[]> {
    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
      select: { accessToken: true, whatsappBusinessAccountId: true },
    });

    if (!config?.accessToken || !config?.whatsappBusinessAccountId) {
      throw new Error('WhatsApp não configurado');
    }

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${config.whatsappBusinessAccountId}/message_templates?fields=name,status,components&limit=100`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error('Erro ao buscar templates WhatsApp', error);
      throw new Error('Erro ao buscar templates');
    }

    const body = await response.json();
    return body?.data ?? [];
  }
}
