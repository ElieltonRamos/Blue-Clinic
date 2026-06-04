/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';
import { MENU_TEXT } from './menu.handler.js';

export async function handleConfirmAppointment(
  text: string,
  data: BotData,
  conversationId: number,
  companyId: number,
  sendFn: SendFn,
  prisma: PrismaService,
  updateConversation: (
    id: number,
    step: BotStep,
    data: BotData,
  ) => Promise<void>,
): Promise<void> {
  if (text !== '1' && text !== '2') {
    await sendFn('Digite *1* para confirmar ou *2* para cancelar.');
    return;
  }

  if (text === '2') {
    await updateConversation(conversationId, 'MENU', {});
    await sendFn(`Agendamento cancelado. Como posso ajudar?\n\n${MENU_TEXT}`);
    return;
  }

  const doctor = await prisma.client.doctor.findUnique({
    where: { id: data.doctorId! },
    select: { specialty: true },
  });

  const [y, m, d] = (data.date ?? '').split('-').map(Number);

  await prisma.client.appointment.create({
    data: {
      doctorId: data.doctorId!,
      patientId: data.patientId!,
      appointmentTypeId: data.appointmentTypeId!,
      specialty: doctor!.specialty,
      date: new Date(Date.UTC(y, m - 1, d)),
      startTime: data.startTime!,
      endTime: data.endTime!,
      status: 'pending',
      origin: 'whatsapp',
    },
  });

  await updateConversation(conversationId, 'MENU', {});
  await sendFn(
    `✅ Agendamento confirmado!\n\nAté lá! Se precisar de mais alguma coisa, é só enviar uma mensagem. 😊`,
  );
}
