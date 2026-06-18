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
  const commission = await prisma.client.appointmentTypeCommission.findUnique({
    where: {
      doctorId_appointmentTypeId: {
        doctorId: data.doctorId!,
        appointmentTypeId: data.appointmentTypeId!,
      },
    },
    select: { price: true },
  });

  const priceLabel = commission
    ? `\n💰 *Valor:* R$ ${Number(commission.price).toFixed(2).replace('.', ',')}`
    : '';

  const [y, m, d] = (data.date ?? '').split('-');
  const dateFormatted = `${d}/${m}/${y}`;

  if (text !== '1' && text !== '2') {
    await sendFn(
      `📋 *Resumo do agendamento:*\n\n` +
        `👨‍⚕️ *Médico:* ${data.doctorName}\n` +
        `📋 *Tipo:* ${data.appointmentTypeName}\n` +
        `📅 *Data:* ${dateFormatted}\n` +
        `🕐 *Horário:* ${data.startTime} – ${data.endTime}${priceLabel}\n\n` +
        `Digite *1* para confirmar ou *2* para cancelar.`,
    );
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

  const [yr, mo, dy] = (data.date ?? '').split('-').map(Number);

  await prisma.client.appointment.create({
    data: {
      doctorId: data.doctorId!,
      patientId: data.patientId!,
      appointmentTypeId: data.appointmentTypeId!,
      specialty: doctor!.specialty,
      date: new Date(Date.UTC(yr, mo - 1, dy)),
      startTime: data.startTime!,
      endTime: data.endTime!,
      status: 'pending',
      origin: 'whatsapp',
    },
  });

  await updateConversation(conversationId, 'MENU', {});
  await sendFn(
    `✅ *Agendamento confirmado!*\n\n` +
      `👨‍⚕️ *Médico:* ${data.doctorName}\n` +
      `📋 *Tipo:* ${data.appointmentTypeName}\n` +
      `📅 *Data:* ${dateFormatted}\n` +
      `🕐 *Horário:* ${data.startTime} – ${data.endTime}${priceLabel}\n\n` +
      `Até lá! Se precisar de mais alguma coisa, é só enviar uma mensagem. 😊`,
  );
}
