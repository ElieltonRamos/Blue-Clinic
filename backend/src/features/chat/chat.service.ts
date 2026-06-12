/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ConversationStatus } from '../../../generated/prisma/client.js';
import { ConversationResponseDto } from './dto/conversation-response.dto.js';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto.js';
import { PatientInfoResponseDto } from './dto/patient-info-response.dto.js';
import { WhatssapService } from '../whatssap/whatssap.service.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatssapService,
  ) {}

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
    return new ConversationResponseDto(updated);
  }

  async sendMessage(
    companyId: number,
    conversationId: number,
    text: string,
  ): Promise<ChatMessageResponseDto> {
    const conversation = await this.findConversation(companyId, conversationId);

    const config = await this.prisma.client.whatsappConfig.findUnique({
      where: { companyId },
      select: { accessToken: true, phoneNumberId: true },
    });

    if (config?.accessToken && config?.phoneNumberId) {
      await this.whatsapp.sendText(
        conversation.phone,
        text,
        config.accessToken,
        config.phoneNumberId,
      );
    }

    const message = await this.prisma.client.chatMessage.create({
      data: { conversationId, sender: 'human', text, read: true },
    });

    return new ChatMessageResponseDto(message);
  }

  async blockContact(
    companyId: number,
    conversationId: number,
  ): Promise<PatientInfoResponseDto> {
    const conversation = await this.findConversation(companyId, conversationId);
    if (!conversation.patientId)
      throw new NotFoundException('Paciente não encontrado');

    const patient = await this.prisma.client.patient.update({
      where: { id: conversation.patientId },
      data: { blocked: true },
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
}
