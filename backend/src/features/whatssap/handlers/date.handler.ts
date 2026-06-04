/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';

export async function handleSelectDate(
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
  askSlot: (
    doctorId: number,
    date: string,
    appointmentTypeId: number,
    companyId: number,
    sendFn: SendFn,
  ) => Promise<void>,
): Promise<void> {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    await sendFn('Formato inválido. Use *DD/MM/AAAA*. Ex: 15/07/2026');
    return;
  }

  const [, d, m, y] = match;
  const date = new Date(+y, +m - 1, +d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    await sendFn('Data inválida. Informe uma data futura.');
    return;
  }

  const dateStr = `${y}-${m}-${d}`;
  const dayOfWeek = date.getDay();

  const schedule = await prisma.client.doctorSchedule.findUnique({
    where: { doctorId_dayOfWeek: { doctorId: data.doctorId!, dayOfWeek } },
  });

  if (!schedule || !schedule.active) {
    const days = [
      'domingo',
      'segunda',
      'terça',
      'quarta',
      'quinta',
      'sexta',
      'sábado',
    ];
    await sendFn(
      `O médico não atende na ${days[dayOfWeek]}. Por favor, informe outra data.`,
    );
    return;
  }

  await updateConversation(conversationId, 'SELECT_SLOT', {
    ...data,
    date: dateStr,
  });
  return askSlot(
    data.doctorId ?? 0,
    dateStr,
    data.appointmentTypeId ?? 0,
    companyId,
    sendFn,
  );
}
