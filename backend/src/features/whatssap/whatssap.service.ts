/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotService } from './bot.service.js';

@Injectable()
export class WhatssapService {
  private readonly logger = new Logger(WhatssapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
  ) {}

  async sendTemplate(
    to: string,
    templateName: string,
    components: object[],
    accessToken: string,
    phoneNumberId: string,
  ): Promise<void> {
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
        this.logger.error('Erro ao enviar template WhatsApp', error);
      }
    } catch (err) {
      this.logger.error('Falha ao conectar com a API do WhatsApp', err);
    }
  }

  async sendText(
    to: string,
    message: string,
    accessToken: string,
    phoneNumberId: string,
  ): Promise<void> {
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
  }

  async processWebhook(body: any): Promise<void> {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) return;

    const msg = value.messages[0];
    if (msg.type !== 'text') return;

    const phoneNumberId = value.metadata?.phone_number_id as string;
    const phone = msg.from as string;
    const text = msg.text.body as string;

    // Resolve company pelo phoneNumberId
    const config = await this.prisma.client.whatsappConfig.findFirst({
      where: { phoneNumberId },
    });
    if (!config) {
      this.logger.warn(
        `Nenhuma empresa encontrada para phoneNumberId ${phoneNumberId}`,
      );
      return;
    }

    if (!config.phoneNumberId || !config.accessToken) return;

    const { companyId, accessToken, botEnabled } = config;

    // Busca ou cria conversa
    let conversation = await this.prisma.client.conversation.findFirst({
      where: { phone, companyId },
    });

    if (!conversation) {
      const patient = await this.prisma.client.patient.findFirst({
        where: { companyId, phone: { contains: phone.slice(-8) } },
      });

      if (patient?.blocked) return;

      conversation = await this.prisma.client.conversation.create({
        data: {
          companyId,
          phone,
          patientId: patient?.id ?? null,
          status: 'bot',
          lastMessage: text,
          lastMessageAt: new Date(),
          unread: 1,
        },
      });
    } else {
      await this.prisma.client.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: text,
          lastMessageAt: new Date(),
          unread: { increment: 1 },
        },
      });
    }

    // Salva a mensagem
    await this.prisma.client.chatMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'patient',
        text,
        read: false,
      },
    });

    this.logger.log(
      `Mensagem recebida de ${phone} (company ${companyId}): ${text}`,
    );

    // Responde via bot se habilitado
    if (botEnabled && accessToken && conversation.status === 'bot') {
      await this.handleBot(
        conversation.id,
        phone,
        text,
        companyId,
        accessToken,
        config.phoneNumberId,
      );
    }
  }

  private async handleBot(
    conversationId: number,
    phone: string,
    text: string,
    companyId: number,
    accessToken: string,
    phoneNumberId: string,
  ): Promise<void> {
    try {
      await this.botService.handle(
        conversationId,
        companyId,
        phone,
        text,
        (msg) => this.sendText(phone, msg, accessToken, phoneNumberId),
      );
    } catch (err) {
      this.logger.error(
        `Erro ao processar bot [conversation ${conversationId}]: ${(err as Error).message}`,
      );
    }
  }

  async testSend(
    companyId: number,
  ): Promise<{ ok: boolean } | { error: string }> {
    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
      select: { accessToken: true, phoneNumberId: true },
    });
    if (!config?.accessToken || !config?.phoneNumberId) {
      return { error: 'WhatsApp não configurado' };
    }
    await this.sendText(
      '553888663580',
      'Teste 🩺',
      config.accessToken,
      config.phoneNumberId,
    );
    return { ok: true };
  }
}
