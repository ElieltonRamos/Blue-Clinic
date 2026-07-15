// whatssap-core.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ChatService } from '../chat/chat.service.js';
import { BotMessageService } from '../bot-message/bot-message.service.js';
import { WHATSAPP_PROVIDER_REGISTRY } from './whatssap.constants.js';
import { WhatssapProviderRegistry } from './whatssap-provider.registry.js';
import { NormalizedIncomingMessage } from './interfaces/whatsapp-provider.interface.js';

@Injectable()
export class WhatssapCoreService {
  private readonly logger = new Logger(WhatssapCoreService.name);
  private readonly INACTIVITY_MS = 4 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly bot: BotMessageService,
    @Inject(WHATSAPP_PROVIDER_REGISTRY)
    private readonly registry: WhatssapProviderRegistry,
  ) {}

  async handleIncomingMessage(
    companyId: number,
    msg: NormalizedIncomingMessage,
  ): Promise<void> {
    if (msg.fromMe) {
      await this.handleOutgoingSynced(companyId, msg);
      return;
    }

    const patientId = await this.resolvePatientId(companyId, msg.phone);
    const conversation = await this.chat.findOrCreateConversationByPhone(
      companyId,
      msg.phone,
      patientId,
    );

    if ((conversation as any).patient?.blocked) return;

    if (this.isInactive(conversation)) {
      // reset de status/botStep por inatividade já é tratado dentro de
      // chat.saveIncomingMessage; aqui só logamos o caso, se necessário
    }

    await this.chat.saveIncomingMessage(companyId, conversation.id, msg.text);

    this.logger.log(
      `Mensagem recebida de ${msg.phone} (company ${companyId}): ${msg.text}`,
    );

    if (msg.buttonPayload && msg.contextWamid) {
      const originMessage = await this.chat.findMessageByWamid(
        msg.contextWamid,
      );

      if (originMessage) {
        await this.handleTemplateReply(
          companyId,
          conversation.id,
          conversation.patientId,
          msg.phone,
          msg.buttonPayload,
        );
        return;
      }
    }

    if (conversation.status === 'bot') {
      await this.dispatchBot(companyId, conversation.id, msg.phone, msg.text);
    }
  }

  async handleMessageStatus(
    companyId: number,
    wamid: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    errorCode?: number,
    errorMessage?: string,
  ): Promise<void> {
    this.logger.log(
      `Status WhatsApp [${status}] wamid=${wamid} error=${errorCode ?? 'none'}`,
    );

    await this.chat.updateMessageStatusByWamid(
      companyId,
      wamid,
      status,
      errorCode,
      errorMessage,
    );

    if (status === 'failed' && errorCode === 131047) {
      this.logger.warn(`Janela 24h expirada [wamid ${wamid}]`);
    }
  }

  async sendTemplateToConversation(
    companyId: number,
    conversationId: number,
    templateName: string,
    components: object[],
    resolvedText?: string,
  ): Promise<void> {
    const provider = await this.registry.getProvider(companyId);

    let wamid: string | null = null;
    let sendError: string | null = null;

    try {
      wamid = await provider.sendTemplate(
        companyId,
        await this.getPhone(conversationId),
        templateName,
        components,
      );
    } catch (err) {
      sendError = (err as Error).message ?? 'Erro ao enviar template';
    }

    const saved = await this.chat.sendMessage(
      companyId,
      conversationId,
      resolvedText ?? `[Template: ${templateName}]`,
      'Sistema',
      'template',
      wamid,
      sendError ? 'failed' : 'sent',
    );

    if (!sendError && templateName === 'lembrete_consulta') {
      await this.prisma.client.conversation.update({
        where: { id: conversationId },
        data: { botStep: 'AWAITING_REMINDER_REPLY' },
      });
    }

    if (sendError) throw new Error(sendError);
    void saved;
  }

  private async handleOutgoingSynced(
    companyId: number,
    msg: NormalizedIncomingMessage,
  ): Promise<void> {
    const patientId = await this.resolvePatientId(companyId, msg.phone);
    const conversation = await this.chat.findOrCreateConversationByPhone(
      companyId,
      msg.phone,
      patientId,
    );

    await this.chat.sendMessage(
      companyId,
      conversation.id,
      msg.text,
      'Atendente',
      'Celular',
      msg.wamid ?? null,
      'sent',
    );
  }

  private async handleTemplateReply(
    companyId: number,
    conversationId: number,
    patientId: number | null,
    phone: string,
    buttonPayload: string,
  ): Promise<void> {
    const normalized = buttonPayload.trim().toLowerCase();

    if (normalized === 'confirmar') {
      if (!patientId) {
        this.logger.warn(
          `handleTemplateReply: patientId nulo para conversa ${conversationId}`,
        );
        return;
      }

      const appointment = await this.prisma.client.appointment.findFirst({
        where: { patientId, status: 'pending', date: { gte: new Date() } },
        orderBy: { date: 'asc' },
      });

      if (!appointment) {
        await this.dispatchReply(
          companyId,
          conversationId,
          phone,
          'Não encontramos nenhuma consulta pendente de confirmação. 🤔',
        );
        return;
      }

      await this.prisma.client.appointment.update({
        where: { id: appointment.id },
        data: { status: 'confirmed' },
      });

      this.logger.log(
        `Agendamento ${appointment.id} confirmado via WhatsApp (template reply)`,
      );

      await this.dispatchReply(
        companyId,
        conversationId,
        phone,
        'Consulta confirmada com sucesso! ✅ Até logo.',
      );
      return;
    }

    if (normalized === 'cancelar') {
      this.logger.log(
        `handleTemplateReply: paciente escolheu cancelar (conversa ${conversationId}) — encaminhando ao bot`,
      );
      await this.dispatchBot(companyId, conversationId, phone, buttonPayload);
    }
  }

  private async dispatchBot(
    companyId: number,
    conversationId: number,
    phone: string,
    text: string,
  ): Promise<void> {
    try {
      await this.bot.handle(
        conversationId,
        companyId,
        phone,
        text,
        async (reply: string) =>
          this.dispatchReply(companyId, conversationId, phone, reply),
      );
    } catch (err) {
      this.logger.error(
        `Erro ao processar bot [conversation ${conversationId}]: ${(err as Error).message}`,
      );
    }
  }

  private async dispatchReply(
    companyId: number,
    conversationId: number,
    phone: string,
    text: string,
  ): Promise<void> {
    const provider = await this.registry.getProvider(companyId);

    let wamid: string | null = null;
    let status: 'sent' | 'failed' = 'sent';

    try {
      wamid = await provider.sendText(companyId, phone, text);
    } catch (err) {
      status = 'failed';
      this.logger.error(
        `Erro ao enviar resposta [conversation ${conversationId}]: ${(err as Error).message}`,
      );
    }

    await this.chat.sendMessage(
      companyId,
      conversationId,
      text,
      'Bot',
      'automático',
      wamid,
      status,
    );
  }

  private async resolvePatientId(
    companyId: number,
    phone: string,
  ): Promise<number | null> {
    const patient = await this.prisma.client.patient.findFirst({
      where: { companyId, phone: { contains: phone.slice(-8) } },
      select: { id: true },
    });
    return patient?.id ?? null;
  }

  private async getPhone(conversationId: number): Promise<string> {
    const conv = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      select: { phone: true },
    });
    return conv?.phone ?? '';
  }

  private isInactive(conversation: { lastMessageAt: Date | null }): boolean {
    return (
      !!conversation.lastMessageAt &&
      Date.now() - new Date(conversation.lastMessageAt).getTime() >
        this.INACTIVITY_MS
    );
  }
}
