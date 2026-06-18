/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from './entities/bot-state.types.js';
import { handleMenu, MENU_TEXT } from './handlers/menu.handler.js';
import {
  handleRegisterName,
  handleRegisterCpf,
} from './handlers/register.handler.js';
import {
  askSpecialty,
  handleSelectSpecialty,
} from './handlers/specialty.handler.js';
import {
  askAppointmentType,
  handleSelectAppointmentType,
} from './handlers/appointment-type.handler.js';
import { askDoctor, handleSelectDoctor } from './handlers/doctor.handler.js';
import { askDate, handleSelectDate } from './handlers/date.handler.js';
import { askSlot, handleSelectSlot } from './handlers/slot.handler.js';
import { handleConfirmAppointment } from './handlers/confirm.handler.js';
import {
  showCancelAppointment,
  handleCancelConfirm,
  showNextAppointment,
} from './handlers/cancel.handler.js';
import { ChatGateway } from '../chat/chat.gateway.js';
import { ConversationResponseDto } from '../chat/dto/conversation-response.dto.js';

const PREVIOUS_STEP: Partial<Record<BotStep, BotStep>> = {
  SELECT_APPOINTMENT_TYPE: 'SELECT_SPECIALTY',
  SELECT_DOCTOR: 'SELECT_APPOINTMENT_TYPE',
  SELECT_DATE: 'SELECT_DOCTOR',
  SELECT_SLOT: 'SELECT_DATE',
};

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  async handle(
    conversationId: number,
    companyId: number,
    phone: string,
    text: string,
    sendFn: SendFn,
  ): Promise<void> {
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return;

    const step = (conversation.botStep ?? 'MENU') as BotStep;
    const data = (conversation.botData ?? {}) as BotData;
    const normalized = text.trim().toLowerCase();

    // Interceptação global — exceto quando já está no MENU/IDLE
    if (step !== 'MENU' && step !== 'IDLE') {
      if (['menu', 'inicio', 'início', 'cancelar'].includes(normalized)) {
        await this.updateConversation(conversationId, 'MENU', { phone });
        await sendFn(`Voltando ao menu principal...\n\n${MENU_TEXT}`);
        return;
      }

      if (normalized === 'voltar') {
        const previousStep = PREVIOUS_STEP[step];
        if (!previousStep) {
          await this.updateConversation(conversationId, 'MENU', { phone });
          await sendFn(`Voltando ao menu principal...\n\n${MENU_TEXT}`);
          return;
        }
        await this.goToStep(
          previousStep,
          data,
          conversationId,
          companyId,
          sendFn,
        );
        return;
      }

      if (
        [
          'atendente',
          'humano',
          'ajuda',
          'help',
          'falar com alguem',
          'falar com alguém',
        ].includes(normalized)
      ) {
        const updated = await this.prisma.client.conversation.update({
          where: { id: conversationId },
          data: { status: 'waiting', botStep: 'IDLE', botData: {} },
          include: { patient: { select: { name: true } } },
        });

        this.gateway.emitConversationUpdated(
          companyId,
          new ConversationResponseDto(updated),
        );

        await sendFn('Aguarde, em breve um atendente irá te responder. 😊');
        return;
      }
    }

    await this.dispatch(
      step,
      data,
      text.trim(),
      conversationId,
      companyId,
      phone,
      sendFn,
    );
  }

  private async goToStep(
    targetStep: BotStep,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: SendFn,
  ): Promise<void> {
    switch (targetStep) {
      case 'SELECT_SPECIALTY':
        await this.updateConversation(conversationId, 'SELECT_SPECIALTY', data);
        return askSpecialty(companyId, sendFn, this.prisma);
      case 'SELECT_APPOINTMENT_TYPE':
        await this.updateConversation(
          conversationId,
          'SELECT_APPOINTMENT_TYPE',
          data,
        );
        return askAppointmentType(companyId, sendFn, this.prisma);
      case 'SELECT_DOCTOR':
        await this.updateConversation(conversationId, 'SELECT_DOCTOR', data);
        return askDoctor(
          companyId,
          data.specialty ?? '',
          sendFn,
          this.prisma,
          data.appointmentTypeId,
        );
      case 'SELECT_DATE':
        await this.updateConversation(conversationId, 'SELECT_DATE', data);
        return askDate(
          data,
          conversationId,
          companyId,
          sendFn,
          this.prisma,
          this.updateConversation.bind(this),
        );
      default:
        return;
    }
  }

  private async dispatch(
    step: BotStep,
    data: BotData,
    text: string,
    conversationId: number,
    companyId: number,
    phone: string,
    sendFn: SendFn,
  ): Promise<void> {
    const update = this.updateConversation.bind(this);
    const p = this.prisma;

    switch (step) {
      case 'MENU':
      case 'IDLE':
        return handleMenu(
          text,
          data,
          conversationId,
          companyId,
          phone,
          sendFn,
          p,
          update,
          (cId, sf) => askSpecialty(cId, sf, p),
          (cId, cmpId, ph, sf) =>
            showNextAppointment(cId, cmpId, ph, sf, p, update),
          (cId, cmpId, ph, sf) =>
            showCancelAppointment(cId, cmpId, ph, sf, p, update),
          this.gateway,
        );
      case 'REGISTER_NAME':
        return handleRegisterName(text, data, conversationId, sendFn, update);
      case 'REGISTER_CPF':
        return handleRegisterCpf(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
          p,
          update,
          (cId, sf) => askSpecialty(cId, sf, p),
        );
      case 'SELECT_SPECIALTY':
        return handleSelectSpecialty(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
          p,
          update,
          (cId, sf) => askAppointmentType(cId, sf, p),
        );
      case 'SELECT_APPOINTMENT_TYPE':
        return handleSelectAppointmentType(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
          p,
          update,
          (cId, spec, sf, appointmentTypeId) =>
            askDoctor(cId, spec, sf, p, appointmentTypeId),
        );
      case 'SELECT_DOCTOR':
        return handleSelectDoctor(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
          p,
          update,
          (d, cId, cmpId, sf) => askDate(d, cId, cmpId, sf, p, update),
        );
      case 'SELECT_DATE':
        return handleSelectDate(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
          p,
          update,
          (dId, date, typeId, cmpId, sf) =>
            askSlot(dId, date, typeId, cmpId, sf, p),
        );
      case 'SELECT_SLOT':
        return handleSelectSlot(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
          p,
          update,
        );
      case 'CONFIRM_APPOINTMENT':
        return handleConfirmAppointment(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
          p,
          update,
        );
      case 'CANCEL_CONFIRM':
        return handleCancelConfirm(
          text,
          data,
          conversationId,
          sendFn,
          p,
          update,
        );
    }
  }

  private async updateConversation(
    conversationId: number,
    step: BotStep,
    data: BotData,
  ): Promise<void> {
    await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: { botStep: step, botData: data as Record<string, any> },
    });
  }
}
