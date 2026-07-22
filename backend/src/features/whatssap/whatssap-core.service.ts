// whatssap-core.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ChatService } from '../chat/chat.service.js';
import { BotMessageService } from '../bot-message/bot-message.service.js';
import { WhatssapOfficialService } from './official/whatssap-official.service.js';
import { WhatssapBaileysProvider } from './baileys/whatssap-baileys.provider.js';
import {
  IWhatsappProvider,
  NormalizedIncomingMessage,
} from './interfaces/whatsapp-provider.interface.js';

@Injectable()
export class WhatssapCoreService implements OnModuleInit {
  private readonly logger = new Logger(WhatssapCoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly bot: BotMessageService,
    private readonly officialProvider: WhatssapOfficialService,
    private readonly baileysProvider: WhatssapBaileysProvider,
  ) {}

  async onModuleInit() {
    this.baileysProvider.events.on(
      'message',
      (companyId: number, msg: NormalizedIncomingMessage) => {
        this.handleIncomingMessage(companyId, msg).catch((err) => {
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

    this.baileysProvider.events.on(
      'message-status',
      (
        companyId: number,
        wamid: string,
        status: 'sent' | 'delivered' | 'read' | 'failed',
      ) => {
        this.handleMessageStatus(companyId, wamid, status).catch((err) => {
          this.logger.error(
            `Erro ao processar status Baileys [company ${companyId}]: ${(err as Error).message}`,
          );
        });
      },
    );

    await this.reconnectBaileysCompanies();
  }

  private async reconnectBaileysCompanies(): Promise<void> {
    const configs = await this.prisma.client.whatsappConfig.findMany({
      where: { provider: 'baileys' },
      select: { companyId: true },
    });

    for (const { companyId } of configs) {
      this.baileysProvider.connect(companyId).catch((err) => {
        this.logger.error(
          `Falha ao reconectar Baileys no boot [company ${companyId}]: ${(err as Error).message}`,
        );
      });
    }
  }

  // ---------------------------------------------------------------------
  // Registry (ex WhatssapProviderRegistry)
  // ---------------------------------------------------------------------

  private async getProviderConfig(
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

  private async getProvider(companyId: number): Promise<IWhatsappProvider> {
    return (await this.getProviderConfig(companyId)).provider;
  }

  async getTemplates(companyId: number): Promise<unknown> {
    const provider = await this.getProvider(companyId);
    if (!provider.getTemplates) {
      throw new Error('Provider atual não suporta templates');
    }
    return provider.getTemplates(companyId);
  }

  /**
   * Envia texto de teste direto pro provider, sem criar/tocar em
   * Conversation ou ChatMessage. Uso: smoke test de configuração.
   */
  async sendTestMessage(
    companyId: number,
    phone: string,
    text: string,
  ): Promise<{ wamid: string | null }> {
    const provider = await this.getProvider(companyId);
    const wamid = await provider.sendText(companyId, phone, text);
    return { wamid };
  }

  /**
   * Envia template direto pra um telefone, sem conversation/chat associado
   * (ex: lembrete de agenda pro médico). Não persiste em ChatMessage.
   */
  async sendTemplateDirect(
    companyId: number,
    phone: string,
    templateName: string,
    components: object[],
  ): Promise<{ wamid: string | null }> {
    const provider = await this.getProvider(companyId);
    const wamid = await provider.sendTemplate(
      companyId,
      phone,
      templateName,
      components,
    );
    return { wamid };
  }

  // ---------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------

  async handleIncomingMessage(
    companyId: number,
    msg: NormalizedIncomingMessage,
  ): Promise<void> {
    if (msg.fromMe) {
      await this.handleOutgoingSynced(companyId, msg);
      return;
    }

    const patient = await this.findPatientByPhone(companyId, msg.phone);
    if (patient?.blocked) return; // bloqueia antes de criar qualquer registro

    const conversation = await this.chat.findOrCreateConversationByPhone(
      companyId,
      msg.phone,
      patient?.id ?? null,
    );

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
    const { botEnabled } = await this.getProviderConfig(companyId);
    if (conversation.status === 'bot' && botEnabled) {
      await this.dispatchBot(companyId, conversation.id, msg.phone, msg.text);
    }
  }

  private async findPatientByPhone(
    companyId: number,
    phone: string,
  ): Promise<{ id: number; blocked: boolean } | null> {
    return this.prisma.client.patient.findFirst({
      where: { companyId, phone: { contains: phone.slice(-8) } },
      select: { id: true, blocked: true },
    });
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
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { id: conversationId, companyId },
      select: { phone: true },
    });
    if (!conversation) throw new Error('Conversa não encontrada');

    const provider = await this.getProvider(companyId);

    let wamid: string | null = null;
    let sendError: string | null = null;

    try {
      wamid = await provider.sendTemplate(
        companyId,
        conversation.phone,
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

  /**
   * Envia mensagem de texto do atendente para o paciente (via WhatsApp)
   * e persiste/emite através do ChatService.
   */
  async sendManualMessage(
    companyId: number,
    conversationId: number,
    text: string,
    senderName: string,
    senderRole: string,
  ): Promise<ReturnType<ChatService['sendMessage']>> {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { id: conversationId, companyId },
      select: { phone: true },
    });
    if (!conversation) throw new Error('Conversa não encontrada');

    return this.sendAndPersist(
      companyId,
      conversationId,
      conversation.phone,
      text,
      senderName,
      senderRole,
    );
  }

  /**
   * Envia texto via provider e persiste/emite através do ChatService.
   * Usado por qualquer fluxo de envio de texto associado a uma conversa
   * (atendente manual, bot/automático).
   */
  private async sendAndPersist(
    companyId: number,
    conversationId: number,
    phone: string,
    text: string,
    senderName: string,
    senderRole: string,
  ): Promise<ReturnType<ChatService['sendMessage']>> {
    const provider = await this.getProvider(companyId);

    let wamid: string | null = null;
    let status: 'sent' | 'failed' = 'sent';

    try {
      wamid = await provider.sendText(companyId, phone, text);
    } catch (err) {
      status = 'failed';
      this.logger.error(
        `Erro ao enviar mensagem [conversation ${conversationId}]: ${(err as Error).message}`,
      );
    }

    return this.chat.sendMessage(
      companyId,
      conversationId,
      text,
      senderName,
      senderRole,
      wamid,
      status,
    );
  }

  private async handleOutgoingSynced(
    companyId: number,
    msg: NormalizedIncomingMessage,
  ): Promise<void> {
    const patient = await this.findPatientByPhone(companyId, msg.phone);
    const conversation = await this.chat.findOrCreateConversationByPhone(
      companyId,
      msg.phone,
      patient?.id ?? null,
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
    await this.sendAndPersist(
      companyId,
      conversationId,
      phone,
      text,
      'Bot',
      'automático',
    );
  }

  async disconnectBaileys(companyId: number): Promise<void> {
    await this.baileysProvider.disconnect(companyId);
  }
}
