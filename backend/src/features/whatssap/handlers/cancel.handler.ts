/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';
import { MENU_TEXT } from './menu.handler.js';

async function getNextAppointment(patientId: number, prisma: PrismaService) {
  return prisma.client.appointment.findFirst({
    where: {
      patientId,
      date: { gte: new Date() },
      status: { notIn: ['cancelled', 'rescheduled'] },
    },
    include: { doctor: { select: { name: true } } },
    orderBy: { date: 'asc' },
  });
}

function formatAppointmentDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

async function findPatient(
  phone: string,
  companyId: number,
  prisma: PrismaService,
) {
  return prisma.client.patient.findFirst({
    where: { companyId, phone: { contains: phone.slice(-8) } },
  });
}

export async function showCancelAppointment(
  conversationId: number,
  companyId: number,
  phone: string,
  sendFn: SendFn,
  prisma: PrismaService,
  updateConversation: (
    id: number,
    step: BotStep,
    data: BotData,
  ) => Promise<void>,
): Promise<void> {
  const patient = await findPatient(phone, companyId, prisma);

  if (!patient) {
    await sendFn('Não encontrei nenhum cadastro com este número.');
    await updateConversation(conversationId, 'MENU', {});
    return;
  }

  const appointment = await getNextAppointment(patient.id, prisma);

  if (!appointment) {
    await sendFn('Você não possui consultas agendadas.');
    await updateConversation(conversationId, 'MENU', {});
    return;
  }

  await updateConversation(conversationId, 'CANCEL_CONFIRM', {
    cancelAppointmentId: appointment.id,
  });

  await sendFn(
    `Sua próxima consulta:\n\n` +
      `👨‍⚕️ *Médico:* ${appointment.doctor.name}\n` +
      `📅 *Data:* ${formatAppointmentDate(new Date(appointment.date))}\n` +
      `🕐 *Horário:* ${appointment.startTime}\n\n` +
      `Deseja cancelar? Digite *1* para confirmar ou *2* para voltar.`,
  );
}

export async function handleCancelConfirm(
  text: string,
  data: BotData,
  conversationId: number,
  sendFn: SendFn,
  prisma: PrismaService,
  updateConversation: (
    id: number,
    step: BotStep,
    data: BotData,
  ) => Promise<void>,
): Promise<void> {
  if (text !== '1' && text !== '2') {
    await sendFn(
      'Digite *1* para confirmar o cancelamento ou *2* para voltar.',
    );
    return;
  }

  if (text === '2') {
    await updateConversation(conversationId, 'MENU', {});
    await sendFn(`Ok! Como posso ajudar?\n\n${MENU_TEXT}`);
    return;
  }

  await prisma.client.appointment.update({
    where: { id: data.cancelAppointmentId! },
    data: {
      status: 'cancelled',
      cancellationReason: 'Cancelado pelo paciente via WhatsApp',
    },
  });

  await updateConversation(conversationId, 'MENU', {});
  await sendFn(
    'Consulta cancelada com sucesso. ✅\n\nSe precisar remarcar, é só falar comigo! 😊',
  );
}

export async function showNextAppointment(
  conversationId: number,
  companyId: number,
  phone: string,
  sendFn: SendFn,
  prisma: PrismaService,
  updateConversation: (
    id: number,
    step: BotStep,
    data: BotData,
  ) => Promise<void>,
): Promise<void> {
  const patient = await findPatient(phone, companyId, prisma);

  if (!patient) {
    await sendFn('Não encontrei nenhum cadastro com este número.');
    await updateConversation(conversationId, 'MENU', {});
    return;
  }

  const appointment = await getNextAppointment(patient.id, prisma);

  if (!appointment) {
    await sendFn('Você não possui consultas agendadas.');
    await updateConversation(conversationId, 'MENU', {});
    return;
  }

  await updateConversation(conversationId, 'MENU', {});
  await sendFn(
    `Sua próxima consulta:\n\n` +
      `👨‍⚕️ *Médico:* ${appointment.doctor.name}\n` +
      `📅 *Data:* ${formatAppointmentDate(new Date(appointment.date))}\n` +
      `🕐 *Horário:* ${appointment.startTime}\n\n` +
      `Se precisar de mais alguma coisa, é só falar! 😊`,
  );
}
