import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  ConversationStatus,
  MessageStatus,
  Prisma,
} from '../../../generated/prisma/client.js';
import { ConversationResponseDto } from './dto/conversation-response.dto.js';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto.js';
import { PatientInfoResponseDto } from './dto/patient-info-response.dto.js';
import { ChatGateway } from './chat.gateway.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  async markAsRead(companyId: number, conversationId: number): Promise<void> {
    await this.findConversation(companyId, conversationId);

    await this.prisma.client.$transaction([
      this.prisma.client.chatMessage.updateMany({
        where: { conversationId, read: false },
        data: { read: true },
      }),
      this.prisma.client.conversation.update({
        where: { id: conversationId },
        data: { unread: 0 },
      }),
    ]);

    const updated = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
      include: { patient: { select: { name: true } } },
    });

    this.gateway.emitConversationUpdated(
      companyId,
      new ConversationResponseDto(updated!),
    );
  }

  async getConversations(
    companyId: number,
    status?: ConversationStatus,
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.prisma.client.conversation.findMany({
      where: { companyId, ...(status && { status }) },
      include: { patient: { select: { name: true } } },
      orderBy: { lastMessageAt: 'desc' },
    });
    return conversations.map((c) => new ConversationResponseDto(c));
  }

  async getMessages(
    companyId: number,
    conversationId: number,
  ): Promise<ChatMessageResponseDto[]> {
    await this.findConversation(companyId, conversationId);
    const messages = await this.prisma.client.chatMessage.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
    });
    return messages.map((m) => new ChatMessageResponseDto(m));
  }

  async getPatient(
    companyId: number,
    conversationId: number,
  ): Promise<PatientInfoResponseDto> {
    const conversation = await this.findConversation(companyId, conversationId);

    if (!conversation.patientId) {
      return new PatientInfoResponseDto({
        id: null,
        name: null,
        phone: conversation.phone,
        memberSince: null,
        lastVisit: null,
        blocked: false,
      });
    }

    const patient = await this.prisma.client.patient.findUnique({
      where: { id: conversation.patientId },
      select: {
        id: true,
        name: true,
        phone: true,
        memberSince: true,
        blocked: true,
        appointments: {
          where: { status: 'finished' },
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true },
        },
      },
    });

    if (!patient) throw new NotFoundException('Paciente não encontrado');

    return new PatientInfoResponseDto({
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      memberSince: patient.memberSince,
      lastVisit: patient.appointments[0]?.date ?? null,
      blocked: patient.blocked,
    });
  }

  async updateStatus(
    companyId: number,
    conversationId: number,
    status: ConversationStatus,
  ): Promise<ConversationResponseDto> {
    await this.findConversation(companyId, conversationId);
    const updated = await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: { status },
      include: { patient: { select: { name: true } } },
    });
    const dto = new ConversationResponseDto(updated);
    this.gateway.emitConversationUpdated(companyId, dto);
    return dto;
  }

  async sendMessage(
    companyId: number,
    conversationId: number,
    text: string,
    senderName: string,
    senderRole: string,
    wamid?: string | null,
    status: MessageStatus = 'sent',
  ): Promise<ChatMessageResponseDto> {
    const [message, updatedConv] = await this.runTransactionWithRetry((tx) =>
      Promise.all([
        tx.chatMessage.create({
          data: {
            conversationId,
            sender: 'human',
            text,
            read: true,
            senderName,
            senderRole,
            wamid: wamid ?? null,
            status,
          },
        }),
        tx.conversation.update({
          where: { id: conversationId },
          data: { lastMessage: text, lastMessageAt: new Date() },
          include: { patient: { select: { name: true } } },
        }),
      ]),
    );

    const msgDto = new ChatMessageResponseDto(message);
    this.gateway.emitNewMessage(companyId, conversationId, msgDto);
    this.gateway.emitConversationUpdated(
      companyId,
      new ConversationResponseDto(updatedConv),
    );

    return msgDto;
  }

  private async runTransactionWithRetry<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.prisma.client.$transaction(fn);
      } catch (err) {
        const isDeadlock =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2034';

        if (!isDeadlock || attempt === maxRetries) throw err;

        const delay = 100 * attempt; // 100ms, 200ms, 300ms
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('unreachable');
  }

  async toggleBlock(
    companyId: number,
    conversationId: number,
  ): Promise<PatientInfoResponseDto> {
    const conversation = await this.findConversation(companyId, conversationId);
    if (!conversation.patientId)
      throw new NotFoundException('Paciente não encontrado');

    const current = await this.prisma.client.patient.findUnique({
      where: { id: conversation.patientId },
      select: { blocked: true },
    });

    if (!current) throw new NotFoundException('Paciente não encontrado');

    const patient = await this.prisma.client.patient.update({
      where: { id: conversation.patientId },
      data: { blocked: !current.blocked },
      select: {
        id: true,
        name: true,
        phone: true,
        memberSince: true,
        blocked: true,
      },
    });

    return new PatientInfoResponseDto({ ...patient, lastVisit: null });
  }

  private async findConversation(companyId: number, conversationId: number) {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { id: conversationId, companyId },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    return conversation;
  }

  async linkPatient(
    companyId: number,
    conversationId: number,
    patientId: number,
  ): Promise<void> {
    await this.findConversation(companyId, conversationId);

    await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: { patientId },
    });
  }

  async getOrCreateConversationByPatient(
    companyId: number,
    patientId: number,
  ): Promise<ConversationResponseDto> {
    const existing = await this.prisma.client.conversation.findFirst({
      where: { companyId, patientId },
      include: { patient: { select: { name: true } } },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (existing) return new ConversationResponseDto(existing);

    const patient = await this.prisma.client.patient.findFirst({
      where: { id: patientId, companyId },
      select: { phone: true },
    });

    if (!patient) throw new NotFoundException('Paciente não encontrado');
    if (!patient.phone)
      throw new NotFoundException('Paciente não possui telefone cadastrado');

    const created = await this.prisma.client.conversation.create({
      data: {
        companyId,
        patientId,
        phone: patient.phone,
        status: 'bot',
      },
      include: { patient: { select: { name: true } } },
    });

    return new ConversationResponseDto(created);
  }

  // chat.service.ts — MÉTODOS A ADICIONAR

  async findOrCreateConversationByPhone(
    companyId: number,
    phone: string,
    patientId: number | null,
  ): Promise<{
    id: number;
    status: ConversationStatus;
    botStep: string | null;
    phone: string;
    patientId: number | null;
  }> {
    return this.runTransactionWithRetry(async (tx) => {
      const existing = await tx.conversation.findFirst({
        where: { phone, companyId },
        include: { patient: { select: { blocked: true } } },
      });

      if (existing) return existing;

      return tx.conversation.create({
        data: {
          companyId,
          phone,
          patientId,
          status: 'bot',
          lastMessageAt: new Date(),
          unread: 1,
        },
        include: { patient: { select: { blocked: true } } },
      });
    });
  }

  async saveIncomingMessage(
    companyId: number,
    conversationId: number,
    text: string,
  ): Promise<ChatMessageResponseDto> {
    const conversation =
      await this.prisma.client.conversation.findUniqueOrThrow({
        where: { id: conversationId },
      });

    const isInactive =
      conversation.lastMessageAt &&
      Date.now() - new Date(conversation.lastMessageAt).getTime() >
        4 * 60 * 60 * 1000;

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
        resetData.status = 'bot';
      }
      if (conversation.botStep !== null) {
        resetData.botStep = null;
      }
    }

    const savedMessage = await this.prisma.client.chatMessage.create({
      data: { conversationId, sender: 'patient', text, read: false },
    });

    const msgDto = new ChatMessageResponseDto(savedMessage);
    this.gateway.emitNewMessage(companyId, conversationId, msgDto);

    const updatedConv = await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: resetData,
      include: { patient: { select: { name: true } } },
    });

    this.gateway.emitConversationUpdated(
      companyId,
      new ConversationResponseDto(updatedConv),
    );

    return msgDto;
  }

  async updateMessageStatusByWamid(
    companyId: number,
    wamid: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    errorCode?: number,
    errorMessage?: string,
  ): Promise<void> {
    const message = await this.prisma.client.chatMessage.findFirst({
      where: { wamid },
    });
    if (!message) return;

    await this.prisma.client.chatMessage.update({
      where: { id: message.id },
      data: { status },
    });

    this.gateway.emitMessageStatusUpdated(companyId, message.conversationId, {
      messageId: message.id,
      status,
      errorCode,
      errorMessage: errorCode === 131047 ? undefined : errorMessage,
    });
  }

  async findMessageByWamid(wamid: string) {
    return this.prisma.client.chatMessage.findFirst({ where: { wamid } });
  }
}
