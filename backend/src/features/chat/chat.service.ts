import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ConversationStatus } from '../../../generated/prisma/client.js';
import { ConversationResponseDto } from './dto/conversation-response.dto.js';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto.js';
import { PatientInfoResponseDto } from './dto/patient-info-response.dto.js';
import { WhatssapService } from '../whatssap/whatssap.service.js';
import { ChatGateway } from './chat.gateway.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatssapService,
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
  ): Promise<ChatMessageResponseDto> {
    const conversation = await this.findConversation(companyId, conversationId);

    const formattedText = `${senderRole} - ${senderName}\n\n${text}`;
    await this.trySendWhatsapp(companyId, conversation.phone, formattedText);

    const [message, updatedConv] = await this.prisma.client.$transaction(
      async (tx) => {
        const msg = await tx.chatMessage.create({
          data: {
            conversationId,
            sender: 'human',
            text,
            read: true,
            senderName,
            senderRole,
          },
        });

        const conv = await tx.conversation.update({
          where: { id: conversationId },
          data: { lastMessage: text, lastMessageAt: new Date() },
          include: { patient: { select: { name: true } } },
        });

        return [msg, conv];
      },
    );

    const msgDto = new ChatMessageResponseDto(message);
    this.gateway.emitNewMessage(companyId, conversationId, msgDto);
    this.gateway.emitConversationUpdated(
      companyId,
      new ConversationResponseDto(updatedConv),
    );

    return msgDto;
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

  private async trySendWhatsapp(
    companyId: number,
    phone: string,
    text: string,
  ): Promise<void> {
    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
      select: { accessToken: true, phoneNumberId: true },
    });

    if (config?.accessToken && config?.phoneNumberId) {
      await this.whatsapp.sendText(
        phone,
        text,
        config.accessToken,
        config.phoneNumberId,
      );
    }
  }

  private async findConversation(companyId: number, conversationId: number) {
    const conversation = await this.prisma.client.conversation.findFirst({
      where: { id: conversationId, companyId },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    return conversation;
  }
}
