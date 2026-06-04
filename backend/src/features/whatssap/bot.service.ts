/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from './entities/bot-state.types.js';
import { handleMenu } from './handlers/menu.handler.js';
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
import { handleSelectDate } from './handlers/date.handler.js';
import { askSlot, handleSelectSlot } from './handlers/slot.handler.js';
import { handleConfirmAppointment } from './handlers/confirm.handler.js';
import {
  showCancelAppointment,
  handleCancelConfirm,
  showNextAppointment,
} from './handlers/cancel.handler.js';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(private readonly prisma: PrismaService) {}

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
          (cId, spec, sf) => askDoctor(cId, spec, sf, p),
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
