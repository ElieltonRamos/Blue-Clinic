import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';
import { generateSlots, timeToMin } from '../bot-helpers.js';

const DIGIT_EMOJI: Record<string, string> = {
  '0': '0️⃣',
  '1': '1️⃣',
  '2': '2️⃣',
  '3': '3️⃣',
  '4': '4️⃣',
  '5': '5️⃣',
  '6': '6️⃣',
  '7': '7️⃣',
  '8': '8️⃣',
  '9': '9️⃣',
};

const toDigitEmoji = (n: number): string =>
  String(n)
    .split('')
    .map((d) => DIGIT_EMOJI[d])
    .join('');

export async function getAvailableSlots(
  doctorId: number,
  date: string,
  appointmentTypeId: number,
  companyId: number,
  prisma: PrismaService,
): Promise<{ startTime: string; endTime: string }[]> {
  const [y, m, d] = date.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  const dayStart = new Date(Date.UTC(y, m - 1, d));
  const dayEnd = new Date(Date.UTC(y, m - 1, d + 1));

  const [schedule, appointmentType] = await Promise.all([
    prisma.client.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
    }),
    prisma.client.appointmentType.findUnique({
      where: { id: appointmentTypeId },
    }),
  ]);

  if (!schedule || !schedule.active || !appointmentType) return [];

  const allSlots = generateSlots(
    schedule.startTime,
    schedule.endTime,
    appointmentType.duration,
  );

  const [appointments, blockedSlots] = await Promise.all([
    prisma.client.appointment.findMany({
      where: {
        doctorId,
        date: { gte: dayStart, lt: dayEnd },
        status: { not: 'cancelled' },
      },
    }),
    prisma.client.blockedSlot.findMany({
      where: {
        companyId,
        AND: [
          { OR: [{ doctorId }, { doctorId: null }] },
          { startDate: { lte: dayEnd } },
          { OR: [{ endDate: null }, { endDate: { gte: dayStart } }] },
        ],
      },
    }),
  ]);

  const effectiveBlocks = blockedSlots.filter((b) => {
    if (b.recurrence === 'none' || b.recurrence === 'daily') return true;
    if (b.recurrence === 'weekly')
      return new Date(b.startDate).getUTCDay() === dayOfWeek;
    return false;
  });

  return allSlots.filter((slot) => {
    const sStart = timeToMin(slot.startTime);
    const sEnd = timeToMin(slot.endTime);
    const booked = appointments.some(
      (a) => sStart < timeToMin(a.endTime) && sEnd > timeToMin(a.startTime),
    );
    const blocked = effectiveBlocks.some(
      (b) => sStart < timeToMin(b.endTime) && sEnd > timeToMin(b.startTime),
    );
    return !booked && !blocked;
  });
}

export async function askSlot(
  doctorId: number,
  date: string,
  appointmentTypeId: number,
  companyId: number,
  sendFn: SendFn,
  prisma: PrismaService,
): Promise<void> {
  const slots = await getAvailableSlots(
    doctorId,
    date,
    appointmentTypeId,
    companyId,
    prisma,
  );

  if (!slots.length) {
    await sendFn(
      'Nenhum horário disponível para esta data. Informe outra data:',
    );
    return;
  }

  const list = slots
    .map((s, i) => `${toDigitEmoji(i + 1)} ${s.startTime} – ${s.endTime}`)
    .join('\n');

  await sendFn(`Horários disponíveis:\n\n${list}`);
}

export async function handleSelectSlot(
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
  const slots = await getAvailableSlots(
    data.doctorId ?? 0,
    data.date ?? '',
    data.appointmentTypeId ?? 0,
    companyId,
    prisma,
  );

  const idx = parseInt(text) - 1;
  if (isNaN(idx) || idx < 0 || idx >= slots.length) {
    await sendFn('Opção inválida. Digite o número do horário.');
    return askSlot(
      data.doctorId ?? 0,
      data.date ?? '',
      data.appointmentTypeId ?? 0,
      companyId,
      sendFn,
      prisma,
    );
  }

  const slot = slots[idx];
  const [y, m, d] = (data.date ?? '').split('-');
  const dateFormatted = `${d}/${m}/${y}`;

  await updateConversation(conversationId, 'CONFIRM_APPOINTMENT', {
    ...data,
    startTime: slot.startTime,
    endTime: slot.endTime,
  });

  await sendFn(
    `Confirme o agendamento:\n\n` +
      `👨‍⚕️ *Médico:* ${data.doctorName}\n` +
      `📋 *Tipo:* ${data.appointmentTypeName}\n` +
      `📅 *Data:* ${dateFormatted}\n` +
      `🕐 *Horário:* ${slot.startTime} – ${slot.endTime}\n\n` +
      `Digite *1* para confirmar ou *2* para cancelar.`,
  );
}
