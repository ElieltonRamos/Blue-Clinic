/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotService } from './bot.service.js';
import { ChatGateway } from '../chat/chat.gateway.js';
import { ChatMessageResponseDto } from '../chat/dto/chat-message-response.dto.js';
import { ConversationResponseDto } from '../chat/dto/conversation-response.dto.js';

@Injectable()
export class WhatssapService {
  private readonly logger = new Logger(WhatssapService.name);
  private readonly INACTIVITY_MS = 4 * 60 * 60 * 1000; // 4h

  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
    private readonly gateway: ChatGateway,
  ) {}

  async sendTemplate(
    to: string,
    templateName: string,
    components: object[],
    accessToken: string,
    phoneNumberId: string,
  ): Promise<string | null> {
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
    to: string,
    message: string,
    accessToken: string,
    phoneNumberId: string,
  ): Promise<string | null> {
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

  async processWebhook(body: any): Promise<void> {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const phoneNumberId = value?.metadata?.phone_number_id as string;

    if (value?.statuses?.length) {
      await this.processStatus(value.statuses[0]);
      return;
    }

    if (!value?.messages?.length) return;

    const msg = value.messages[0];

    let text: string;
    if (msg.type === 'text') {
      text = msg.text.body as string;
    } else if (msg.type === 'button') {
      text = this.mapButtonToText(
        (msg.button?.text ?? msg.button?.payload ?? '') as string,
      );
    } else {
      return;
    }

    const phone = msg.from as string;

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

    let conversation = await this.prisma.client.conversation.findFirst({
      where: { phone, companyId },
      include: { patient: { select: { blocked: true } } },
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
        include: { patient: { select: { blocked: true } } },
      });
    } else {
      if (conversation.patient?.blocked) return;

      const isInactive =
        conversation.lastMessageAt &&
        Date.now() - new Date(conversation.lastMessageAt).getTime() >
          this.INACTIVITY_MS;

      const resetData: Record<string, any> = {
        lastMessage: text,
        lastMessageAt: new Date(),
        unread: { increment: 1 },
      };

      if (isInactive) {
        if (
          conversation.status === 'human' ||
          conversation.status === 'waiting'
        ) {
          resetData['status'] = 'bot';
          this.logger.log(
            `Conversa ${conversation.id} devolvida ao bot por inatividade de 4h (era ${conversation.status})`,
          );
        }
        if (conversation.botStep !== null) {
          resetData['botStep'] = null;
          this.logger.log(
            `botStep da conversa ${conversation.id} resetado por inatividade de 4h`,
          );
        }
      }

      conversation = await this.prisma.client.conversation.update({
        where: { id: conversation.id },
        data: resetData,
        include: { patient: { select: { blocked: true } } },
      });
    }

    const updatedConv = await this.prisma.client.conversation.findUnique({
      where: { id: conversation.id },
      include: { patient: { select: { name: true } } },
    });

    if (updatedConv) {
      this.gateway.emitConversationUpdated(
        companyId,
        new ConversationResponseDto(updatedConv),
      );
    }

    const savedMessage = await this.prisma.client.chatMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'patient',
        text,
        read: false,
      },
    });

    this.gateway.emitNewMessage(
      companyId,
      conversation.id,
      new ChatMessageResponseDto(savedMessage),
    );

    this.logger.log(
      `Mensagem recebida de ${phone} (company ${companyId}): ${text}`,
    );

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

  private mapButtonToText(buttonValue: string): string {
    const normalized = buttonValue.trim().toLowerCase();
    if (normalized === 'confirmar') return '1';
    if (normalized === 'cancelar') return '2';
    return buttonValue;
  }

  private async processStatus(status: any): Promise<void> {
    const wamid = status.id as string;
    const statusType = status.status as string;
    const errorCode = status.errors?.[0]?.code as number | undefined;
    const errorMessage = status.errors?.[0]?.message as string | undefined;

    this.logger.log(
      `Status WhatsApp [${statusType}] wamid=${wamid} error=${errorCode ?? 'none'}`,
    );

    if (statusType === 'failed') {
      this.logger.log(`Buscando mensagem para wamid=${wamid}`);
      const message = await this.prisma.client.chatMessage.findFirst({
        where: { wamid },
        include: {
          conversation: { include: { company: { select: { id: true } } } },
        },
      });
      this.logger.log(`Mensagem encontrada: ${message?.id ?? 'null'}`);

      if (!message) {
        this.logger.warn(`Mensagem não encontrada para wamid=${wamid}`);
        return;
      }

      await this.prisma.client.chatMessage.update({
        where: { id: message.id },
        data: { status: 'failed' },
      });

      const companyId = message.conversation.company.id;

      this.gateway.emitMessageStatusUpdated(companyId, message.conversationId, {
        messageId: message.id,
        status: 'failed',
        errorCode,
        errorMessage: errorCode === 131047 ? undefined : errorMessage,
      });

      if (errorCode === 131047) {
        this.logger.warn(
          `Janela 24h expirada para ${message.conversation.phone} [conversation ${message.conversationId}]`,
        );
      }

      return;
    }

    if (['delivered', 'read', 'sent'].includes(statusType)) {
      const message = await this.prisma.client.chatMessage.findFirst({
        where: { wamid },
        include: {
          conversation: { include: { company: { select: { id: true } } } },
        },
      });

      if (!message) return;

      await this.prisma.client.chatMessage.update({
        where: { id: message.id },
        data: { status: statusType as any },
      });

      const companyId = message.conversation.company.id;

      this.gateway.emitMessageStatusUpdated(companyId, message.conversationId, {
        messageId: message.id,
        status: statusType,
      });
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
        async (msg) => {
          const wamid = await this.sendText(
            phone,
            msg,
            accessToken,
            phoneNumberId,
          );

          const saved = await this.prisma.client.chatMessage.create({
            data: {
              conversationId,
              sender: 'bot',
              text: msg,
              read: true,
              wamid,
              status: 'sent',
            },
          });

          this.gateway.emitNewMessage(
            companyId,
            conversationId,
            new ChatMessageResponseDto(saved),
          );
        },
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

  async sendTemplateToConversation(
    companyId: number,
    conversationId: number,
    templateName: string,
    components: object[],
    resolvedText?: string,
  ): Promise<void> {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { id: conversationId, companyId },
    });

    if (!conversation) throw new Error('Conversa não encontrada');

    const config = await this.prisma.client.whatsappConfig.findFirst({
      where: { companyId },
    });

    if (!config?.accessToken || !config?.phoneNumberId) {
      throw new Error('WhatsApp não configurado');
    }

    let wamid: string | null = null;
    let sendError: string | null = null;

    try {
      wamid = await this.sendTemplate(
        conversation.phone,
        templateName,
        components,
        config.accessToken,
        config.phoneNumberId,
      );
    } catch (err: any) {
      sendError = (err as Error).message ?? 'Erro ao enviar template';
    }

    const saved = await this.prisma.client.chatMessage.create({
      data: {
        conversationId,
        sender: 'human',
        text: resolvedText ?? `[Template: ${templateName}]`,
        read: true,
        wamid: wamid ?? undefined,
        status: sendError ? 'failed' : 'sent',
      },
    });

    this.gateway.emitNewMessage(
      companyId,
      conversationId,
      new ChatMessageResponseDto(saved),
    );

    if (sendError) {
      this.gateway.emitMessageStatusUpdated(companyId, conversationId, {
        messageId: saved.id,
        status: 'failed',
        errorCode: 0,
        errorMessage: sendError,
      });
      throw new Error(sendError);
    }
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
